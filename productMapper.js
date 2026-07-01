const PRODUCT_MAP = {
  "Civil3D Workshop Working Engineers": "civil3d_workshop_working",
  "Civil3D Course": "civil3d_course",
  "Video Editing Workshop": "video_editing_workshop",
  // Add other product mappings here
};

function mapProductNameToContentId(productName) {
  if (!productName) return null;
  // Exact match
  if (PRODUCT_MAP[productName]) {
    return PRODUCT_MAP[productName];
  }
  // Fallback: convert string to lowercase with underscores
  return productName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

module.exports = {
  mapProductNameToContentId
};
