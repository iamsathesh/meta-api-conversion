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
  // GHL uses lowercase/snake_case keys
  const email = hashUtils.clean(data.email);
  const rawPhone = hashUtils.clean(data.phone);
  const phone = hashUtils.normalizePhone(rawPhone);

  // GHL sends first_name and full_name (no last_name)
  let fn = hashUtils.clean(data.first_name || '');
  let ln = '';

  // If full_name has more words than first_name, extract last name from it
  const fullName = hashUtils.clean(data.full_name || '');
  if (fullName && fullName !== fn) {
    const split = hashUtils.splitName(fullName);
    if (!fn) fn = split.fn || '';
    ln = split.ln || '';
  }

  // GHL sends lead_value as a number
  const value = parseFloat(data.lead_value) || 0;

  // GHL sends city, state, country in lowercase keys
  const city = hashUtils.clean(data.city || '');
  const state = hashUtils.clean(data.state || '');
  const country = hashUtils.clean(data.country || '');

  // GHL sends "First Landing Page" as the landing page URL
  const landingPageUrl = data['First Landing Page'] || '';

  return {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_id: eventId,
        event_source_url: landingPageUrl || undefined,
        user_data: {
          em: email ? hashUtils.hash(email) : undefined,
          ph: phone ? hashUtils.hash(phone) : undefined,
          fn: fn ? hashUtils.hash(fn.toLowerCase()) : undefined,
          ln: ln ? hashUtils.hash(ln.toLowerCase()) : undefined,
          ct: city ? hashUtils.hash(city.toLowerCase()) : undefined,
          st: state ? hashUtils.hash(state.toLowerCase()) : undefined,
          country: country ? hashUtils.hash(hashUtils.normalizeCountry(country)) : undefined,
          external_id: data.contact_id ? hashUtils.hash(data.contact_id) : undefined,
          client_ip_address: data.ip || undefined,
          client_user_agent: data.user_agent || undefined,
          fbc: data.fbc || data['FBC Click ID'] || undefined,
          fbp: data.fbp || data['FBP Browser ID'] || undefined
        },
        custom_data: {
          value: value,
          currency: "INR",
          content_type: "product",
          content_ids: contentId ? [contentId] : undefined,
          content_name: data.opportunity_name || undefined,
          order_id: data.payment_id || data.PaymentID || undefined
        }
      }
    ]
  };
}

module.exports = {
  sendToMeta,
  buildMetaPayload
};
