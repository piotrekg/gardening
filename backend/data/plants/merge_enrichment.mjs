// Merge enrichment_parts/*.json into a single enrichment.json map (id -> record).
// Validates each record and reports coverage. Run: node merge_enrichment.mjs
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';

const dir = new URL('./enrichment_parts/', import.meta.url);
const out = new URL('./enrichment.json', import.meta.url);

const REQUIRED = [
  'description_pl', 'description_en', 'fertilizing_pl', 'fertilizing_en',
  'watering_detail_pl', 'watering_detail_en', 'light_pl', 'light_en',
  'soil_pl', 'soil_en', 'toxicity_pl', 'toxicity_en',
];

const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
const merged = {};
let bad = 0;
let diseaseCount = 0;

for (const f of files) {
  let obj;
  try {
    obj = JSON.parse(readFileSync(new URL(f, dir), 'utf8'));
  } catch (e) {
    console.error(`SKIP ${f}: invalid JSON (${e.message})`);
    bad++;
    continue;
  }
  for (const [id, rec] of Object.entries(obj)) {
    if (!rec || typeof rec !== 'object') continue;
    const missing = REQUIRED.filter((k) => !rec[k] || !String(rec[k]).trim());
    if (missing.length) {
      console.error(`WARN ${id}: missing ${missing.join(',')}`);
    }
    if (!Array.isArray(rec.tips_pl)) rec.tips_pl = [];
    if (!Array.isArray(rec.tips_en)) rec.tips_en = [];
    if (!Array.isArray(rec.diseases)) rec.diseases = [];
    diseaseCount += rec.diseases.length;
    merged[id] = rec;
  }
}

writeFileSync(out, JSON.stringify(merged));
console.log(`merged ${Object.keys(merged).length} plants from ${files.length} parts (${bad} bad files); ${diseaseCount} disease entries`);
