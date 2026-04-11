// Load .env file if it exists (optional in production)
try {
  require('dotenv').config();
} catch (err) {
  // dotenv not installed, use existing environment variables
}

const http = require('http');
const crypto = require('crypto');

const META_PIXEL_ID = process.env.META_PIXEL_ID;
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const MAX_PAYLOAD_SIZE = 1024 * 100; // 100KB limit

if (!META_PIXEL_ID || !META_ACCESS_TOKEN) {
  console.error('Missing Meta credentials');
  process.exit(1);
}

const META_URL = `https://graph.facebook.com/v18.0/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;

function hash(value) {
  if (!value) return undefined;
  return crypto.createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
}

function clean(value) {
  if (!value) return '';
  if (typeof value !== 'string') return value;
  if (value.includes('${')) return '';
  return value.trim();
}

function splitName(name) {
  name = clean(name);
  if (!name) return {};
  const parts = name.split(' ');
  return {
    fn: parts[0],
    ln: parts.slice(1).join(' ')
  };
}

function formatDOB(dob) {
  dob = clean(dob);
  if (!dob) return '';
  const d = new Date(dob);
  if (isNaN(d)) return '';
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

async function sendToMeta(payload, retries = 2) {
  try {
    const res = await fetch(META_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseData = await res.json();

    if (!res.ok) {
      if (retries > 0 && res.status >= 500) {
        console.warn(`Meta API returned ${res.status}, retrying... (${retries} left)`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
        return sendToMeta(payload, retries - 1);
      }
      // Don't retry on client errors
      throw new Error(`Meta API error: ${res.status} - ${JSON.stringify(responseData)}`);
    }

    return responseData;

  } catch (err) {
    if (retries > 0) {
      console.warn(`Network error, retrying... (${retries} left):`, err.message);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return sendToMeta(payload, retries - 1);
    }
    throw err;
  }
}

const server = http.createServer((req, res) => {

  if (req.method === 'POST' && req.url === '/webhook') {

    let body = '';
    let payloadSize = 0;

    req.on('data', chunk => {
      payloadSize += chunk.length;
      
      if (payloadSize > MAX_PAYLOAD_SIZE) {
        req.pause();
        res.writeHead(413, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Payload too large' }));
        return;
      }
      
      body += chunk.toString();
    });

    req.on('end', async () => {
      try {
        const data = JSON.parse(body);

        // Validate required fields
        const email = clean(data.Email);
        const phone = clean(data.Mobile);
        const value = parseFloat(data.Amount) || 0;

        let content_id = data.content_ids;
        if (Array.isArray(content_id)) {
          content_id = content_id[0];
        }

        // Require at least email or phone
        if (!email && !phone) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Email or phone is required' }));
        }

        // Require content_id and value
        if (!content_id || !value) {
          res.writeHead(422, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: 'Missing content_id or value' }));
        }

        // Safely parse optional fields
        const name = clean(data.name || '');
        const dob = clean(data.dob || '');
        
        const { fn, ln } = name ? splitName(name) : { fn: undefined, ln: undefined };
        const formattedDob = dob ? formatDOB(dob) : '';

        let matchScore = 0;
        if (email) matchScore++;
        if (phone) matchScore++;
        if (data.fbc) matchScore++;
        if (data.fbp) matchScore++;
        if (data.external_id) matchScore++;

        if (!data.external_id) {
          console.warn("Missing external_id - deduplication weakened");
        }

        const eventId = data.external_id || `evt_${Date.now()}_${Math.random()}`;

        if (matchScore < 2) {
          console.warn("Low match quality", {
            event_id: eventId,
            matchScore
          });
        }

        const event = {
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              action_source: "system_generated",

              event_id: eventId,

              user_data: {
                em: hash(email),
                ph: hash(phone),

                fn: fn ? hash(fn) : undefined,
                ln: ln ? hash(ln) : undefined,
                db: formattedDob ? hash(formattedDob) : undefined,

                fbc: data.fbc || undefined,
                fbp: data.fbp || undefined,

                client_ip_address: data.ip || undefined,
                client_user_agent: data.user_agent || undefined,

                external_id: data.external_id ? hash(data.external_id) : undefined,

                ct: data.city ? hash(data.city.toLowerCase()) : undefined,
                st: data.state ? hash(data.state.toLowerCase()) : undefined,
                zp: data.zip ? hash(data.zip) : undefined,
                country: data.country ? hash(data.country.toLowerCase()) : undefined
              },

              custom_data: {
                value: value,
                currency: "INR",
                content_ids: [content_id]
              }
            }
          ]
        };

        const result = await sendToMeta(event);

        console.log({
          status: "success",
          event_id: eventId,
          matchScore,
          meta_response: result
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', matchScore }));

      } catch (err) {
        console.error('Meta API failed', {
          event_id: eventId || null,
          content_id: content_id || null,
          error: err.message
        });
        
        // Distinguish between invalid JSON and other errors
        if (err instanceof SyntaxError) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid JSON' }));
        } else {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      }
    });

  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});