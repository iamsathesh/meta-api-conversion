const crypto = require('crypto');

function hash(value) {
  if (!value) return undefined;
  return crypto.createHash('sha256')
    .update(value.toLowerCase().trim())
    .digest('hex');
}

function clean(value) {
  if (!value) return '';
  if (typeof value !== 'string') return value;
  if (value.includes('${')) return ''; // Filter out unresolved variables
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

const COUNTRY_MAP = {
  'afghanistan': 'af', 'albania': 'al', 'algeria': 'dz', 'argentina': 'ar',
  'australia': 'au', 'austria': 'at', 'bangladesh': 'bd', 'belgium': 'be',
  'brazil': 'br', 'canada': 'ca', 'chile': 'cl', 'china': 'cn',
  'colombia': 'co', 'denmark': 'dk', 'egypt': 'eg', 'ethiopia': 'et',
  'finland': 'fi', 'france': 'fr', 'germany': 'de', 'ghana': 'gh',
  'greece': 'gr', 'hong kong': 'hk', 'hungary': 'hu', 'india': 'in',
  'indonesia': 'id', 'iran': 'ir', 'iraq': 'iq', 'ireland': 'ie',
  'israel': 'il', 'italy': 'it', 'japan': 'jp', 'jordan': 'jo',
  'kenya': 'ke', 'kuwait': 'kw', 'malaysia': 'my', 'mexico': 'mx',
  'morocco': 'ma', 'myanmar': 'mm', 'nepal': 'np', 'netherlands': 'nl',
  'new zealand': 'nz', 'nigeria': 'ng', 'norway': 'no', 'oman': 'om',
  'pakistan': 'pk', 'peru': 'pe', 'philippines': 'ph', 'poland': 'pl',
  'portugal': 'pt', 'qatar': 'qa', 'romania': 'ro', 'russia': 'ru',
  'saudi arabia': 'sa', 'singapore': 'sg', 'south africa': 'za',
  'south korea': 'kr', 'spain': 'es', 'sri lanka': 'lk', 'sweden': 'se',
  'switzerland': 'ch', 'taiwan': 'tw', 'tanzania': 'tz', 'thailand': 'th',
  'turkey': 'tr', 'ukraine': 'ua', 'united arab emirates': 'ae',
  'united kingdom': 'gb', 'united states': 'us', 'united states of america': 'us',
  'usa': 'us', 'uk': 'gb', 'uae': 'ae', 'vietnam': 'vn', 'zimbabwe': 'zw'
};

function normalizeCountry(country) {
  if (!country) return '';
  const trimmed = country.trim().toLowerCase();
  if (/^[a-z]{2}$/.test(trimmed)) return trimmed;
  if (COUNTRY_MAP[trimmed]) return COUNTRY_MAP[trimmed];
  return '';
}

function normalizePhone(phone) {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    digits = '91' + digits; // Assuming India default if not provided
  }
  return digits;
}

function normalizeZip(zip) {
  if (!zip) return '';
  return String(zip).replace(/[^a-zA-Z0-9]/g, '').trim();
}

module.exports = {
  hash,
  clean,
  splitName,
  formatDOB,
  normalizeCountry,
  normalizePhone,
  normalizeZip
};
