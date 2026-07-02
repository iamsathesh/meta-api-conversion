const processedEvents = new Set();
const MAX_DEDUP_CACHE_SIZE = 10000;

// Map GHL pipeline stage names to Meta event names
// ONLY stages listed here will be sent to Meta. Everything else is SKIPPED.
const STAGE_TO_EVENT = {
  'pending': 'InitiateCheckout',
  'payment failed': 'InitiateCheckout',
  'registered': 'Purchase',
  'won': 'Purchase',
  'completed': 'Purchase'
};

// Returns the Meta event name, or null if the stage should be skipped
function mapStageToEventName(stage) {
  if (!stage) return null;
  const normalized = String(stage).trim().toLowerCase();
  return STAGE_TO_EVENT[normalized] || null; // null = skip this stage
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

  // If the stage is not in our allowed list, skip it silently
  if (!eventName) {
    return res.status(200).json({ 
      status: 'Skipped', 
      reason: `Stage "${pipelineStage}" is not configured for Meta tracking` 
    });
  }

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
