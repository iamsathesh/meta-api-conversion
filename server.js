const http = require('http');
const crypto = require('crypto');

function hash(value) {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const phone = data.Mobile || '';
        const email = data.Email || '';
        const value = data.Amount || 0;
        const content_id = data.content_ids ? data.content_ids[0] : '';

        if (!phone || !email || !content_id) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing required fields');
          return;
        }

        const event = {
          data: [
            {
              event_name: "Purchase",
              event_time: Math.floor(Date.now() / 1000),
              user_data: {
                ph: hash(phone),
                em: hash(email)
              },
              custom_data: {
                value: value,
                currency: "INR",
                content_ids: [content_id]
              }
            }
          ],
          test_event_code: "TEST84345"
        };

        fetch('https://graph.facebook.com/v18.0/3925754201017337/events?access_token=EAARmbpBh4TQBROjJG1ADdj969npDGawMxJIax3wAiEYpwvBPbG5ZCziBZCqb2xNOJllaIgVttgNwwG890GHxoAtXJil2tbTyf441nkv1DrMCRayB8bifVvos2ppMM5uZANeUSxMLF2tsRGaiOBdXTSBF0cZAROGhSFyPiRpU4WUlp6kTNLWh28crdGrx9YZCdwwZDZD', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(event)
        })
        .then(response => response.json())
        .then(data => {
          console.log('Meta API response:', data);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Event sent');
        })
        .catch(error => {
          console.error('Error sending to Meta:', error);
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error');
        });
      } catch (e) {
        console.error('Invalid JSON:', e);
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Invalid JSON');
      }
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});