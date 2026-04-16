/* ── ProIsPro – Disc Catalog ─────────────────────────────────────────────── */
/* Fetches disc data from the DiscIt API (sourced from Marshall Street guide) */
/* and caches it in localStorage with a 24-hour TTL.                          */

const DISCIT_API      = 'https://discit-api.fly.dev/disc';
const CATALOG_KEY     = 'proispro_disc_catalog';
const CATALOG_TTL_MS  = 24 * 60 * 60 * 1000; // 24 hours

let _catalog = null;

/* ── Category → ProIsPro type mapping ────────────────────────────────────── */
function categoryToType(category) {
  if (!category) return 'distance';
  const l = category.toLowerCase();
  if (l.includes('putter'))   return 'putter';
  if (l.includes('midrange')) return 'midrange';
  if (l.includes('hybrid') || l.includes('control') || l.includes('fairway')) return 'fairway';
  return 'distance';
}

/* ── Normalize a raw DiscIt disc object ──────────────────────────────────── */
function normalizeDisc(d) {
  return {
    id:            d.id,
    name:          d.name,
    brand:         d.brand,
    category:      d.category,
    type:          categoryToType(d.category),
    speed:         Number(d.speed),
    glide:         Number(d.glide),
    turn:          Number(d.turn),
    fade:          Number(d.fade),
    stability:     d.stability,
    stabilitySlug: d.stability_slug,
    pic:           d.pic   || null,
    link:          d.link  || null,
    nameSlug:      d.name_slug,
    brandSlug:     d.brand_slug,
  };
}

/* ── Load disc catalog (cache-first) ─────────────────────────────────────── */
async function loadCatalog() {
  if (_catalog) return _catalog;

  // Try localStorage cache
  try {
    const raw = localStorage.getItem(CATALOG_KEY);
    if (raw) {
      const { data, ts } = JSON.parse(raw);
      if (Date.now() - ts < CATALOG_TTL_MS) {
        _catalog = data;
        return _catalog;
      }
    }
  } catch { /* ignore corrupted cache */ }

  // Fetch from DiscIt API
  const res = await fetch(DISCIT_API);
  if (!res.ok) throw new Error(`DiscIt API error: ${res.status}`);
  const json = await res.json();

  _catalog = json.map(normalizeDisc);

  try {
    localStorage.setItem(CATALOG_KEY, JSON.stringify({ data: _catalog, ts: Date.now() }));
  } catch { /* ignore quota errors */ }

  return _catalog;
}

/* ── Search ──────────────────────────────────────────────────────────────── */
function searchDiscs(discs, query) {
  if (!query) return discs;
  const q = query.toLowerCase().trim();
  return discs.filter(d =>
    d.name.toLowerCase().includes(q) ||
    d.brand.toLowerCase().includes(q)
  );
}

/* ── Filter ──────────────────────────────────────────────────────────────── */
function filterDiscs(discs, { brand, type, stability } = {}) {
  return discs.filter(d => {
    if (brand     && d.brandSlug     !== brand)     return false;
    if (type      && d.type          !== type)       return false;
    if (stability && d.stabilitySlug !== stability)  return false;
    return true;
  });
}

/* ── Unique brand list ───────────────────────────────────────────────────── */
function getBrands(discs) {
  const seen = new Map();
  for (const d of discs) {
    if (!seen.has(d.brandSlug)) seen.set(d.brandSlug, d.brand);
  }
  return [...seen.entries()]
    .sort((a, b) => a[1].localeCompare(b[1]))
    .map(([slug, name]) => ({ slug, name }));
}

/* ── Stability from raw flight numbers (for user bag discs) ─────────────── */
function stabilityFromNumbers(turn, fade) {
  const s = (Number(turn) || 0) + (Number(fade) || 0);
  if (s >= 4)  return { slug: 'very-overstable',  label: 'Very Overstable'  };
  if (s >= 2)  return { slug: 'overstable',        label: 'Overstable'       };
  if (s >= 0)  return { slug: 'stable',            label: 'Stable'           };
  if (s >= -2) return { slug: 'understable',       label: 'Understable'      };
  return       { slug: 'very-understable',         label: 'Very Understable' };
}

/* ── Parse legacy flight string e.g. "12 / 5 / -1 / 3" ─────────────────── */
function parseFlightString(str) {
  if (!str || typeof str !== 'string') return null;
  const parts = str.split('/').map(s => parseFloat(s.trim()));
  if (parts.length === 4 && parts.every(n => !isNaN(n))) {
    return { speed: parts[0], glide: parts[1], turn: parts[2], fade: parts[3] };
  }
  return null;
}
