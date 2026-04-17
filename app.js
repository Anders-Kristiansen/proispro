/* ── ProIsPro – Disc Inventory App ─────────────────────────── */
/* Supabase + Alpine.js rewrite                                 */

// ── Supabase Config ─────────────────────────────────────────
const SUPABASE_URL  = 'https://odqhusmmqgipvazusrxs.supabase.co';
const SUPABASE_ANON = 'sb_publishable_p0KpjMepMloZb6SI-y6ang_2uzbdQ9U';

const STORAGE_KEY = 'proispro_discs';
const BAGS_KEY    = 'proispro_bags';
const PINS_KEY    = 'proispro_course_pins';

// ── Supabase Client ─────────────────────────────────────────
let _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON === 'YOUR_SUPABASE_ANON_KEY') return null;
  try {
    _supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
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
    user_photo_url: d.user_photo_url || null,
    added: d.added_at ? new Date(d.added_at).getTime() : Date.now(),
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
    sortBy: 'name',
    showAddModal: false,
    showDeleteModal: false,
    editingDisc: null,
    pendingDeleteDisc: null,
    form: { name: '', manufacturer: '', type: '', plastic: '', weight: '', color: '', condition: 'good', speed: '', glide: '', turn: '', fade: '', notes: '' },
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

    // Computed
    get filteredSorted() {
      const q = this.search.toLowerCase().trim();
      const type = this.filterType;
      const sort = this.sortBy;

      let list = this.discs.filter(d => {
        const matchQ = !q ||
          (d.name || '').toLowerCase().includes(q) ||
          (d.manufacturer || '').toLowerCase().includes(q) ||
          (d.plastic || '').toLowerCase().includes(q) ||
          (d.color || '').toLowerCase().includes(q) ||
          (d.notes || '').toLowerCase().includes(q);
        const matchT = !type || d.type === type;
        return matchQ && matchT;
      });

      list.sort((a, b) => {
        if (sort === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sort === 'type') return (a.type || '').localeCompare(b.type || '');
        if (sort === 'weight') return (Number(a.weight) || 0) - (Number(b.weight) || 0);
        if (sort === 'added') return (b.added || 0) - (a.added || 0);
        return 0;
      });

      return list;
    },

    get discCount() {
      const n = this.filteredSorted.length;
      return `${n} disc${n !== 1 ? 's' : ''}`;
    },

    get discPickerFiltered() {
      const q = this.discPickerSearch.toLowerCase().trim();
      if (!q) return this.discs;
      return this.discs.filter(d =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.manufacturer || '').toLowerCase().includes(q)
      );
    },

    // Lifecycle
    async init() {
      const sb = getSupabase();
      if (sb) {
        sb.auth.onAuthStateChange((_event, session) => {
          this.user = session?.user || null;
          if (this.user) {
            this.loadDiscs();
            this.loadBags();
            this.loadCoursePins();
          } else {
            this.discs = [];
            this.bags = [];
            this.coursePins = [];
            this.loading = false;
          }
        });
        await this.checkAuth();
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
        }
      } catch {
        this.loadFromLocalStorage();
        this.loadBagsFromLocalStorage();
        this.loadPinsFromLocalStorage();
      }
      this.loading = false;
    },

    async signIn() {
      const sb = getSupabase();
      if (!sb) {
        showToast('⚠️ Supabase not configured');
        return;
      }
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'github',
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
      this.form = { name: '', manufacturer: '', type: '', plastic: '', weight: '', color: '', condition: 'good', speed: '', glide: '', turn: '', fade: '', notes: '' };
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
      this.formInvalid = { name: false, type: false };
      if (this.photoPreview) URL.revokeObjectURL(this.photoPreview);
      this.photoPreview = null;
      this.photoFile = null;
      this.pdgaSuggestions = [];
      if (this._pdgaTimer) { clearTimeout(this._pdgaTimer); this._pdgaTimer = null; }
    },

    // Color picker
    selectColor(colorName) {
      this.form.color = colorName;
    },

    colorSlug(name) {
      return name ? name.toLowerCase().replace(/\s+/g, '-') : '';
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

    async uploadDiscPhoto() {
      if (!this.photoFile || !this.formId) return;
      const sb = getSupabase();
      if (!sb) { showToast('❌ Not connected to Supabase'); return; }

      const { data: { user } } = await sb.auth.getUser();
      if (!user) { showToast('❌ Sign in to add photos'); return; }

      this.photoUploading = true;
      try {
        const ext = this.photoFile.name.split('.').pop().toLowerCase() || 'jpg';
        const path = `${user.id}/${this.formId}.${ext}`;

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
          .eq('id', this.formId);
        if (updateError) throw updateError;

        const idx = this.discs.findIndex(d => d.id === this.formId);
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

    async searchCourses(query) {
      try {
        // Escape regex special chars for Overpass QL name filter (supports åæø natively)
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const oql = `[out:json][timeout:10];(node["leisure"="disc_golf_course"]["name"~"${escaped}",i];way["leisure"="disc_golf_course"]["name"~"${escaped}",i];relation["leisure"="disc_golf_course"]["name"~"${escaped}",i];);out center 10;`;
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: oql,
          signal: AbortSignal.timeout(9000),
        });
        if (!res.ok) throw new Error('overpass-unavailable');
        const data = await res.json();
        this.pdgaSuggestions = (data.elements || []).slice(0, 8).map(el => this.mapCourseElement(el));
      } catch {
        this.pdgaSuggestions = [];
      } finally {
        this.pdgaLoading = false;
      }
    },

    async loadNorwayCourses() {
      this.pdgaLoading = true;
      try {
        const oql = `[out:json][timeout:25];area["ISO3166-1"="NO"][admin_level=2]->.norway;(node["leisure"="disc_golf_course"](area.norway);way["leisure"="disc_golf_course"](area.norway);relation["leisure"="disc_golf_course"](area.norway););out center 400;`;
        const res = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: oql,
          signal: AbortSignal.timeout(20000),
        });
        if (!res.ok) throw new Error('overpass-unavailable');
        const data = await res.json();
        this.pdgaSuggestions = (data.elements || [])
          .map(el => this.mapCourseElement(el))
          .filter(c => c.name)
          .sort((a, b) => a.name.localeCompare(b.name, 'nb'))
          .slice(0, 100);
        showToast(`🗺 Loaded ${this.pdgaSuggestions.length} course suggestions from Norway`);
      } catch {
        this.pdgaSuggestions = [];
        showToast('⚠️ Could not load Norway courses right now');
      } finally {
        this.pdgaLoading = false;
      }
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
