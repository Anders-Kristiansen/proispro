/* ── ProIsPro – Disc Inventory App ─────────────────────────── */

const STORAGE_KEY = 'proispro_discs';

// ── State ───────────────────────────────────────────────────
let discs = load();
let pendingDeleteId = null;

// ── DOM refs ────────────────────────────────────────────────
const grid         = document.getElementById('discGrid');
const emptyState   = document.getElementById('emptyState');
const discCount    = document.getElementById('discCount');
const searchInput  = document.getElementById('searchInput');
const filterType   = document.getElementById('filterType');
const sortBy       = document.getElementById('sortBy');

const modalOverlay = document.getElementById('modalOverlay');
const modalTitle   = document.getElementById('modalTitle');
const discForm     = document.getElementById('discForm');
const discIdField  = document.getElementById('discId');

const deleteOverlay  = document.getElementById('deleteOverlay');
const deleteMessage  = document.getElementById('deleteMessage');
const confirmDeleteBtn = document.getElementById('confirmDelete');

// ── Helpers ─────────────────────────────────────────────────
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(discs));
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── Toast ───────────────────────────────────────────────────
let toastEl = null;
let toastTimer = null;

function toast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2400);
}

// ── Render ──────────────────────────────────────────────────
const TYPE_LABELS = { putter: 'Putter', midrange: 'Midrange', fairway: 'Fairway Driver', distance: 'Distance Driver' };
const COND_LABELS = { new: 'Mint', good: 'Good', used: 'Used', beat: 'Beat-in' };

const VALID_TYPES = new Set(['putter', 'midrange', 'fairway', 'distance']);
const VALID_CONDS = new Set(['new', 'good', 'used', 'beat']);

function filteredSorted() {
  const q    = searchInput.value.toLowerCase().trim();
  const type = filterType.value;
  const sort = sortBy.value;

  let list = discs.filter(d => {
    const matchQ = !q ||
      (d.name         || '').toLowerCase().includes(q) ||
      (d.manufacturer || '').toLowerCase().includes(q) ||
      (d.plastic      || '').toLowerCase().includes(q) ||
      (d.color        || '').toLowerCase().includes(q) ||
      (d.notes        || '').toLowerCase().includes(q);
    const matchT = !type || d.type === type;
    return matchQ && matchT;
  });

  list.sort((a, b) => {
    if (sort === 'name')    return (a.name || '').localeCompare(b.name || '');
    if (sort === 'type')    return (a.type || '').localeCompare(b.type || '');
    if (sort === 'weight')  return (Number(a.weight) || 0) - (Number(b.weight) || 0);
    if (sort === 'added')   return (b.added || 0) - (a.added || 0);
    return 0;
  });

  return list;
}

function render() {
  const list = filteredSorted();

  // remove existing cards (but not the empty-state div)
  Array.from(grid.children).forEach(el => {
    if (!el.classList.contains('empty-state')) el.remove();
  });

  if (list.length === 0) {
    emptyState.classList.remove('hidden');
    discCount.textContent = `0 discs`;
    return;
  }
  emptyState.classList.add('hidden');
  discCount.textContent = `${list.length} disc${list.length !== 1 ? 's' : ''}`;

  list.forEach(d => {
    const card = document.createElement('div');
    card.className = 'disc-card';
    card.dataset.id = d.id;

    const safeCondition = VALID_CONDS.has(d.condition) ? d.condition : 'good';
    const safeType      = VALID_TYPES.has(d.type)      ? d.type      : 'putter';

    const condDot = `<span class="condition-dot cond-${safeCondition}" title="${escHtml(COND_LABELS[safeCondition] || safeCondition)}"></span>`;
    const details = [
      d.weight   ? `⚖️ ${escHtml(d.weight)}g` : '',
      d.plastic  ? `🧪 ${escHtml(d.plastic)}` : '',
      d.color    ? `🎨 ${escHtml(d.color)}`   : '',
      d.condition ? condDot + escHtml(COND_LABELS[safeCondition] || safeCondition) : '',
    ].filter(Boolean).map(s => `<span>${s}</span>`).join('');

    card.innerHTML = `
      <div class="card-header">
        <div>
          <div class="card-name">${escHtml(d.name)}</div>
          ${d.manufacturer ? `<div class="card-manufacturer">${escHtml(d.manufacturer)}</div>` : ''}
        </div>
        <span class="type-badge type-${safeType}">${escHtml(TYPE_LABELS[safeType] || safeType)}</span>
      </div>
      ${details ? `<div class="card-details">${details}</div>` : ''}
      ${d.flight ? `<div class="card-flight">✈️ ${escHtml(d.flight)}</div>` : ''}
      ${d.notes  ? `<div class="card-notes">${escHtml(d.notes)}</div>` : ''}
      <div class="card-actions">
        <button class="btn btn-secondary edit-btn" data-id="${escHtml(d.id)}">✏️ Edit</button>
        <button class="btn btn-danger delete-btn" data-id="${escHtml(d.id)}">🗑 Remove</button>
      </div>`;

    grid.appendChild(card);
  });
}

// ── Modal helpers ────────────────────────────────────────────
function openAddModal() {
  discForm.reset();
  discIdField.value = '';
  modalTitle.textContent = 'Add Disc';
  modalOverlay.classList.remove('hidden');
  document.getElementById('discName').focus();
}

function openEditModal(id) {
  const d = discs.find(x => x.id === id);
  if (!d) return;
  discIdField.value           = d.id;
  document.getElementById('discName').value         = d.name || '';
  document.getElementById('discManufacturer').value = d.manufacturer || '';
  document.getElementById('discType').value         = d.type || '';
  document.getElementById('discPlastic').value      = d.plastic || '';
  document.getElementById('discWeight').value       = d.weight || '';
  document.getElementById('discColor').value        = d.color || '';
  document.getElementById('discCondition').value    = d.condition || 'good';
  document.getElementById('discFlight').value       = d.flight || '';
  document.getElementById('discNotes').value        = d.notes || '';
  modalTitle.textContent = 'Edit Disc';
  modalOverlay.classList.remove('hidden');
  document.getElementById('discName').focus();
}

function closeModal() {
  modalOverlay.classList.add('hidden');
  clearValidation();
}

// ── Validation ────────────────────────────────────────────────
function clearValidation() {
  discForm.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
}

function validate() {
  clearValidation();
  let ok = true;
  const nameEl = document.getElementById('discName');
  const typeEl = document.getElementById('discType');
  if (!nameEl.value.trim()) { nameEl.classList.add('invalid'); ok = false; }
  if (!typeEl.value)        { typeEl.classList.add('invalid'); ok = false; }
  return ok;
}

// ── Form submit ──────────────────────────────────────────────
discForm.addEventListener('submit', e => {
  e.preventDefault();
  if (!validate()) return;

  const id    = discIdField.value;
  const disc  = {
    id:           id || uid(),
    name:         document.getElementById('discName').value.trim(),
    manufacturer: document.getElementById('discManufacturer').value.trim(),
    type:         document.getElementById('discType').value,
    plastic:      document.getElementById('discPlastic').value.trim(),
    weight:       document.getElementById('discWeight').value.trim(),
    color:        document.getElementById('discColor').value.trim(),
    condition:    document.getElementById('discCondition').value,
    flight:       document.getElementById('discFlight').value.trim(),
    notes:        document.getElementById('discNotes').value.trim(),
    added:        id ? (discs.find(x => x.id === id) || {}).added || Date.now() : Date.now(),
  };

  if (id) {
    const idx = discs.findIndex(x => x.id === id);
    if (idx !== -1) discs[idx] = disc;
  } else {
    discs.push(disc);
  }

  save();
  render();
  closeModal();
  toast(id ? '✏️ Disc updated!' : '✅ Disc added!');
});

// ── Delete ────────────────────────────────────────────────────
function openDeleteModal(id) {
  const d = discs.find(x => x.id === id);
  if (!d) return;
  pendingDeleteId = id;
  deleteMessage.textContent = `Remove "${d.name}" from your bag?`;
  deleteOverlay.classList.remove('hidden');
}

confirmDeleteBtn.addEventListener('click', () => {
  if (!pendingDeleteId) return;
  discs = discs.filter(d => d.id !== pendingDeleteId);
  pendingDeleteId = null;
  save();
  render();
  deleteOverlay.classList.add('hidden');
  toast('🗑 Disc removed');
});

document.getElementById('closeDelete').addEventListener('click', () => {
  deleteOverlay.classList.add('hidden');
  pendingDeleteId = null;
});
document.getElementById('cancelDelete').addEventListener('click', () => {
  deleteOverlay.classList.add('hidden');
  pendingDeleteId = null;
});

// ── Event delegation for card buttons ────────────────────────
grid.addEventListener('click', e => {
  const editBtn   = e.target.closest('.edit-btn');
  const deleteBtn = e.target.closest('.delete-btn');
  if (editBtn)   openEditModal(editBtn.dataset.id);
  if (deleteBtn) openDeleteModal(deleteBtn.dataset.id);
});

// ── Header / toolbar listeners ───────────────────────────────
document.getElementById('openAddModal').addEventListener('click', openAddModal);
document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelModal').addEventListener('click', closeModal);
modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });
deleteOverlay.addEventListener('click', e => { if (e.target === deleteOverlay) deleteOverlay.classList.add('hidden'); });

searchInput.addEventListener('input', render);
filterType.addEventListener('change', render);
sortBy.addEventListener('change', render);

// ── Keyboard: Escape closes modal ────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!modalOverlay.classList.contains('hidden'))  closeModal();
    if (!deleteOverlay.classList.contains('hidden')) deleteOverlay.classList.add('hidden');
  }
});

// ── Export ────────────────────────────────────────────────────
document.getElementById('exportBtn').addEventListener('click', () => {
  const json = JSON.stringify(discs, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'my-disc-bag.json';
  a.click();
  URL.revokeObjectURL(url);
  toast('⬇ Bag exported!');
});

// ── Import ────────────────────────────────────────────────────
document.getElementById('importFile').addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const imported = JSON.parse(ev.target.result);
      if (!Array.isArray(imported)) throw new Error('Not an array');
      // merge by id (imported discs take priority)
      const map = {};
      discs.forEach(d => { map[d.id] = d; });
      imported.forEach(d => { if (d.id && d.name) map[d.id] = d; });
      discs = Object.values(map);
      save();
      render();
      toast(`⬆ Imported ${imported.length} disc(s)!`);
    } catch {
      toast('❌ Invalid file');
    }
  };
  reader.readAsText(file);
  // reset so same file can be re-imported
  e.target.value = '';
});

// ── Boot ──────────────────────────────────────────────────────
render();
