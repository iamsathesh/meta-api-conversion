const express = require('express');
const config = require('./config');
const logger = require('./logger');
const productMapper = require('./productMapper');
const validation = require('./validation');
const metaService = require('./metaService');

const app = express();

// Middleware to parse JSON payloads with size limit
app.use(express.json({ limit: '100kb' }));

// Health check endpoint
app.get('/', (req, res) => {
  res.status(200).send('Meta CAPI Webhook Service is running.');
});

// DEBUG: Temporary endpoint to see raw GHL payload
app.post('/debug', (req, res) => {
  console.log('=== RAW GHL PAYLOAD ===');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('=== RAW GHL KEYS ===');
  console.log(Object.keys(req.body));
  res.status(200).json({ received_keys: Object.keys(req.body), raw_body: req.body });
});

// Webhook endpoint to receive data from GoHighLevel
app.post('/webhook', validation.validateWebhookPayload, async (req, res) => {
  const data = req.body;
  const eventId = req.eventId;
  const eventName = req.eventName;

  try {
    logger.info({
      message: 'Received webhook',
      EventID: eventId,
      EventName: eventName,
      OpportunityID: data.OpportunityID,
      ContactID: data.ContactID,
      ProductName: data.ProductName
    });

    const contentId = productMapper.mapProductNameToContentId(data.ProductName);
    
    // Construct the payload for Meta
    const metaPayload = metaService.buildMetaPayload(data, eventId, eventName, contentId);

    // Send data to Meta Conversion API
    const metaResponse = await metaService.sendToMeta(metaPayload);

    // Mark the event as processed for deduplication
    validation.markAsProcessed(eventId);

    logger.success({
      message: 'Successfully sent to Meta',
      EventID: eventId,
      EventName: eventName,
      OpportunityID: data.OpportunityID,
      ContactID: data.ContactID,
      PaymentID: data.PaymentID,
      MetaResponse: metaResponse,
      HTTPStatus: 200
    });

    res.status(200).json({ status: 'OK', event_id: eventId, meta_response: metaResponse });
  } catch (err) {
    logger.error({
      message: 'Failed to send to Meta',
      EventID: eventId,
      EventName: eventName,
      OpportunityID: data.OpportunityID,
      ContactID: data.ContactID,
      ErrorMessage: err.message,
      HTTPStatus: err.message.includes('Meta API error') ? 502 : 500
    });

    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

app.listen(config.PORT, () => {
  console.log(`Server running on port ${config.PORT}`);
  logger.info({ message: `Server started on port ${config.PORT}` });
});