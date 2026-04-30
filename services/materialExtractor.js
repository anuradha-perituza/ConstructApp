/**
 * Two-tier material extractor:
 *   1. Claude AI  — rich, handles any phrasing (needs ANTHROPIC_API_KEY in app.json)
 *   2. Regex      — fast local fallback, covers most construction speech patterns
 */
import Constants from 'expo-constants';

// ─── helpers ────────────────────────────────────────────────────────────────

const UNIT_MAP = {
  bag: 'bags', bags: 'bags', sack: 'bags', sacks: 'bags',
  sheet: 'sheets', sheets: 'sheets',
  board: 'boards', boards: 'boards',
  roll: 'rolls', rolls: 'rolls',
  piece: 'pcs', pieces: 'pcs', pc: 'pcs', pcs: 'pcs',
  box: 'boxes', boxes: 'boxes',
  pack: 'packs', packs: 'packs', packet: 'packs', packets: 'packs',
  unit: 'units', units: 'units',
  length: 'lengths', lengths: 'lengths',
  stick: 'sticks', sticks: 'sticks',
  ton: 'tons', tons: 'tons',
  gallon: 'gal', gallons: 'gal', gal: 'gal',
  tube: 'tubes', tubes: 'tubes',
  bucket: 'buckets', buckets: 'buckets',
  bundle: 'bundles', bundles: 'bundles',
  pallet: 'pallets', pallets: 'pallets',
  can: 'cans', cans: 'cans',
};

const UNIT_PATTERN =
  '(bags?|sacks?|sheets?|rolls?|pieces?|pcs?|boards?|lengths?|sticks?' +
  '|boxes?|units?|tons?|gallons?|gal|tubes?|buckets?|bundles?|pallets?|cans?|packs?)';

function normaliseUnit(raw) {
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  return UNIT_MAP[key] ?? raw.toLowerCase();
}

function titleCase(str) {
  return str
    .trim()
    .toLowerCase()
    .replace(/\b(\w)/g, c => c.toUpperCase());
}

function extractSpec(text) {
  const parts = [];
  const weight = text.match(/\d+(?:\.\d+)?\s*(?:lb|lbs|pound|pounds|kg)\s*(?:each|per|a bag)?/i);
  if (weight) parts.push(weight[0].trim());
  const length = text.match(/\d+(?:\.\d+)?\s*(?:ft|feet|foot|m|meter|meters)\s*(?:each|long|per)?/i);
  if (length && length[0] !== weight?.[0]) parts.push(length[0].trim());
  const dim = text.match(/\d+\/\d+["']?|\d+["']\s*(?:thick)?|(?:\d+\s*[xX]\s*\d+)/);
  if (dim) parts.push(dim[0].trim());
  const grade = text.match(/#\s*\d+|type[-\s]?[a-z]\b|grade\s+[a-z0-9]+/i);
  if (grade) parts.push(grade[0].trim());
  return parts.join(', ');
}

function cleanName(raw) {
  return titleCase(
    raw
      .replace(/,?\s*\d+(?:\.\d+)?\s*(?:lb|lbs|pound|pounds|kg)\s*(?:each|per|a bag)?/gi, '')
      .replace(/,?\s*\d+(?:\.\d+)?\s*(?:ft|feet|foot|m|meter)\s*(?:each|long)?/gi, '')
      .replace(/,?\s*#\s*\d+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

// ─── regex extractor ─────────────────────────────────────────────────────────

function regexExtract(transcript) {
  const t = transcript.trim();

  // Strip filler lead-ins
  const cleaned = t
    .replace(/^(i need|i want|please|we need|get me|order|bring|can (you|i) get)\s+/i, '')
    .replace(/\s+for\s+(the\s+)?(project|site|job)\b.*/i, '')
    .trim();

  const re = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s+${UNIT_PATTERN}\\s+(?:of\\s+)?(.+)$`, 'i');
  const m1 = cleaned.match(re);
  if (m1) {
    const qty = m1[1];
    const unit = normaliseUnit(m1[2]);
    const rest = m1[3].trim();
    return { name: cleanName(rest), quantity: `${qty} ${unit}`, spec: extractSpec(rest) };
  }

  // "TYPE-S MORTAR 4 bags" or "rebar #4 20 sticks"
  const re2 = new RegExp(`^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s+${UNIT_PATTERN}(?:\\s+(.+))?$`, 'i');
  const m2 = cleaned.match(re2);
  if (m2) {
    return {
      name: cleanName(m2[1]),
      quantity: `${m2[2]} ${normaliseUnit(m2[3])}`,
      spec: m2[4] ? extractSpec(m2[4]) : extractSpec(cleaned),
    };
  }

  // bare "20 rebar sticks" or "4 cement"
  const m3 = cleaned.match(/^(\d+(?:\.\d+)?)\s+(.+)$/i);
  if (m3) {
    return {
      name: cleanName(m3[2]),
      quantity: `${m3[1]} units`,
      spec: extractSpec(cleaned),
    };
  }

  return { name: titleCase(t), quantity: '', spec: '' };
}

// ─── Claude AI extractor ──────────────────────────────────────────────────────

async function claudeExtract(transcript) {
  const apiKey = Constants.expoConfig?.extra?.anthropicApiKey;
  if (!apiKey || apiKey === 'YOUR_ANTHROPIC_API_KEY_HERE') return null;

  const prompt = `You are a construction site assistant. Extract the material details from this voice request.
Return ONLY a raw JSON object — no markdown, no explanation.
Keys: "name" (proper material name), "quantity" (number + unit), "spec" (size/weight/grade or empty string).

Voice input: "${transcript}"

Examples:
"4 bags of type-s mortar" → {"name":"Type-S Mortar","quantity":"4 bags","spec":""}
"10 sheets of 3/4 plywood" → {"name":"Plywood Sheets","quantity":"10 sheets","spec":"3/4 inch thick"}
"5 bags hydraulic cement 94 lb each" → {"name":"Hydraulic Cement","quantity":"5 bags","spec":"94 lb each"}
"rebar number 4 20 sticks 20 feet" → {"name":"Rebar #4","quantity":"20 sticks","spec":"20 ft each"}
"two dozen concrete blocks" → {"name":"Concrete Block","quantity":"24 units","spec":""}`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    const text = data.content?.[0]?.text?.trim() ?? '';
    const parsed = JSON.parse(text);
    if (parsed?.name) return parsed;
  } catch {
    // fall through to regex
  }
  return null;
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Extract material name, quantity, and spec from a raw voice transcript.
 * Tries Claude AI first; falls back to regex if no API key or on error.
 *
 * @param {string} transcript
 * @returns {Promise<{name:string, quantity:string, spec:string}>}
 */
export async function extractMaterial(transcript) {
  const aiResult = await claudeExtract(transcript);
  return aiResult ?? regexExtract(transcript);
}
