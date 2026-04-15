/* ── ProIsPro – Disc Inventory App ─────────────────────────── */
/* Supabase + Alpine.js rewrite                                 */

// ── Supabase Config ─────────────────────────────────────────
const SUPABASE_URL  = 'https://odqhusmmqgipvazusrxs.supabase.co';
const SUPABASE_ANON = 'sb_publishable_p0KpjMepMloZb6SI-y6ang_2uzbdQ9U';

const STORAGE_KEY = 'proispro_discs';

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
    notes: disc.notes || null,
    added_at: disc.added ? new Date(disc.added).toISOString() : new Date().toISOString(),
  };
}

function fromDbDisc(d) {
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
    notes: d.notes || '',
    added: d.added_at ? new Date(d.added_at).getTime() : Date.now(),
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
    form: { name: '', manufacturer: '', type: '', plastic: '', weight: '', color: '', condition: 'good', flight: '', notes: '' },
    formId: '',
    formInvalid: { name: false, type: false },

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

    // Lifecycle
    async init() {
      const sb = getSupabase();
      if (sb) {
        sb.auth.onAuthStateChange((_event, session) => {
          this.user = session?.user || null;
          if (this.user) {
            this.loadDiscs();
          } else {
            this.discs = [];
            this.loading = false;
          }
        });
        await this.checkAuth();
      } else {
        // No Supabase configured — localStorage-only mode
        this.user = { id: 'local', email: 'local' };
        this.loadFromLocalStorage();
        this.loading = false;
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
        }
      } catch {
        this.loadFromLocalStorage();
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
        this.discs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
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
        flight: this.form.flight.trim(),
        notes: this.form.notes.trim(),
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
      this.form = { name: '', manufacturer: '', type: '', plastic: '', weight: '', color: '', condition: 'good', flight: '', notes: '' };
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
        flight: disc.flight || '',
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
      this.formInvalid = { name: false, type: false };
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
        const disc = { ...raw, added: raw.added || Date.now() };
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
  };
}
