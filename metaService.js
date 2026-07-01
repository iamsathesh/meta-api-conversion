const config = require('./config');
const hashUtils = require('./hashUtils');

async function sendToMeta(payload, retries = 2) {
  try {
    const response = await fetch(config.metaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseData = await response.json();

    if (!response.ok) {
      if (retries > 0 && response.status >= 500) {
        // Wait 1 second before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        return sendToMeta(payload, retries - 1);
      }
      throw new Error(`Meta API error: ${response.status} - ${JSON.stringify(responseData)}`);
    }

    return responseData;

  } catch (err) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return sendToMeta(payload, retries - 1);
    }
    throw err;
  }
}

function buildMetaPayload(data, eventId, eventName, contentId) {
  const email = hashUtils.clean(data.Email);
  const rawPhone = hashUtils.clean(data.Phone);
  const phone = hashUtils.normalizePhone(rawPhone);
  
  const name = hashUtils.clean(data.FullName || '');
  const { fn, ln } = name ? hashUtils.splitName(name) : { fn: undefined, ln: undefined };
  
  const dob = hashUtils.clean(data.DateOfBirth || '');
  const formattedDob = dob ? hashUtils.formatDOB(dob) : '';

  const value = parseFloat(data.AmountPaid) || 0;

  return {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: eventId,
        event_source_url: data.LandingPageURL || undefined,
        user_data: {
          em: email ? hashUtils.hash(email) : undefined,
          ph: phone ? hashUtils.hash(phone) : undefined,
          fn: fn ? hashUtils.hash(fn) : undefined,
          ln: ln ? hashUtils.hash(ln) : undefined,
          db: formattedDob ? hashUtils.hash(formattedDob) : undefined,
          ct: data.City ? hashUtils.hash(data.City.toLowerCase()) : undefined,
          st: data.State ? hashUtils.hash(data.State.toLowerCase()) : undefined,
          zp: data.ZipCode ? hashUtils.hash(hashUtils.normalizeZip(data.ZipCode)) : undefined,
          country: data.Country ? hashUtils.hash(hashUtils.normalizeCountry(data.Country)) : undefined,
          external_id: data.OpportunityID ? hashUtils.hash(data.OpportunityID) : undefined,
          client_ip_address: data.ClientIP || undefined,
          client_user_agent: data.UserAgent || undefined,
          fbc: data.FBC || undefined,
          fbp: data.FBP || undefined
        },
        custom_data: {
          value: value,
          currency: "INR", // Can be parameterized later if needed
          content_type: "product",
          content_ids: contentId ? [contentId] : undefined,
          content_name: data.ProductName || undefined,
          order_id: data.PaymentID || undefined
        }
      }
    ]
  };
}

module.exports = {
  sendToMeta,
  buildMetaPayload
};
