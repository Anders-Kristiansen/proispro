/* ── ProIsPro – Disc Inventory App ─────────────────────────── */
/* Supabase + Alpine.js rewrite                                 */

// ── Supabase Config ─────────────────────────────────────────
const SUPABASE_URL  = 'https://odqhusmmqgipvazusrxs.supabase.co';
const SUPABASE_ANON = 'sb_publishable_p0KpjMepMloZb6SI-y6ang_2uzbdQ9U';

const STORAGE_KEY = 'proispro_discs';
const BAGS_KEY    = 'proispro_bags';
const PINS_KEY    = 'proispro_course_pins';

// ── Supabase Client ─────────────────────────────────────────
//
// Two issues in Edge with Tracking Prevention enabled:
//
// 1. STORAGE: Edge blocks localStorage/IndexedDB for cross-site origins.
//    Fix: _authStorage wraps localStorage in try/catch + in-memory fallback.
//
// 2. LOCK (root cause of slow login): Supabase GoTrue uses navigator.locks
//    internally to serialize auth token reads. Every PostgREST query calls
//    getSession() → _acquireLock(). When multiple queries fire concurrently
//    (loadDiscs + loadBags + loadCoursePins), they all race for the lock.
//    Each waits 5 s before stealing → 15–25 s of cascaded timeouts.
//    Fix: _authLock replaces navigator.locks with a simple promise queue.
//    No 5-second timeouts. Callers queue up and each runs immediately after
//    the previous completes. Supabase JS v2 accepts this via auth.lock option.

const _authStorage = (() => {
  const mem = Object.create(null);
  const safe = (fn) => { try { return fn(); } catch { return null; } };
  return {
    getItem(k)      { return safe(() => localStorage.getItem(k)) ?? mem[k] ?? null; },
    setItem(k, v)   { safe(() => localStorage.setItem(k, v)); mem[k] = v; },
    removeItem(k)   { safe(() => localStorage.removeItem(k)); delete mem[k]; },
  };
})();

const _authLock = (() => {
  const pending = new Map();
  return (name, _acquireTimeout, fn) => {
    const tail = pending.get(name) ?? Promise.resolve();
    const next = tail.then(fn, fn);
    pending.set(name, next.catch(() => {}));
    return next;
  };
})();

let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON === 'YOUR_SUPABASE_ANON_KEY') return null;
  try {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: { storage: _authStorage, lock: _authLock },
    });
    return _supabase;
  } catch {
    return null;
  }
}

// ── Field Mapping ───────────────────────────────────────────
function toDbDisc(disc) {
  return {
    id: disc.id,
    name: disc.name,
    manufacturer: disc.manufacturer || null,
    disc_type: disc.type || null,
    plastic: disc.plastic || null,
    weight: disc.weight || null,
    color: disc.color || null,
    condition: disc.condition || null,
    flight: disc.flight || null,
    speed: disc.speed !== '' && disc.speed != null ? Number(disc.speed) : null,
    glide: disc.glide !== '' && disc.glide != null ? Number(disc.glide) : null,
    turn:  disc.turn  !== '' && disc.turn  != null ? Number(disc.turn)  : null,
    fade:  disc.fade  !== '' && disc.fade  != null ? Number(disc.fade)  : null,
    notes: disc.notes || null,
    user_photo_url: disc.user_photo_url || null,
    added_at: disc.added ? new Date(disc.added).toISOString() : new Date().toISOString(),
  };
}

function fromDbDisc(d) {
  // Backward compat: if speed is null but legacy flight string exists, try parsing it
  let speed = d.speed != null ? Number(d.speed) : null;
  let glide = d.glide != null ? Number(d.glide) : null;
  let turn  = d.turn  != null ? Number(d.turn)  : null;
  let fade  = d.fade  != null ? Number(d.fade)  : null;

  if (speed == null && d.flight) {
    const parsed = parseFlightString(d.flight);
    if (parsed) { speed = parsed.speed; glide = parsed.glide; turn = parsed.turn; fade = parsed.fade; }
  }

  return {
    id: d.id,
    name: d.name,
    manufacturer: d.manufacturer || '',
    type: d.disc_type || '',
    plastic: d.plastic || '',
    weight: d.weight != null ? String(d.weight) : '',
    color: d.color || '',
    condition: d.condition || 'good',
    flight: d.flight || '',
    speed: speed != null ? speed : '',
    glide: glide != null ? glide : '',
    turn:  turn  != null ? turn  : '',
    fade:  fade  != null ? fade  : '',
    notes: d.notes || '',
    tags: d.tags || [],
    user_photo_url: d.user_photo_url || null,
    added: d.added_at ? new Date(d.added_at).getTime() : Date.now(),
    addedAt: d.added_at ? new Date(d.added_at).getTime() : Date.now(),
  };
}

// ── Bag + Course Pin Field Mapping ──────────────────────────
function toDbBag(bag) {
  return { id: bag.id, name: bag.name, disc_ids: bag.discIds, updated_at: new Date().toISOString() };
}
function fromDbBag(b) {
  return {
    id: b.id,
    name: b.name || '',
    discIds: Array.isArray(b.disc_ids) ? b.disc_ids : [],
    createdAt: b.created_at ? new Date(b.created_at).getTime() : Date.now(),
  };
}
function toDbPin(pin) {
  return { id: pin.id, course_name: pin.courseName, course_id: pin.courseId || null, bag_id: pin.bagId };
}
function fromDbPin(p) {
  return {
    id: p.id,
    courseName: p.course_name || '',
    courseId: p.course_id || null,
    bagId: p.bag_id,
    createdAt: p.created_at ? new Date(p.created_at).getTime() : Date.now(),
  };
}

// ── Helpers ─────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const TYPE_LABELS = { putter: 'Putter', midrange: 'Midrange', fairway: 'Fairway Driver', distance: 'Distance Driver' };
const COND_LABELS = { new: 'Mint', good: 'Good', used: 'Used', beat: 'Beat-in' };
const VALID_TYPES = new Set(['putter', 'midrange', 'fairway', 'distance']);
const VALID_CONDS = new Set(['new', 'good', 'used', 'beat']);

// ── Toast (global, used by Alpine methods) ──────────────────
let _toastEl = null;
let _toastTimer = null;

function showToast(msg) {
  if (!_toastEl) {
    _toastEl = document.createElement('div');
    _toastEl.className = 'toast';
    document.body.appendChild(_toastEl);
  }
  _toastEl.textContent = msg;
  _toastEl.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => _toastEl.classList.remove('show'), 2400);
}

// ── Alpine.js Component ─────────────────────────────────────
function discApp() {
  return {
    // State
    discs: [],
    user: null,
    loading: true,
    search: '',
    filterType: '',
    sortBy: 'name-asc',
    sortDir: 'asc',
    activeSortColumn: 'name',
    viewMode: 'grid',
    groupBy: 'bag',
    activeTagFilter: '',
    showAdvancedPopover: false,
    filterBrand: '',
    filterBag: '',
    filterCondition: '',
    filterWeightMin: null,
    filterWeightMax: null,
    groupExpanded: {},
    tagInput: '',
    showAddModal: false,
    showDeleteModal: false,
    editingDisc: null,
    pendingDeleteDisc: null,
    form: { name: '', manufacturer: '', type: '', plastic: '', weight: '', color: '', condition: 'good', speed: '', glide: '', turn: '', fade: '', notes: '', tags: [] },
    formId: '',
    formInvalid: { name: false, type: false },
    photoPreview:    null,
    photoFile:       null,
    photoUploading:  false,

    // Bag + Course state
    bags: [],
    coursePins: [],
    activeTab: 'inventory',
    activeBagId: null,
    showBagModal: false,
    bagForm: { id: '', name: '' },
    showDeleteBagModal: false,
    pendingDeleteBag: null,
    showDiscPickerModal: false,
    discPickerBagId: null,
    discPickerSearch: '',
    showPinModal: false,
    editingPinId: null,
    pinForm: { courseQuery: '', courseId: '', courseName: '', bagId: '' },
    pdgaSuggestions: [],
    pdgaLoading: false,
    _pdgaTimer: null,
    _courseCache: {},
    discSuggestions: [],
    discSuggestionsLoading: false,
    _discTimer: null,
    aiIdentifying: false,
    aiIdentifyMsg: '',

    // Collections state
    _collectionDiscs: [],
    collections: [],
    activeCollectionId: null,
    showCollectionModal: false,
    showDeleteCollectionModal: false,
    pendingDeleteCollection: null,
    collectionForm: { id: '', name: '', description: '' },
    showDiscCollectionPickerModal: false,
    discCollectionPickerCollectionId: null,
    discCollectionPickerSearch: '',

    // Wishlist state
    wishlistItems: [],
    showWishlistModal: false,
    showDeleteWishlistModal: false,
    pendingDeleteWishlistItem: null,
    wishlistForm: { id: '', disc_name: '', manufacturer: '', plastic_pref: '', weight_min: '', weight_max: '', priority: 0, notes: '' },

    // For Sale state
    forsaleListings: [],
    showForSaleModal: false,
    showDeleteForSaleModal: false,
    pendingDeleteForSale: null,
    forsaleForm: { id: '', disc_id: '' },
    forsaleDiscSearch: '',
    saleToken: null,
    saleIsPublic: true,

    // Computed
    get filteredSorted() {
      const q = this.search.toLowerCase().trim();
      const type = this.filterType;
      const sortStr = this.sortBy;

      let list = this.discs.filter(d => {
        // Text search
        const matchQ = !q ||
          (d.name || '').toLowerCase().includes(q) ||
          (d.manufacturer || '').toLowerCase().includes(q) ||
          (d.plastic || '').toLowerCase().includes(q) ||
          (d.color || '').toLowerCase().includes(q) ||
          (d.notes || '').toLowerCase().includes(q) ||
          ((d.tags || []).some(t => t.toLowerCase().includes(q)));
        
        // Type filter
        const matchT = !type || d.type === type;
        
        // Tag filter
        const matchTag = !this.activeTagFilter || (d.tags || []).includes(this.activeTagFilter);
        
        // Brand filter
        const matchBrand = !this.filterBrand || (d.manufacturer || '').toLowerCase().includes(this.filterBrand.toLowerCase());
        
        // Bag filter
        const matchBag = !this.filterBag || this.isDiscInBag(this.filterBag, d.id);
        
        // Condition filter
        const matchCondition = !this.filterCondition || d.condition === this.filterCondition;
        
        // Weight range filter
        const matchWeightMin = this.filterWeightMin === null || (Number(d.weight) || 0) >= Number(this.filterWeightMin);
        const matchWeightMax = this.filterWeightMax === null || (Number(d.weight) || 0) <= Number(this.filterWeightMax);
        
        return matchQ && matchT && matchTag && matchBrand && matchBag && matchCondition && matchWeightMin && matchWeightMax;
      });

      // Parse sort string (e.g., 'name-asc' → field='name', desc=false)
      const [field, dir] = sortStr.split('-');
      const desc = dir === 'desc';

      // Type order helper
      const typeOrder = { putter: 0, midrange: 1, fairway: 2, distance: 3 };
      // Condition order helper
      const condOrder = { new: 0, mint: 0, good: 1, used: 2, beat: 3 };

      list.sort((a, b) => {
        let aVal, bVal;
        
        if (field === 'name') {
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
        }
        
        if (field === 'type') {
          aVal = typeOrder[a.type] ?? 99;
          bVal = typeOrder[b.type] ?? 99;
          return desc ? bVal - aVal : aVal - bVal;
        }
        
        if (field === 'speed' || field === 'glide' || field === 'turn' || field === 'fade') {
          aVal = a[field] != null && a[field] !== '' ? Number(a[field]) : (desc ? -Infinity : Infinity);
          bVal = b[field] != null && b[field] !== '' ? Number(b[field]) : (desc ? -Infinity : Infinity);
          return desc ? bVal - aVal : aVal - bVal;
        }
        
        if (field === 'weight') {
          aVal = a.weight != null && a.weight !== '' ? Number(a.weight) : (desc ? -Infinity : Infinity);
          bVal = b.weight != null && b.weight !== '' ? Number(b.weight) : (desc ? -Infinity : Infinity);
          return desc ? bVal - aVal : aVal - bVal;
        }
        
        if (field === 'condition') {
          aVal = condOrder[a.condition] ?? 99;
          bVal = condOrder[b.condition] ?? 99;
          return desc ? bVal - aVal : aVal - bVal;
        }
        
        if (field === 'added') {
          aVal = a.addedAt || 0;
          bVal = b.addedAt || 0;
          return desc ? bVal - aVal : aVal - bVal;
        }
        
        return 0;
      });

      return list;
    },

    get discCount() {
      const n = this.filteredSorted.length;
      const total = this.discs.length;
      if (n === total) {
        return `${n} disc${n !== 1 ? 's' : ''}`;
      }
      return `${n} of ${total} disc${total !== 1 ? 's' : ''}`;
    },

    get discPickerFiltered() {
      const q = this.discPickerSearch.toLowerCase().trim();
      if (!q) return this.discs;
      return this.discs.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.manufacturer || '').toLowerCase().includes(q)
      );
    },

    get groupedDiscs() {
      if (this.groupBy === 'none') {
        return [{ label: null, count: this.filteredSorted.length, discs: this.filteredSorted }];
      }
      
      if (this.groupBy === 'type') {
        const types = [
          { key: 'putter', label: 'Putter' },
          { key: 'midrange', label: 'Midrange' },
          { key: 'fairway', label: 'Fairway Driver' },
          { key: 'distance', label: 'Distance Driver' }
        ];
        return types
          .map(t => {
            const discs = this.filteredSorted.filter(d => d.type === t.key);
            return { label: t.label, count: discs.length, discs };
          })
          .filter(g => g.count > 0);
      }
      
      if (this.groupBy === 'brand') {
        const brandMap = {};
        this.filteredSorted.forEach(d => {
          const brand = (d.manufacturer || '(Unknown Brand)').trim() || '(Unknown Brand)';
          if (!brandMap[brand]) brandMap[brand] = [];
          brandMap[brand].push(d);
        });
        return Object.keys(brandMap)
          .sort()
          .map(brand => ({ label: brand, count: brandMap[brand].length, discs: brandMap[brand] }));
      }
      
      if (this.groupBy === 'bag') {
        const groups = [];
        
        // Group by each bag
        this.bags.forEach(bag => {
          const discs = this.filteredSorted.filter(d => this.isDiscInBag(bag.id, d.id));
          if (discs.length > 0) {
            groups.push({ label: bag.name, count: discs.length, discs });
          }
        });
        
        // "Not in any bag" group
        const unbaggedDiscs = this.filteredSorted.filter(d => {
          return !this.bags.some(bag => this.isDiscInBag(bag.id, d.id));
        });
        if (unbaggedDiscs.length > 0) {
          groups.push({ label: 'Not in any bag', count: unbaggedDiscs.length, discs: unbaggedDiscs });
        }
        
        return groups;
      }
      
      return [{ label: null, count: this.filteredSorted.length, discs: this.filteredSorted }];
    },

    get allTags() {
      const tagSet = new Set();
      this.discs.forEach(d => (d.tags || []).forEach(t => tagSet.add(t)));
      return [...tagSet].sort();
    },

    get discCollectionPickerFiltered() {
      const q = this.discCollectionPickerSearch.toLowerCase().trim();
      if (!q) return this.discs;
      return this.discs.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.manufacturer || '').toLowerCase().includes(q)
      );
    },

    get forsaleDiscPickerFiltered() {
      const q = this.forsaleDiscSearch.toLowerCase().trim();
      const listedIds = new Set(this.forsaleListings.filter(l => l.status !== 'sold').map(l => l.disc_id));
      const available = this.discs.filter(d => !listedIds.has(d.id));
      if (!q) return available;
      return available.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.manufacturer || '').toLowerCase().includes(q)
      );
    },

    get publicSaleUrl() {
      if (!this.saleToken) return '';
      return `${window.location.origin}/sale.html?token=${this.saleToken}`;
    },

    // Tag helpers
    tagColor(tag) {
      const hash = tag.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      const colors = ['putter','midrange','fairway','distance','clr-accent','clr-accent2','disc-emerald','disc-iris'];
      return colors[hash % 8];
    },

    addTag() {
      const t = this.tagInput.trim().toLowerCase();
      if (t && !this.form.tags.includes(t)) this.form.tags.push(t);
      this.tagInput = '';
    },

    setSortColumn(field) {
      if (this.activeSortColumn === field) {
        this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        this.activeSortColumn = field;
        this.sortDir = 'asc';
      }
      this.sortBy = field + '-' + this.sortDir;
    },

    toggleGroup(label) {
      this.groupExpanded[label] = !(this.groupExpanded[label] !== false);
    },

    // Lifecycle
    async init() {
      const sb = getSupabase();
      if (sb) {
        // authReady gates the onAuthStateChange handler.
        // checkAuth() handles the initial data load; this handler fires only
        // for subsequent sign-in / sign-out events (e.g. after OAuth redirect).
        let authReady = false;
        sb.auth.onAuthStateChange(async (_event, session) => {
          this.user = session?.user || null;
          if (!authReady) return;
          if (this.user) {
            await this.loadDiscs();
            await this.loadBags();
            await this.loadCoursePins();
            await this.loadCollections();
            await this.loadWishlist();
            await this.loadForSaleListings();
            await this.loadSaleToken();
          } else {
            this.discs = [];
            this.bags = [];
            this.coursePins = [];
            this.collections = [];
            this.wishlistItems = [];
            this.forsaleListings = [];
            this.saleToken = null;
            this.loading = false;
          }
        });
        await this.checkAuth();
        authReady = true;
      } else {
        // No Supabase configured — localStorage-only mode
        this.user = { id: 'local', email: 'local' };
        this.loadFromLocalStorage();
        this.loadBagsFromLocalStorage();
        this.loadPinsFromLocalStorage();
        this.loading = false;
      }
      try { this._courseCache = JSON.parse(localStorage.getItem('proispro_course_cache') || '{}'); } catch { this._courseCache = {}; }

      // Pre-fill from flight guide link: index.html?name=Destroyer&manufacturer=Innova&...
      const params = new URLSearchParams(window.location.search);
      if (params.has('name')) {
        this.form = {
          name: params.get('name') || '',
          manufacturer: params.get('manufacturer') || '',
          type: params.get('type') || '',
          plastic: '',
          weight: '',
          color: '',
          condition: 'good',
          speed: params.get('speed') != null ? params.get('speed') : '',
          glide: params.get('glide') != null ? params.get('glide') : '',
          turn:  params.get('turn')  != null ? params.get('turn')  : '',
          fade:  params.get('fade')  != null ? params.get('fade')  : '',
          notes: '',
        };
        this.formInvalid = { name: false, type: false };
        this.showAddModal = true;
        window.history.replaceState({}, '', window.location.pathname);
      }

      // Global keyboard handler
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape') this.closeModals();
      });
    },

    // Auth
    async checkAuth() {
      const sb = getSupabase();
      if (!sb) return;
      try {
        const { data: { user } } = await sb.auth.getUser();
        this.user = user;
        if (user) {
          await this.loadDiscs();
          await this.loadBags();
          await this.loadCoursePins();
          await this.loadCollections();
          await this.loadWishlist();
          await this.loadForSaleListings();
          await this.loadSaleToken();
        }
      } catch {
        this.loadFromLocalStorage();
        this.loadBagsFromLocalStorage();
        this.loadPinsFromLocalStorage();
      }
      this.loading = false;
    },

    async signIn(provider = 'google') {
      const sb = getSupabase();
      if (!sb) {
        showToast('⚠️ Supabase not configured');
        return;
      }
      const { error } = await sb.auth.signInWithOAuth({
        provider: provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) showToast('❌ Login failed: ' + error.message);
    },

    async signOut() {
      const sb = getSupabase();
      if (!sb) return;
      const { error } = await sb.auth.signOut();
      if (error) showToast('❌ Logout failed: ' + error.message);
      this.user = null;
      this.discs = [];
    },

    // Data
    loadFromLocalStorage() {
      try {
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        // Backward compat: parse legacy "12 / 5 / -1 / 3" flight strings on load
        this.discs = raw.map(d => {
          if ((d.speed == null || d.speed === '') && d.flight) {
            const parsed = parseFlightString(d.flight);
            if (parsed) return { ...d, speed: parsed.speed, glide: parsed.glide, turn: parsed.turn, fade: parsed.fade };
          }
          return d;
        });
      } catch {
        this.discs = [];
      }
    },

    saveToLocalStorage() {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.discs));
      } catch { /* quota exceeded — ignore */ }
    },

    async loadDiscs() {
      const sb = getSupabase();
      if (!sb) {
        this.loadFromLocalStorage();
        return;
      }
      try {
        const { data, error } = await sb
          .from('discs')
          .select('*')
          .order('added_at', { ascending: false });
        if (error) throw error;
        this.discs = (data || []).map(fromDbDisc);
        this.saveToLocalStorage();
      } catch (err) {
        console.warn('Supabase unavailable, falling back to localStorage:', err);
        this.loadFromLocalStorage();
      }
    },

    async saveDisc() {
      // Validate
      this.formInvalid = { name: false, type: false };
      let ok = true;
      if (!this.form.name.trim()) { this.formInvalid.name = true; ok = false; }
      if (!this.form.type) { this.formInvalid.type = true; ok = false; }
      if (!ok) return;

      const id = this.formId;
      const disc = {
        id: id || uid(),
        name: this.form.name.trim(),
        manufacturer: this.form.manufacturer.trim(),
        type: this.form.type,
        plastic: this.form.plastic.trim(),
        weight: this.form.weight.trim(),
        color: this.form.color.trim(),
        condition: this.form.condition,
        flight: '',
        speed: this.form.speed !== '' && this.form.speed != null ? Number(this.form.speed) : null,
        glide: this.form.glide !== '' && this.form.glide != null ? Number(this.form.glide) : null,
        turn:  this.form.turn  !== '' && this.form.turn  != null ? Number(this.form.turn)  : null,
        fade:  this.form.fade  !== '' && this.form.fade  != null ? Number(this.form.fade)  : null,
        notes: this.form.notes.trim(),
        tags: this.form.tags || [],
        user_photo_url: id ? (this.discs.find(x => x.id === id) || {}).user_photo_url || null : null,
        added: id ? (this.discs.find(x => x.id === id) || {}).added || Date.now() : Date.now(),
      };

      const sb = getSupabase();
      try {
        if (sb && this.user && this.user.id !== 'local') {
          if (id) {
            const { error } = await sb.from('discs').update(toDbDisc(disc)).eq('id', disc.id);
            if (error) throw error;
            const idx = this.discs.findIndex(x => x.id === id);
            if (idx !== -1) this.discs[idx] = disc;
          } else {
            const { data, error } = await sb
              .from('discs')
              .insert([{ ...toDbDisc(disc), user_id: this.user.id }])
              .select()
              .single();
            if (error) throw error;
            this.discs.push(fromDbDisc(data));
            if (this.photoFile) await this.uploadDiscPhoto(data.id);
          }
        } else {
          // localStorage-only mode
          if (id) {
            const idx = this.discs.findIndex(x => x.id === id);
            if (idx !== -1) this.discs[idx] = disc;
          } else {
            this.discs.push(disc);
          }
        }
        this.saveToLocalStorage();
        this.closeModals();
        showToast(id ? '✏️ Disc updated!' : '✅ Disc added!');
      } catch (err) {
        showToast('❌ Save failed: ' + err.message);
      }
    },

    async confirmDelete() {
      if (!this.pendingDeleteDisc) return;
      const id = this.pendingDeleteDisc.id;
      this.showDeleteModal = false;

      const sb = getSupabase();
      try {
        if (sb && this.user && this.user.id !== 'local') {
          const { error } = await sb.from('discs').delete().eq('id', id);
          if (error) throw error;
        }
        this.discs = this.discs.filter(d => d.id !== id);
        this.saveToLocalStorage();
        this.pendingDeleteDisc = null;
        showToast('🗑 Disc removed');
      } catch (err) {
        showToast('❌ Delete failed: ' + err.message);
      }
    },

    // Modal helpers
    openAddModal() {
      this.formId = '';
      this.form = { name: '', manufacturer: '', type: '', plastic: '', weight: '', color: '', condition: 'good', speed: '', glide: '', turn: '', fade: '', notes: '', tags: [] };
      this.formInvalid = { name: false, type: false };
      this.showAddModal = true;
      this.$nextTick(() => {
        const el = document.getElementById('discName');
        if (el) el.focus();
      });
    },

    openEditModal(disc) {
      this.formId = disc.id;
      this.form = {
        name: disc.name || '',
        manufacturer: disc.manufacturer || '',
        type: disc.type || '',
        plastic: disc.plastic || '',
        weight: disc.weight != null ? String(disc.weight) : '',
        color: disc.color || '',
        condition: disc.condition || 'good',
        speed: disc.speed != null && disc.speed !== '' ? disc.speed : '',
        glide: disc.glide != null && disc.glide !== '' ? disc.glide : '',
        turn:  disc.turn  != null && disc.turn  !== '' ? disc.turn  : '',
        fade:  disc.fade  != null && disc.fade  !== '' ? disc.fade  : '',
        notes: disc.notes || '',
        tags: disc.tags || [],
      };
      this.formInvalid = { name: false, type: false };
      this.showAddModal = true;
      this.$nextTick(() => {
        const el = document.getElementById('discName');
        if (el) el.focus();
      });
    },

    openDeleteModal(disc) {
      this.pendingDeleteDisc = disc;
      this.showDeleteModal = true;
    },

    closeModals() {
      this.showAddModal = false;
      this.showDeleteModal = false;
      this.showBagModal = false;
      this.showDeleteBagModal = false;
      this.showDiscPickerModal = false;
      this.showPinModal = false;
      this.showCollectionModal = false;
      this.showDeleteCollectionModal = false;
      this.showDiscCollectionPickerModal = false;
      this.showWishlistModal = false;
      this.showDeleteWishlistModal = false;
      this.showForSaleModal = false;
      this.showDeleteForSaleModal = false;
      this.formInvalid = { name: false, type: false };
      if (this.photoPreview) URL.revokeObjectURL(this.photoPreview);
      this.photoPreview = null;
      this.photoFile = null;
      this.pdgaSuggestions = [];
      if (this._pdgaTimer) { clearTimeout(this._pdgaTimer); this._pdgaTimer = null; }
      this.discSuggestions = [];
      if (this._discTimer) { clearTimeout(this._discTimer); this._discTimer = null; }
      this.aiIdentifyMsg = '';
    },

    // Color picker
    selectColor(colorName) {
      this.form.color = colorName;
    },

    // Identify disc from photo via Supabase Edge Function → Gemini 1.5 Pro (key stored server-side)
    async identifyDiscFromPhoto() {
      if (!this.photoFile) return;

      this.aiIdentifying = true;
      this.aiIdentifyMsg = '';
      try {
        const { b64, mimeType } = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = e => {
            const dataUrl = e.target.result;
            const comma = dataUrl.indexOf(',');
            resolve({ b64: dataUrl.slice(comma + 1), mimeType: dataUrl.slice(5, dataUrl.indexOf(';')) });
          };
          reader.onerror = reject;
          reader.readAsDataURL(this.photoFile);
        });

        // Call Edge Function — use raw fetch (no auth needed, works even if Supabase client is unavailable)
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/identify-disc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON },
          body: JSON.stringify({ imageBase64: b64, mimeType }),
        });
        if (!resp.ok && resp.status !== 200) throw new Error(`Server error ${resp.status}`);
        const data = await resp.json();
        if (data?.error) throw new Error(data.error);

        const result = data;
        // Apply flight numbers from AI (only fills empty fields)
        const applyFlightNumbers = (src) => {
          if (src?.speed != null && !this.form.speed) this.form.speed = String(src.speed);
          if (src?.glide != null && !this.form.glide) this.form.glide = String(src.glide);
          if (src?.turn  != null && !this.form.turn)  this.form.turn  = String(src.turn);
          if (src?.fade  != null && !this.form.fade)  this.form.fade  = String(src.fade);
        };

        if (!result?.name && !result?.brand) {
          this.aiIdentifyMsg = '❓ Could not read disc — try a top-down photo with good lighting';
          return;
        }

        const catalog = await loadCatalog();
        const best = findBestCatalogMatch(catalog, result.name, result.brand);
        if (best) {
          this.selectDiscFromCatalog(best);
          applyFlightNumbers(result); // AI-recalled numbers fill any gaps catalog left
          this.aiIdentifyMsg = `✅ ${best.name} by ${best.brand}`;
        } else {
          // No catalog match — use everything Gemini returned
          if (result.name)  this.form.name = result.name;
          if (result.brand) this.form.manufacturer = result.brand;
          if (['putter', 'midrange', 'fairway', 'distance'].includes(result.type)) this.form.type = result.type;
          applyFlightNumbers(result);
          const flightStr = [result.speed, result.glide, result.turn, result.fade].some(v => v != null)
            ? ` · ${result.speed ?? '?'}/${result.glide ?? '?'}/${result.turn ?? '?'}/${result.fade ?? '?'}` : '';
          this.aiIdentifyMsg = `✅ ${result.name || result.brand}${result.brand && result.name ? ' by ' + result.brand : ''}${flightStr}`;
        }
      } catch (err) {
        this.aiIdentifyMsg = `❌ ${err.message || 'AI identification failed'}`;
      } finally {
        this.aiIdentifying = false;
      }
    },

    colorSlug(name) {
      return name ? name.toLowerCase().replace(/\s+/g, '-') : '';
    },

    // Disc catalog autocomplete
    searchDiscCatalogDebounced(query) {
      if (this._discTimer) { clearTimeout(this._discTimer); this._discTimer = null; }
      if (!query || query.length < 2) { this.discSuggestions = []; return; }
      this._discTimer = setTimeout(() => this.searchDiscCatalog(query), 300);
    },

    async searchDiscCatalog(query) {
      if (!query || query.length < 2) { this.discSuggestions = []; return; }
      this.discSuggestionsLoading = true;
      try {
        const catalog = await loadCatalog();
        this.discSuggestions = searchDiscs(catalog, query).slice(0, 8);
      } catch {
        this.discSuggestions = [];
      } finally {
        this.discSuggestionsLoading = false;
      }
    },

    selectDiscFromCatalog(disc) {
      this.form.name         = disc.name;
      this.form.manufacturer = disc.brand || this.form.manufacturer;
      this.form.type         = disc.type  || this.form.type;
      if (disc.speed != null) this.form.speed = disc.speed;
      if (disc.glide != null) this.form.glide = disc.glide;
      if (disc.turn  != null) this.form.turn  = disc.turn;
      if (disc.fade  != null) this.form.fade  = disc.fade;
      this.discSuggestions = [];
      this.formInvalid.name = false;
      this.formInvalid.type = false;
    },

    // Type/condition helpers
    typeLabel(type) { return TYPE_LABELS[type] || type || ''; },
    condLabel(cond) { return COND_LABELS[cond] || cond || ''; },
    safeType(type) { return VALID_TYPES.has(type) ? type : 'putter'; },
    safeCond(cond) { return VALID_CONDS.has(cond) ? cond : 'good'; },

    // Flight number helpers
    stabilityLabel(turn, fade) {
      const s = (Number(turn) || 0) + (Number(fade) || 0);
      if (s >= 4)  return 'Very Overstable';
      if (s >= 2)  return 'Overstable';
      if (s >= 0)  return 'Stable';
      if (s >= -2) return 'Understable';
      return 'Very Understable';
    },
    formatTurn(n) { return n > 0 ? '+' + n : String(n); },
    hasFlightNumbers(disc) {
      return disc.speed !== '' && disc.speed != null;
    },

    // Export
    exportBag() {
      const json = JSON.stringify(this.discs, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'my-disc-bag.json';
      a.click();
      URL.revokeObjectURL(url);
      showToast('⬇ Bag exported!');
    },

    // Import
    async importBag(event) {
      const file = event.target.files[0];
      if (!file) return;
      event.target.value = '';

      let imported;
      try {
        const text = await file.text();
        imported = JSON.parse(text);
        if (!Array.isArray(imported)) throw new Error('Not an array');
      } catch {
        showToast('❌ Invalid file');
        return;
      }

      const valid = imported.filter(d => d.id && d.name);
      if (!valid.length) { showToast('❌ No valid discs found'); return; }

      const sb = getSupabase();
      const existingIds = new Set(this.discs.map(d => d.id));
      let count = 0;

      for (const raw of valid) {
        // Backward compat: parse legacy "12 / 5 / -1 / 3" flight strings
        let disc = { ...raw, added: raw.added || Date.now() };
        if ((disc.speed == null || disc.speed === '') && disc.flight) {
          const parsed = parseFlightString(disc.flight);
          if (parsed) disc = { ...disc, ...parsed };
        }
        try {
          if (sb && this.user && this.user.id !== 'local') {
            if (existingIds.has(disc.id)) {
              const { error } = await sb.from('discs').update(toDbDisc(disc)).eq('id', disc.id);
              if (error) throw error;
              const idx = this.discs.findIndex(x => x.id === disc.id);
              if (idx !== -1) this.discs[idx] = disc;
            } else {
              const { data, error } = await sb
                .from('discs')
                .insert([{ ...toDbDisc(disc), user_id: this.user.id }])
                .select()
                .single();
              if (error) throw error;
              this.discs.push(fromDbDisc(data));
              existingIds.add(disc.id);
            }
          } else {
            if (existingIds.has(disc.id)) {
              const idx = this.discs.findIndex(x => x.id === disc.id);
              if (idx !== -1) this.discs[idx] = disc;
            } else {
              this.discs.push(disc);
              existingIds.add(disc.id);
            }
          }
          count++;
        } catch {
          // skip discs that fail
        }
      }

      this.saveToLocalStorage();
      showToast(`⬆ Imported ${count} disc(s)!`);
    },

    // Toast
    toast(msg) {
      showToast(msg);
    },

    // Photo upload
    triggerPhotoUpload() {
      this.$refs.bagPhotoInput.click();
    },

    handlePhotoSelected(event) {
      const file = event.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        showToast('❌ Photo must be under 5MB');
        event.target.value = '';
        return;
      }
      this.photoFile = file;
      this.photoPreview = URL.createObjectURL(file);
    },

    cancelPhotoUpload() {
      if (this.photoPreview) URL.revokeObjectURL(this.photoPreview);
      this.photoPreview = null;
      this.photoFile = null;
      const inp = document.getElementById('bagPhotoInput');
      if (inp) inp.value = '';
    },

    async uploadDiscPhoto(discId) {
      const targetId = discId || this.formId;
      if (!this.photoFile || !targetId) return;
      const sb = getSupabase();
      if (!sb) { showToast('❌ Not connected to Supabase'); return; }

      const { data: { user } } = await sb.auth.getUser();
      if (!user) { showToast('❌ Sign in to add photos'); return; }

      this.photoUploading = true;
      try {
        const ext = this.photoFile.name.split('.').pop().toLowerCase() || 'jpg';
        const path = `${user.id}/${targetId}.${ext}`;

        const { error: uploadError } = await sb.storage
          .from('disc-photos')
          .upload(path, this.photoFile, { upsert: true });
        if (uploadError) throw uploadError;

        const TEN_YEARS = 60 * 60 * 24 * 365 * 10;
        const { data: signedData, error: signError } = await sb.storage
          .from('disc-photos')
          .createSignedUrl(path, TEN_YEARS);
        if (signError) throw signError;
        const displayUrl = signedData.signedUrl;

        const { error: updateError } = await sb
          .from('discs')
          .update({ user_photo_url: displayUrl })
          .eq('id', targetId);
        if (updateError) throw updateError;

        const idx = this.discs.findIndex(d => d.id === targetId);
        if (idx !== -1) this.discs[idx] = { ...this.discs[idx], user_photo_url: displayUrl };

        this.cancelPhotoUpload();
        showToast('📸 Photo saved!');
      } catch (err) {
        console.error('Photo upload failed:', err);
        showToast('❌ Upload failed — try again');
      } finally {
        this.photoUploading = false;
      }
    },

    async removeDiscPhoto() {
      if (!this.formId) return;
      const sb = getSupabase();
      if (!sb) return;

      const { data: { user } } = await sb.auth.getUser();

      // Try to delete the file from storage (list user's files for this disc)
      if (user) {
        const prefix = `${user.id}/${this.formId}`;
        const { data: files } = await sb.storage.from('disc-photos').list(user.id, {
          search: this.formId,
        });
        if (files?.length) {
          const toRemove = files
            .filter(f => f.name.startsWith(this.formId))
            .map(f => `${user.id}/${f.name}`);
          if (toRemove.length) await sb.storage.from('disc-photos').remove(toRemove);
        }
      }

      const { error } = await sb
        .from('discs')
        .update({ user_photo_url: null })
        .eq('id', this.formId);

      if (!error) {
        const idx = this.discs.findIndex(d => d.id === this.formId);
        if (idx !== -1) this.discs[idx] = { ...this.discs[idx], user_photo_url: null };
        showToast('🗑 Photo removed');
      }
    },

    // ── Bag Management ───────────────────────────────────────

    async loadBags() {
      const sb = getSupabase();
      if (sb && this.user?.id !== 'local') {
        try {
          const { data, error } = await sb.from('bags').select('*').order('created_at');
          if (error) throw error;
          this.bags = (data || []).map(fromDbBag);
          this.saveBagsToLocalStorage();
          await this.ensureDefaultBags();
          return;
        } catch { /* fall through to localStorage */ }
      }
      this.loadBagsFromLocalStorage();
    },

    loadBagsFromLocalStorage() {
      try {
        const raw = JSON.parse(localStorage.getItem(BAGS_KEY));
        this.bags = Array.isArray(raw) ? raw : [];
      } catch { this.bags = []; }
      this.ensureDefaultBags();
    },

    saveBagsToLocalStorage() {
      try { localStorage.setItem(BAGS_KEY, JSON.stringify(this.bags)); } catch { /* ignore */ }
    },

    async ensureDefaultBags() {
      if (this.bags.length > 0) return;
      const sb = getSupabase();
      for (const name of ['Bag 1', 'Bag 2', 'Bag 3']) {
        const bag = { id: uid(), name, discIds: [], createdAt: Date.now() };
        try {
          if (sb && this.user?.id !== 'local') {
            const { data, error } = await sb.from('bags')
              .insert([{ id: bag.id, name, disc_ids: [], user_id: this.user.id }])
              .select().single();
            if (!error && data) bag.id = data.id;
          }
        } catch { /* use local id */ }
        this.bags.push(bag);
      }
      this.saveBagsToLocalStorage();
    },

    openCreateBagModal() {
      this.bagForm = { id: '', name: '' };
      this.showBagModal = true;
      this.$nextTick(() => { const el = document.getElementById('bagNameInput'); if (el) el.focus(); });
    },

    openEditBagModal(bag) {
      this.bagForm = { id: bag.id, name: bag.name };
      this.showBagModal = true;
      this.$nextTick(() => { const el = document.getElementById('bagNameInput'); if (el) el.focus(); });
    },

    async saveBag() {
      const name = this.bagForm.name.trim();
      if (!name) return;
      const sb = getSupabase();

      if (this.bagForm.id) {
        const bag = this.bags.find(b => b.id === this.bagForm.id);
        if (!bag) return;
        bag.name = name;
        try {
          if (sb && this.user?.id !== 'local') {
            await sb.from('bags').update({ name, updated_at: new Date().toISOString() }).eq('id', bag.id);
          }
        } catch { /* ignore */ }
        this.saveBagsToLocalStorage();
        showToast('✏️ Bag renamed!');
      } else {
        const bag = { id: uid(), name, discIds: [], createdAt: Date.now() };
        try {
          if (sb && this.user?.id !== 'local') {
            const { data, error } = await sb.from('bags')
              .insert([{ id: bag.id, name, disc_ids: [], user_id: this.user.id }])
              .select().single();
            if (!error && data) bag.id = data.id;
          }
        } catch { /* use local id */ }
        this.bags.push(bag);
        this.saveBagsToLocalStorage();
        showToast('✅ Bag created!');
      }
      this.showBagModal = false;
    },

    openDeleteBagModal(bag) {
      this.pendingDeleteBag = bag;
      this.showDeleteBagModal = true;
    },

    async confirmDeleteBag() {
      if (!this.pendingDeleteBag) return;
      const bag = this.pendingDeleteBag;
      this.showDeleteBagModal = false;
      this.pendingDeleteBag = null;
      const sb = getSupabase();
      try {
        if (sb && this.user?.id !== 'local') {
          await sb.from('bags').delete().eq('id', bag.id);
          await sb.from('course_pins').delete().eq('bag_id', bag.id);
        }
      } catch { /* ignore */ }
      this.bags = this.bags.filter(b => b.id !== bag.id);
      this.coursePins = this.coursePins.filter(p => p.bagId !== bag.id);
      if (this.activeBagId === bag.id) this.activeBagId = null;
      this.saveBagsToLocalStorage();
      this.savePinsToLocalStorage();
      showToast('🗑 Bag deleted');
    },

    // ── Disc ↔ Bag ───────────────────────────────────────────

    openDiscPicker(bagId) {
      this.discPickerBagId = bagId;
      this.discPickerSearch = '';
      this.showDiscPickerModal = true;
    },

    closeDiscPicker() {
      this.showDiscPickerModal = false;
      this.discPickerBagId = null;
      this.discPickerSearch = '';
    },

    isDiscInBag(bagId, discId) {
      const bag = this.bags.find(b => b.id === bagId);
      return bag ? bag.discIds.includes(discId) : false;
    },

    async toggleDiscInBag(bagId, discId) {
      const bag = this.bags.find(b => b.id === bagId);
      if (!bag) return;
      const idx = bag.discIds.indexOf(discId);
      if (idx === -1) bag.discIds.push(discId);
      else bag.discIds.splice(idx, 1);
      await this._syncBagDiscIds(bag);
    },

    async removeDiscFromBag(bagId, discId) {
      const bag = this.bags.find(b => b.id === bagId);
      if (!bag) return;
      bag.discIds = bag.discIds.filter(id => id !== discId);
      await this._syncBagDiscIds(bag);
      showToast('Disc removed from bag');
    },

    async _syncBagDiscIds(bag) {
      this.saveBagsToLocalStorage();
      const sb = getSupabase();
      if (sb && this.user?.id !== 'local') {
        try {
          await sb.from('bags').update({ disc_ids: bag.discIds, updated_at: new Date().toISOString() }).eq('id', bag.id);
        } catch { /* ignore */ }
      }
    },

    getDiscsForBag(bag) {
      if (!bag) return [];
      return bag.discIds.map(id => this.discs.find(d => d.id === id)).filter(Boolean);
    },

    getBagsForDisc(discId) {
      return this.bags.filter(b => b.discIds.includes(discId));
    },

    // ── Course Pinning ───────────────────────────────────────

    async loadCoursePins() {
      const sb = getSupabase();
      if (sb && this.user?.id !== 'local') {
        try {
          const { data, error } = await sb.from('course_pins').select('*').order('created_at');
          if (error) throw error;
          this.coursePins = (data || []).map(fromDbPin);
          this.savePinsToLocalStorage();
          return;
        } catch { /* fall through */ }
      }
      this.loadPinsFromLocalStorage();
    },

    loadPinsFromLocalStorage() {
      try {
        const raw = JSON.parse(localStorage.getItem(PINS_KEY));
        this.coursePins = Array.isArray(raw) ? raw : [];
      } catch { this.coursePins = []; }
    },

    savePinsToLocalStorage() {
      try { localStorage.setItem(PINS_KEY, JSON.stringify(this.coursePins)); } catch { /* ignore */ }
    },

    openPinModal(pin = null, preselectedBagId = null) {
      if (pin) {
        this.editingPinId = pin.id;
        this.pinForm = { courseQuery: pin.courseName, courseId: pin.courseId || '', courseName: pin.courseName, bagId: pin.bagId };
      } else {
        this.editingPinId = null;
        this.pinForm = { courseQuery: '', courseId: '', courseName: '', bagId: preselectedBagId || (this.bags[0]?.id || '') };
      }
      this.pdgaSuggestions = [];
      this.showPinModal = true;
    },

    closePinModal() {
      this.showPinModal = false;
      this.editingPinId = null;
      this.pdgaSuggestions = [];
      if (this._pdgaTimer) { clearTimeout(this._pdgaTimer); this._pdgaTimer = null; }
    },

    async savePin() {
      const courseName = (this.pinForm.courseName || this.pinForm.courseQuery).trim();
      const bagId = this.pinForm.bagId;
      if (!courseName || !bagId) return;
      const sb = getSupabase();

      if (this.editingPinId) {
        const pin = this.coursePins.find(p => p.id === this.editingPinId);
        if (!pin) return;
        pin.courseName = courseName;
        pin.courseId = this.pinForm.courseId || null;
        pin.bagId = bagId;
        try {
          if (sb && this.user?.id !== 'local') {
            await sb.from('course_pins').update(toDbPin(pin)).eq('id', pin.id);
          }
        } catch { /* ignore */ }
        showToast('📍 Pin updated!');
      } else {
        const pin = { id: uid(), courseName, courseId: this.pinForm.courseId || null, bagId, createdAt: Date.now() };
        try {
          if (sb && this.user?.id !== 'local') {
            const { data, error } = await sb.from('course_pins')
              .insert([{ ...toDbPin(pin), user_id: this.user.id }])
              .select().single();
            if (!error && data) pin.id = data.id;
          }
        } catch { /* use local id */ }
        this.coursePins.push(pin);
        showToast('📍 Course pinned!');
      }
      this.savePinsToLocalStorage();
      this.closePinModal();
    },

    async deletePin(pin) {
      const sb = getSupabase();
      try {
        if (sb && this.user?.id !== 'local') {
          await sb.from('course_pins').delete().eq('id', pin.id);
        }
      } catch { /* ignore */ }
      this.coursePins = this.coursePins.filter(p => p.id !== pin.id);
      this.savePinsToLocalStorage();
      showToast('🗑 Pin removed');
    },

    getBagForPin(pin) {
      return this.bags.find(b => b.id === pin.bagId) || null;
    },

    // ── Course Search (OpenStreetMap Overpass API) ───────────────────────────────────

    searchCoursesDebounced(query) {
      if (this._pdgaTimer) clearTimeout(this._pdgaTimer);
      if (!query || query.length < 2) { this.pdgaSuggestions = []; this.pdgaLoading = false; return; }
      this.pdgaLoading = true;
      this._pdgaTimer = setTimeout(() => this.searchCourses(query), 400);
    },

    // Tries multiple public Overpass mirrors in order; skips 429/504 responses
    async overpassFetch(oql, timeoutMs = 30000) {
      const mirrors = [
        'https://overpass-api.de/api/interpreter',
        'https://overpass.kumi.systems/api/interpreter',
        'https://overpass.openstreetmap.ru/api/interpreter',
      ];
      let lastErr;
      for (const url of mirrors) {
        try {
          const res = await fetch(url, { method: 'POST', body: oql, signal: AbortSignal.timeout(timeoutMs) });
          if (res.status === 429 || res.status === 504) { lastErr = new Error(`HTTP ${res.status}`); continue; }
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) { lastErr = e; }
      }
      throw lastErr;
    },

    mapCourseElement(el) {
      return {
        osmId: el.id,
        osmType: el.type,
        name: el.tags?.name || '',
        holes: el.tags?.holes || el.tags?.['disc_golf:holes'] || '',
        city: el.tags?.['addr:city'] || el.tags?.['addr:municipality'] || el.tags?.['is_in:city'] || '',
        country: el.tags?.['addr:country'] || '',
        lat: el.lat ?? el.center?.lat,
        lon: el.lon ?? el.center?.lon,
      };
    },

    getGoogleMapsUrl(name, lat, lon) {
      if (lat != null && lon != null) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${lat},${lon}`)}`;
      }
      if (name) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`;
      }
      return '';
    },

    getOpenStreetMapUrl(lat, lon) {
      if (lat == null || lon == null) return '';
      return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=16/${lat}/${lon}`;
    },

    getPinMapLinks(pin) {
      const cached = pin?.courseId ? this._courseCache[pin.courseId] : null;
      const lat = cached?.lat;
      const lon = cached?.lon;
      return {
        google: this.getGoogleMapsUrl(pin?.courseName || '', lat, lon),
        osm: this.getOpenStreetMapUrl(lat, lon),
      };
    },

    getDownloadedMapSummary(pin) {
      const data = pin?.courseId ? this._courseCache[pin.courseId]?.mapData : null;
      if (!data) return '';
      const parts = [];
      if (data.holeCount) parts.push(`${data.holeCount} holes`);
      if (data.teeCount) parts.push(`${data.teeCount} tees`);
      if (data.basketCount) parts.push(`${data.basketCount} baskets`);
      if (data.fairwayCount) parts.push(`${data.fairwayCount} fairways`);
      if (!parts.length && data.totalElements) parts.push(`${data.totalElements} map elements`);
      return parts.join(' · ');
    },

    async downloadCourseMap(pin) {
      if (!pin?.courseId) {
        showToast('⚠️ Select a mapped course first to download hole data');
        return;
      }

      const cached = this._courseCache[pin.courseId] || {};
      const lat = cached.lat;
      const lon = cached.lon;
      if (lat == null || lon == null) {
        showToast('⚠️ Missing course coordinates — reselect from suggestions first');
        return;
      }

      showToast(`⏳ Downloading map data for ${pin.courseName}…`);
      this.pdgaLoading = true;
      try {
        const radius = 2500;
        const oql = `[out:json][timeout:25];(node(around:${radius},${lat},${lon})["disc_golf"];way(around:${radius},${lat},${lon})["disc_golf"];relation(around:${radius},${lat},${lon})["disc_golf"];);out center tags;`;
        const data = await this.overpassFetch(oql, 32000);
        const elements = (data.elements || []);
        const byType = (name) => elements.filter(el => (el.tags?.disc_golf || '').toLowerCase() === name).length;
        cached.mapData = {
          downloadedAt: Date.now(),
          totalElements: elements.length,
          holeCount: byType('hole'),
          teeCount: byType('tee'),
          basketCount: byType('basket'),
          fairwayCount: byType('fairway'),
          elements: elements.map(el => ({
            id: `${el.type}:${el.id}`,
            type: el.type,
            discGolf: el.tags?.disc_golf || '',
            ref: el.tags?.ref || '',
            name: el.tags?.name || '',
            lat: el.lat ?? el.center?.lat ?? null,
            lon: el.lon ?? el.center?.lon ?? null,
          })),
        };
        this._courseCache[pin.courseId] = cached;
        try { localStorage.setItem('proispro_course_cache', JSON.stringify(this._courseCache)); } catch {}
        showToast(`⬇ Downloaded ${cached.mapData.totalElements} map elements for ${pin.courseName}`);
      } catch {
        showToast('⚠️ Could not download course map data right now');
      } finally {
        this.pdgaLoading = false;
      }
    },

    async searchCourses(query) {
      try {
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const oql = `[out:json][timeout:10];(node["leisure"="disc_golf_course"]["name"~"${escaped}",i];way["leisure"="disc_golf_course"]["name"~"${escaped}",i];relation["leisure"="disc_golf_course"]["name"~"${escaped}",i];);out center 10;`;
        const data = await this.overpassFetch(oql, 12000);
        this.pdgaSuggestions = (data.elements || []).slice(0, 8).map(el => this.mapCourseElement(el));
      } catch {
        this.pdgaSuggestions = [];
      } finally {
        this.pdgaLoading = false;
      }
    },

    async loadNorwayCourses() {
      this.pdgaLoading = true;
      showToast('⏳ Loading Norway courses…');
      try {
        const oql = `[out:json][timeout:30][bbox:57.7,4.5,71.2,31.2];area["ISO3166-1"="NO"][admin_level=2]->.norway;(node["leisure"="disc_golf_course"](area.norway);way["leisure"="disc_golf_course"](area.norway);relation["leisure"="disc_golf_course"](area.norway););out center;`;
        const data = await this.overpassFetch(oql, 40000);
        this.pdgaSuggestions = (data.elements || [])
          .map(el => this.mapCourseElement(el))
          .filter(c => c.name)
          .sort((a, b) => a.name.localeCompare(b.name, 'nb'));
        showToast(`🗺 Loaded ${this.pdgaSuggestions.length} Norwegian courses`);
      } catch {
        this.pdgaSuggestions = [];
        showToast('⚠️ Could not load Norway courses — try again or search manually');
      } finally {
        this.pdgaLoading = false;
      }
    },

    // ── Collections ──────────────────────────────────────────────
    async loadCollections() {
      const sb = getSupabase();
      if (sb && this.user?.id !== 'local') {
        try {
          const { data, error } = await sb.from('collections').select('*').order('created_at');
          if (error) throw error;
          this.collections = (data || []);
          const { data: cds } = await sb.from('collection_discs').select('*');
          this._collectionDiscs = cds || [];
          return;
        } catch { /* fall through */ }
      }
      this.collections = [];
      this._collectionDiscs = [];
    },

    isDiscInCollection(collectionId, discId) {
      return (this._collectionDiscs || []).some(cd => cd.collection_id === collectionId && cd.disc_id === discId);
    },

    getDiscsForCollection(collection) {
      const cds = (this._collectionDiscs || []).filter(cd => cd.collection_id === collection.id);
      return cds.map(cd => this.discs.find(d => d.id === cd.disc_id)).filter(Boolean);
    },

    openCreateCollectionModal() {
      this.collectionForm = { id: '', name: '', description: '' };
      this.showCollectionModal = true;
      this.$nextTick(() => { const el = document.getElementById('collectionNameInput'); if (el) el.focus(); });
    },

    openEditCollectionModal(collection) {
      this.collectionForm = { id: collection.id, name: collection.name, description: collection.description || '' };
      this.showCollectionModal = true;
      this.$nextTick(() => { const el = document.getElementById('collectionNameInput'); if (el) el.focus(); });
    },

    async saveCollection() {
      const name = this.collectionForm.name.trim();
      if (!name) return;
      const sb = getSupabase();
      const now = new Date().toISOString();
      if (this.collectionForm.id) {
        const idx = this.collections.findIndex(c => c.id === this.collectionForm.id);
        if (idx !== -1) {
          this.collections[idx] = { ...this.collections[idx], name, description: this.collectionForm.description, updated_at: now };
          try {
            if (sb && this.user?.id !== 'local') {
              await sb.from('collections').update({ name, description: this.collectionForm.description, updated_at: now }).eq('id', this.collectionForm.id);
            }
          } catch { /* ignore */ }
        }
        showToast('✏️ Collection updated!');
      } else {
        const newColl = { id: uid(), user_id: this.user.id, name, description: this.collectionForm.description, created_at: now, updated_at: now };
        try {
          if (sb && this.user?.id !== 'local') {
            const { data, error } = await sb.from('collections').insert([{ name, description: this.collectionForm.description, user_id: this.user.id }]).select().single();
            if (!error && data) newColl.id = data.id;
          }
        } catch { /* use local id */ }
        this.collections.push(newColl);
        showToast('✅ Collection created!');
      }
      this.showCollectionModal = false;
    },

    openDeleteCollectionModal(collection) {
      this.pendingDeleteCollection = collection;
      this.showDeleteCollectionModal = true;
    },

    async confirmDeleteCollection() {
      if (!this.pendingDeleteCollection) return;
      const id = this.pendingDeleteCollection.id;
      this.showDeleteCollectionModal = false;
      this.pendingDeleteCollection = null;
      const sb = getSupabase();
      try {
        if (sb && this.user?.id !== 'local') {
          await sb.from('collections').delete().eq('id', id);
        }
      } catch { /* ignore */ }
      this.collections = this.collections.filter(c => c.id !== id);
      this._collectionDiscs = (this._collectionDiscs || []).filter(cd => cd.collection_id !== id);
      if (this.activeCollectionId === id) this.activeCollectionId = null;
      showToast('🗑 Collection deleted');
    },

    openDiscCollectionPicker(collectionId) {
      this.discCollectionPickerCollectionId = collectionId;
      this.discCollectionPickerSearch = '';
      this.showDiscCollectionPickerModal = true;
    },

    async toggleDiscInCollection(collectionId, discId) {
      const sb = getSupabase();
      const already = this.isDiscInCollection(collectionId, discId);
      if (already) {
        this._collectionDiscs = (this._collectionDiscs || []).filter(cd => !(cd.collection_id === collectionId && cd.disc_id === discId));
        try {
          if (sb && this.user?.id !== 'local') {
            await sb.from('collection_discs').delete().eq('collection_id', collectionId).eq('disc_id', discId);
          }
        } catch { /* ignore */ }
      } else {
        const entry = { collection_id: collectionId, disc_id: discId, sort_order: 0, added_at: new Date().toISOString() };
        if (!this._collectionDiscs) this._collectionDiscs = [];
        this._collectionDiscs.push(entry);
        try {
          if (sb && this.user?.id !== 'local') {
            await sb.from('collection_discs').insert([{ collection_id: collectionId, disc_id: discId }]);
          }
        } catch { /* ignore */ }
      }
    },

    // ── Wishlist ──────────────────────────────────────────────────
    async loadWishlist() {
      const sb = getSupabase();
      if (sb && this.user?.id !== 'local') {
        try {
          const { data, error } = await sb.from('wishlist_items').select('*').order('created_at', { ascending: false });
          if (error) throw error;
          this.wishlistItems = data || [];
          return;
        } catch { /* fall through */ }
      }
      this.wishlistItems = [];
    },

    openAddWishlistModal() {
      this.wishlistForm = { id: '', disc_name: '', manufacturer: '', plastic_pref: '', weight_min: '', weight_max: '', priority: 0, notes: '' };
      this.showWishlistModal = true;
      this.$nextTick(() => { const el = document.getElementById('wishlistDiscName'); if (el) el.focus(); });
    },

    openEditWishlistModal(item) {
      this.wishlistForm = {
        id: item.id, disc_name: item.disc_name, manufacturer: item.manufacturer || '',
        plastic_pref: item.plastic_pref || '', weight_min: item.weight_min || '',
        weight_max: item.weight_max || '', priority: item.priority || 0, notes: item.notes || ''
      };
      this.showWishlistModal = true;
    },

    async saveWishlistItem() {
      const disc_name = this.wishlistForm.disc_name.trim();
      if (!disc_name) return;
      const sb = getSupabase();
      const payload = {
        disc_name,
        manufacturer: this.wishlistForm.manufacturer.trim() || null,
        plastic_pref: this.wishlistForm.plastic_pref.trim() || null,
        weight_min: this.wishlistForm.weight_min ? Number(this.wishlistForm.weight_min) : null,
        weight_max: this.wishlistForm.weight_max ? Number(this.wishlistForm.weight_max) : null,
        priority: Number(this.wishlistForm.priority) || 0,
        notes: this.wishlistForm.notes.trim() || null,
      };
      if (this.wishlistForm.id) {
        const idx = this.wishlistItems.findIndex(i => i.id === this.wishlistForm.id);
        if (idx !== -1) this.wishlistItems[idx] = { ...this.wishlistItems[idx], ...payload, updated_at: new Date().toISOString() };
        try {
          if (sb && this.user?.id !== 'local') {
            await sb.from('wishlist_items').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', this.wishlistForm.id);
          }
        } catch { /* ignore */ }
        showToast('✏️ Wishlist updated!');
      } else {
        const newItem = { id: uid(), user_id: this.user.id, ...payload, acquired: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
        try {
          if (sb && this.user?.id !== 'local') {
            const { data, error } = await sb.from('wishlist_items').insert([{ ...payload, user_id: this.user.id }]).select().single();
            if (!error && data) { Object.assign(newItem, data); }
          }
        } catch { /* use local */ }
        this.wishlistItems.unshift(newItem);
        showToast('✅ Added to wishlist!');
      }
      this.showWishlistModal = false;
    },

    async toggleWishlistAcquired(item) {
      const sb = getSupabase();
      const acquired = !item.acquired;
      const idx = this.wishlistItems.findIndex(i => i.id === item.id);
      if (idx !== -1) this.wishlistItems[idx] = { ...this.wishlistItems[idx], acquired };
      try {
        if (sb && this.user?.id !== 'local') {
          await sb.from('wishlist_items').update({ acquired, updated_at: new Date().toISOString() }).eq('id', item.id);
        }
      } catch { /* ignore */ }
      showToast(acquired ? '✅ Marked as acquired!' : '⬅ Moved back to wishlist');
    },

    openDeleteWishlistModal(item) {
      this.pendingDeleteWishlistItem = item;
      this.showDeleteWishlistModal = true;
    },

    async confirmDeleteWishlistItem() {
      if (!this.pendingDeleteWishlistItem) return;
      const id = this.pendingDeleteWishlistItem.id;
      this.showDeleteWishlistModal = false;
      this.pendingDeleteWishlistItem = null;
      const sb = getSupabase();
      try {
        if (sb && this.user?.id !== 'local') {
          await sb.from('wishlist_items').delete().eq('id', id);
        }
      } catch { /* ignore */ }
      this.wishlistItems = this.wishlistItems.filter(i => i.id !== id);
      showToast('🗑 Removed from wishlist');
    },

    // ── For Sale ──────────────────────────────────────────────────
    async loadForSaleListings() {
      const sb = getSupabase();
      if (sb && this.user?.id !== 'local') {
        try {
          const { data, error } = await sb.from('forsale_listings').select('*').order('listed_at', { ascending: false });
          if (error) throw error;
          this.forsaleListings = data || [];
          return;
        } catch { /* fall through */ }
      }
      this.forsaleListings = [];
    },

    async loadSaleToken() {
      const sb = getSupabase();
      if (!sb || this.user?.id === 'local') return;
      try {
        const { data } = await sb.from('sale_tokens').select('token, is_public').eq('user_id', this.user.id).maybeSingle();
        if (data) {
          this.saleToken = data.token;
          this.saleIsPublic = data.is_public;
        }
      } catch { /* no token yet */ }
    },

    async ensureSaleToken() {
      const sb = getSupabase();
      if (!sb || this.user?.id === 'local') return null;
      if (this.saleToken) return this.saleToken;
      try {
        const { data, error } = await sb
          .from('sale_tokens')
          .upsert([{ user_id: this.user.id }], { onConflict: 'user_id' })
          .select('token, is_public')
          .single();
        if (!error && data) {
          this.saleToken = data.token;
          this.saleIsPublic = data.is_public;
        }
      } catch { /* ignore */ }
      return this.saleToken;
    },

    async copyPublicLink() {
      await this.ensureSaleToken();
      if (!this.saleToken) { showToast('⚠️ Sign in to get a shareable link'); return; }
      const url = this.publicSaleUrl;
      try {
        await navigator.clipboard.writeText(url);
        showToast('🔗 Link copied!');
      } catch {
        prompt('Copy this link:', url);
      }
    },

    async toggleSalePublic() {
      const sb = getSupabase();
      if (!sb || this.user?.id === 'local') return;
      await this.ensureSaleToken();
      const newVal = !this.saleIsPublic;
      try {
        await sb.from('sale_tokens').update({ is_public: newVal }).eq('user_id', this.user.id);
        this.saleIsPublic = newVal;
        showToast(newVal ? '🌐 Sale list is now public' : '🔒 Sale list is now private');
      } catch { /* ignore */ }
    },

    async addDiscToSale(disc) {
      const alreadyListed = this.forsaleListings.some(l => l.disc_id === disc.id && l.status === 'available');
      if (alreadyListed) { showToast('ℹ️ Already listed for sale'); return; }
      await this.ensureSaleToken();
      const sb = getSupabase();
      const payload = {
        disc_id: disc.id,
        disc_name: disc.name || null,
        disc_manufacturer: disc.manufacturer || null,
        disc_type: disc.type || null,
        disc_plastic: disc.plastic || null,
        disc_color: disc.color || null,
        disc_weight: disc.weight || null,
        disc_condition: disc.condition || null,
        status: 'available',
      };
      const newListing = { id: uid(), user_id: this.user.id, ...payload, listed_at: new Date().toISOString() };
      try {
        if (sb && this.user?.id !== 'local') {
          const { data, error } = await sb.from('forsale_listings').insert([{ ...payload, user_id: this.user.id }]).select().single();
          if (!error && data) Object.assign(newListing, data);
        }
      } catch { /* use local */ }
      this.forsaleListings.unshift(newListing);
      showToast('🏷 Added to sale list!');
    },

    openListForSaleModal(disc) {
      this.forsaleForm = { id: '', disc_id: disc ? disc.id : '' };
      this.forsaleDiscSearch = '';
      this.showForSaleModal = true;
    },

    openEditForSaleModal(listing) {
      this.forsaleForm = { id: listing.id, disc_id: listing.disc_id };
      this.showForSaleModal = true;
    },

    async saveForSaleListing() {
      if (!this.forsaleForm.disc_id) { showToast('❌ Select a disc to sell'); return; }
      const disc = this.discs.find(d => d.id === this.forsaleForm.disc_id);
      await this.ensureSaleToken();
      const sb = getSupabase();
      const discFields = {
        disc_name: disc?.name || null,
        disc_manufacturer: disc?.manufacturer || null,
        disc_type: disc?.type || null,
        disc_plastic: disc?.plastic || null,
        disc_color: disc?.color || null,
        disc_weight: disc?.weight || null,
        disc_condition: disc?.condition || null,
      };
      if (this.forsaleForm.id) {
        const idx = this.forsaleListings.findIndex(l => l.id === this.forsaleForm.id);
        if (idx !== -1) this.forsaleListings[idx] = { ...this.forsaleListings[idx], ...discFields };
        try {
          if (sb && this.user?.id !== 'local') await sb.from('forsale_listings').update(discFields).eq('id', this.forsaleForm.id);
        } catch { /* ignore */ }
        showToast('✏️ Listing updated!');
      } else {
        const payload = { disc_id: this.forsaleForm.disc_id, ...discFields, status: 'available' };
        const newListing = { id: uid(), user_id: this.user.id, ...payload, listed_at: new Date().toISOString() };
        try {
          if (sb && this.user?.id !== 'local') {
            const { data, error } = await sb.from('forsale_listings').insert([{ ...payload, user_id: this.user.id }]).select().single();
            if (!error && data) Object.assign(newListing, data);
          }
        } catch { /* use local */ }
        this.forsaleListings.unshift(newListing);
        showToast('🏷 Listed for sale!');
      }
      this.showForSaleModal = false;
    },

    async updateForSaleStatus(listing, newStatus) {
      const sb = getSupabase();
      const idx = this.forsaleListings.findIndex(l => l.id === listing.id);
      const upd = { status: newStatus };
      if (idx !== -1) this.forsaleListings[idx] = { ...this.forsaleListings[idx], ...upd };
      try {
        if (sb && this.user?.id !== 'local') await sb.from('forsale_listings').update(upd).eq('id', listing.id);
      } catch { /* ignore */ }
      showToast(newStatus === 'sold' ? '✅ Marked as sold!' : '↩ Relisted');
    },

    openDeleteForSaleModal(listing) {
      this.pendingDeleteForSale = listing;
      this.showDeleteForSaleModal = true;
    },

    async confirmDeleteForSale() {
      if (!this.pendingDeleteForSale) return;
      const id = this.pendingDeleteForSale.id;
      this.showDeleteForSaleModal = false;
      this.pendingDeleteForSale = null;
      const sb = getSupabase();
      try {
        if (sb && this.user?.id !== 'local') await sb.from('forsale_listings').delete().eq('id', id);
      } catch { /* ignore */ }
      this.forsaleListings = this.forsaleListings.filter(l => l.id !== id);
      showToast('🗑 Listing removed');
    },

    getDiscForListing(listing) {
      const live = this.discs.find(d => d.id === listing.disc_id);
      if (live) return live;
      if (listing.disc_name) return {
        name: listing.disc_name, manufacturer: listing.disc_manufacturer,
        type: listing.disc_type, plastic: listing.disc_plastic,
        color: listing.disc_color, weight: listing.disc_weight, condition: listing.disc_condition,
      };
      return null;
    },

    selectCourse(course) {
      const courseId = `osm:${course.osmType}:${course.osmId}`;
      this.pinForm.courseId = courseId;
      this.pinForm.courseName = course.name;
      this.pinForm.courseQuery = course.name;
      this.pdgaSuggestions = [];
      // Cache OSM metadata locally for future hole-planning feature
      this._courseCache[courseId] = { holes: course.holes, city: course.city, country: course.country, lat: course.lat, lon: course.lon };
      try { localStorage.setItem('proispro_course_cache', JSON.stringify(this._courseCache)); } catch {}
    },
  };
}
