const STOPWORDS = new Set([
  'a','an','the','and','or','but','if','then','else','when','at','by','for','with','about','against','between','into','through','during','before','after','above','below','to','from','up','down','in','out','on','off','over','under','again','further','once','here','there','all','any','both','each','few','more','most','other','some','such','no','nor','not','only','own','same','so','than','too','very','s','t','can','will','just','don','should','now','is','are','was','were','be','been','being','have','has','had','do','does','did'
]);

function normalizeText(s) {
  if (!s || typeof s !== 'string') return '';
  const lower = s.toLowerCase();
  const stripped = lower.replace(/[^a-z0-9\s]/g, ' ');
  const collapsed = stripped.replace(/\s+/g, ' ').trim();
  return collapsed;
}

function removeStopwords(s) {
  const tokens = s.split(' ').filter(Boolean);
  const filtered = tokens.filter(w => !STOPWORDS.has(w));
  return filtered.join(' ');
}

function tokenize(s) {
  return s.split(' ').filter(Boolean);
}

function vectorize(tokens) {
  const map = new Map();
  for (const t of tokens) {
    map.set(t, (map.get(t) || 0) + 1);
  }
  return map;
}

function cosineSim(aTokens, bTokens) {
  const a = vectorize(aTokens);
  const b = vectorize(bTokens);
  const keys = new Set([...a.keys(), ...b.keys()]);
  let dot = 0;
  let a2 = 0;
  let b2 = 0;
  for (const k of keys) {
    const av = a.get(k) || 0;
    const bv = b.get(k) || 0;
    dot += av * bv;
    a2 += av * av;
    b2 += bv * bv;
  }
  if (a2 === 0 || b2 === 0) return 0;
  return dot / (Math.sqrt(a2) * Math.sqrt(b2));
}

function textSimilarity(a, b) {
  const na = removeStopwords(normalizeText(a));
  const nb = removeStopwords(normalizeText(b));
  const ta = tokenize(na);
  const tb = tokenize(nb);
  return cosineSim(ta, tb);
}

module.exports = {
  normalizeText,
  removeStopwords,
  textSimilarity
};

