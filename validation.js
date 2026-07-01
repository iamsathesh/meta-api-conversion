const processedEvents = new Set();
const MAX_DEDUP_CACHE_SIZE = 10000;

function isDuplicate(eventId) {
  return processedEvents.has(eventId);
}

function markAsProcessed(eventId) {
  if (processedEvents.size >= MAX_DEDUP_CACHE_SIZE) {
    // Simple eviction: clear the set or remove oldest. 
    // For a basic implementation, we can just clear it or use an array for LRU.
    // To keep it simple and efficient:
    const iterator = processedEvents.values();
    processedEvents.delete(iterator.next().value); // remove the oldest inserted
  }
  processedEvents.add(eventId);
}

function validateWebhookPayload(req, res, next) {
  const data = req.body;

  if (!data) {
    return res.status(400).json({ error: 'Empty payload' });
  }

  // Direct mapping: The webhook explicitly defines the exact Meta EventName 
  // (e.g. "Purchase" or "InitiateCheckout")
  const eventName = data.EventName || 'Purchase'; // Default to Purchase if missing
  const opportunityId = data.OpportunityID;

  if (!opportunityId) {
    return res.status(422).json({ error: 'OpportunityID is required for deduplication' });
  }

  const eventId = `${eventName}_${opportunityId}`;
  req.eventId = eventId;
  req.eventName = eventName;

  // Check Deduplication
  if (isDuplicate(eventId)) {
    // If duplicate, we return 200 OK so GHL doesn't retry, but we don't process it.
    return res.status(200).json({ status: 'Ignored', reason: 'Duplicate EventID', event_id: eventId });
  }

  next();
}

module.exports = {
  validateWebhookPayload,
  markAsProcessed,
  isDuplicate
};
