/* ── ProIsPro – Flight Guide ─────────────────────────────────────────────── */
/* Standalone Alpine.js component for the disc flight guide page              */

const SUPABASE_URL_FG  = 'https://odqhusmmqgipvazusrxs.supabase.co';
const SUPABASE_ANON_FG = 'sb_publishable_p0KpjMepMloZb6SI-y6ang_2uzbdQ9U';

function getSupabaseFG() {
  try { return window.supabase.createClient(SUPABASE_URL_FG, SUPABASE_ANON_FG); } catch { return null; }
}

/* ── Constants ───────────────────────────────────────────────────────────── */
const STABILITY_ORDER = [
  'very-overstable',
  'overstable',
  'stable',
  'understable',
  'very-understable',
];

const STABILITY_LABELS = {
  'very-overstable':  'Very Overstable',
  'overstable':       'Overstable',
  'stable':           'Stable',
  'understable':      'Understable',
  'very-understable': 'Very Understable',
};

const TYPE_LABELS_FG = {
  distance: 'Distance Driver',
  fairway:  'Fairway / Hybrid',
  midrange: 'Midrange',
  putter:   'Putter',
};

/* ── Alpine Component ────────────────────────────────────────────────────── */
function flightGuide() {
  return {
    /* State */
    loading:            true,
    error:              null,
    allDiscs:           [],
    search:             '',
    filterBrand:        '',
    filterType:         '',
    filterStability:    '',
    showDetail:         false,
    selectedDisc:       null,
    lastFocusedElement: null,
    userBagDiscs:       [],
    stabilityOrder:     STABILITY_ORDER,
    stabilityLabels:    STABILITY_LABELS,
    typeLabels:         TYPE_LABELS_FG,

    /* ── Computed ─────────────────────────────────────────────────────────── */
    get filteredDiscs() {
      let list = this.allDiscs;
      const q = this.search.toLowerCase().trim();
      if (q) {
        list = list.filter(d =>
          d.name.toLowerCase().includes(q) ||
          d.brand.toLowerCase().includes(q)
        );
      }
      if (this.filterBrand)     list = list.filter(d => d.brandSlug     === this.filterBrand);
      if (this.filterType)      list = list.filter(d => d.type          === this.filterType);
      if (this.filterStability) list = list.filter(d => d.stabilitySlug === this.filterStability);
      return list;
    },

    get brands() {
      return getBrands(this.allDiscs);
    },

    get discCount() {
      return this.filteredDiscs.length;
    },

    get gridRows() {
      const discs = this.filteredDiscs;
      const rows = [];
      // Always show all speed rows 1–15 so the grid is a stable coordinate system.
      // Rows with no matching discs are rendered empty (grey stripe) rather than removed.
      for (let speed = 15; speed >= 1; speed--) {
        const rowDiscs = discs.filter(d => d.speed === speed);
        const cells = {};
        for (const s of STABILITY_ORDER) {
          cells[s] = rowDiscs.filter(d => d.stabilitySlug === s);
        }
        // Skip entirely empty rows only when the full catalog is loaded and truly has no discs at that speed
        const hasAnyAtSpeed = this.allDiscs.some(d => d.speed === speed);
        if (!hasAnyAtSpeed) continue;
        rows.push({ speed, cells, count: rowDiscs.length });
      }
      return rows;
    },

    /* ── Methods ──────────────────────────────────────────────────────────── */
    async init() {
      try {
        this.allDiscs = await loadCatalog();
      } catch (err) {
        this.error = 'Could not load disc catalog. Check your connection and try again.';
        console.error(err);
      }
      this.loading = false;

      /* Try to load user's bag for highlighting */
      try {
        const sb = getSupabaseFG();
        if (sb) {
          const { data: { user } } = await sb.auth.getUser();
          if (user) {
            const { data } = await sb.from('discs').select('name, manufacturer');
            this.userBagDiscs = data || [];
          }
        }
      } catch { /* guest mode — no bag highlighting */ }

      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') this.closeModal();
      });
    },

    selectDisc(disc, event) {
      this.selectedDisc = disc;
      this.showDetail   = true;
      this.lastFocusedElement = event?.currentTarget || null;
      document.body.style.overflow = 'hidden';
      this.$nextTick(() => {
        document.querySelector('.fg-modal-close')?.focus();
      });
    },

    closeModal() {
      this.showDetail = false;
      document.body.style.overflow = '';
      this.$nextTick(() => {
        this.lastFocusedElement?.focus();
      });
    },

    handleTabKey(e) {
      const focusable = document.querySelectorAll(
        '.fg-modal-card button, .fg-modal-card [href], .fg-modal-card input, .fg-modal-card select, .fg-modal-card textarea, .fg-modal-card [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    },

    isInBag(disc) {
      return this.userBagDiscs.some(b =>
        b.name.toLowerCase() === disc.name.toLowerCase() &&
        (!b.manufacturer || b.manufacturer.toLowerCase() === disc.brand.toLowerCase())
      );
    },

    addToBag(disc) {
      const p = new URLSearchParams({
        name:         disc.name,
        manufacturer: disc.brand,
        type:         disc.type,
        speed:        disc.speed,
        glide:        disc.glide,
        turn:         disc.turn,
        fade:         disc.fade,
      });
      window.location.href = 'index.html?' + p.toString();
    },

    resetFilters() {
      this.search          = '';
      this.filterBrand     = '';
      this.filterType      = '';
      this.filterStability = '';
    },

    /* ── Display helpers ──────────────────────────────────────────────────── */
    formatTurn(n) { return n > 0 ? '+' + n : String(n); },

    turnClass(n) {
      if (n < -2) return 'fn-very-under';
      if (n < 0)  return 'fn-under';
      if (n === 0) return 'fn-neutral';
      return 'fn-over';
    },

    /* Bar width % for flight number visualisations */
    speedBar(v)  { return Math.max(2, (Number(v) / 15)  * 100) + '%'; },
    glideBar(v)  { return Math.max(2, (Number(v) / 7)   * 100) + '%'; },
    turnBar(v)   { return Math.max(2, (Math.abs(Number(v)) / 5) * 100) + '%'; },
    fadeBar(v)   { return Math.max(2, (Number(v) / 5)   * 100) + '%'; },

    /* ── SVG Flight Path helpers ──────────────────────────────────────────── */
    flightPath(disc) {
      if (!disc) return '';
      const startX = 150, startY = 195;
      const dist = Math.min(165, Math.max(80, ((disc.speed || 5) + (disc.glide || 4)) * 9));
      const turnOffset = -((disc.turn) || 0) * 11;
      const midX = Math.min(285, Math.max(15, startX + turnOffset));
      const midY = startY - (dist * 0.55);
      const fadeOffset = ((disc.fade) || 0) * 13;
      const endX = Math.min(285, Math.max(15, midX - fadeOffset));
      const endY = Math.max(20, startY - dist);
      return `M ${startX},${startY} C ${startX},${midY + 20} ${midX},${midY} ${endX},${endY}`;
    },

    flightEnd(disc) {
      if (!disc) return { x: 150, y: 30 };
      const startX = 150, startY = 195;
      const dist = Math.min(165, Math.max(80, ((disc.speed || 5) + (disc.glide || 4)) * 9));
      const turnOffset = -((disc.turn) || 0) * 11;
      const midX = Math.min(285, Math.max(15, startX + turnOffset));
      const fadeOffset = ((disc.fade) || 0) * 13;
      const endX = Math.min(285, Math.max(15, midX - fadeOffset));
      const endY = Math.max(20, startY - dist);
      return { x: endX, y: endY };
    },

  };
}
