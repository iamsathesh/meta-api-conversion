const processedEvents = new Set();
const MAX_DEDUP_CACHE_SIZE = 10000;

// Map GHL pipeline stage names to Meta event names
const STAGE_TO_EVENT = {
  'pending': 'InitiateCheckout',
  'registered': 'Purchase',
  'won': 'Purchase',
  'completed': 'Purchase'
};

function mapStageToEventName(stage) {
  if (!stage) return 'Purchase';
  const normalized = String(stage).trim().toLowerCase();
  return STAGE_TO_EVENT[normalized] || 'Purchase';
}

function isDuplicate(eventId) {
  return processedEvents.has(eventId);
}

function markAsProcessed(eventId) {
  if (processedEvents.size >= MAX_DEDUP_CACHE_SIZE) {
    const iterator = processedEvents.values();
    processedEvents.delete(iterator.next().value);
  }
  processedEvents.add(eventId);
}

function validateWebhookPayload(req, res, next) {
  const data = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Empty payload' });
  }

  // GHL sends pipeline stage as "pipleline_stage" (their typo) or "pipeline_stage"
  const pipelineStage = data.pipleline_stage || data.pipeline_stage || '';
  const eventName = mapStageToEventName(pipelineStage);

  // GHL sends opportunity ID as "id" and contact ID as "contact_id"
  const opportunityId = data.id || data.contact_id;

  if (!opportunityId) {
    return res.status(422).json({
      error: 'No id or contact_id found in GHL payload',
      received_keys: Object.keys(data)
    });
  }

  const eventId = `${eventName}_${opportunityId}`;
  req.eventId = eventId;
  req.eventName = eventName;

  // Check Deduplication
  if (isDuplicate(eventId)) {
    return res.status(200).json({ status: 'Ignored', reason: 'Duplicate EventID', event_id: eventId });
  }

  next();
}

module.exports = {
  validateWebhookPayload,
  markAsProcessed,
  isDuplicate
};
