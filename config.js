require('dotenv').config();

module.exports = {
  META_PIXEL_ID: process.env.META_PIXEL_ID,
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
  META_API_VERSION: 'v18.0',
  PORT: process.env.PORT || 3000,
  get metaUrl() {
    return `https://graph.facebook.com/${this.META_API_VERSION}/${this.META_PIXEL_ID}/events?access_token=${this.META_ACCESS_TOKEN}`;
  }
};
