/* ── ProIsPro – Disc Inventory App ─────────────────────────── */

const STORAGE_KEY     = 'proispro_discs';

// ── State ───────────────────────────────────────────────────
let discs = [];
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

const deleteOverlay    = document.getElementById('deleteOverlay');
const deleteMessage    = document.getElementById('deleteMessage');
const confirmDeleteBtn = document.getElementById('confirmDelete');

// ── Helpers ─────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function escHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

// ── DAB GraphQL API ──────────────────────────────────────────
const GRAPHQL_ENDPOINT = '/data-api/graphql';

const DISC_FIELDS = 'id name manufacturer discType plastic weight color condition flight notes addedAt';

async function gqlFetch(query, variables = {}) {
  const res = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text}`);
  }
  const json = await res.json();
  if (json.errors) {
    throw new Error(`API GraphQL: ${json.errors.map(e => e.message).join(', ')}`);
  }
  return json.data;
}

function toApiDisc(disc) {
  const { added, type, ...rest } = disc;
  return { ...rest, discType: type, addedAt: new Date(added || Date.now()).toISOString() };
}

function fromApiDisc(d) {
  const { addedAt, discType, ...rest } = d;
  return { ...rest, type: discType, added: addedAt ? Date.parse(addedAt) : Date.now() };
}

async function apiLoadDiscs() {
  const data = await gqlFetch(`query { discs { items { ${DISC_FIELDS} } } }`);
  return (data.discs.items || []).map(fromApiDisc);
}

async function apiAddDisc(disc) {
  const data = await gqlFetch(
    `mutation CreateDisc($item: CreateDiscInput!) { createDisc(item: $item) { ${DISC_FIELDS} } }`,
    { item: toApiDisc(disc) }
  );
  return fromApiDisc(data.createDisc);
}

async function apiUpdateDisc(disc) {
  await gqlFetch(
    `mutation UpdateDisc($id: ID!, $item: UpdateDiscInput!) { updateDisc(id: $id, item: $item) { id } }`,
    { id: disc.id, item: toApiDisc(disc) }
  );
}

async function apiDeleteDisc(id) {
  await gqlFetch(
    `mutation DeleteDisc($id: ID!) { deleteDisc(id: $id) { id } }`,
    { id }
  );
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
      d.color    ? `🎨 <span class="disc-color-dot" style="background:var(--disc-${escHtml(d.color.toLowerCase().replace(/\s+/g, '-'))})"></span>${escHtml(d.color)}` : '',
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
  resetColorPicker();
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
  setColorPicker(d.color || '');
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
discForm.addEventListener('submit', async e => {
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

  try {
    if (id) {
      await apiUpdateDisc(disc);
      const idx = discs.findIndex(x => x.id === id);
      if (idx !== -1) discs[idx] = disc;
    } else {
      const created = await apiAddDisc(disc);
      discs.push(created);
    }
    render();
    closeModal();
    toast(id ? '✏️ Disc updated!' : '✅ Disc added!');
  } catch (err) {
    toast('❌ Save failed: ' + err.message);
  }
});

// ── Delete ────────────────────────────────────────────────────
function openDeleteModal(id) {
  const d = discs.find(x => x.id === id);
  if (!d) return;
  pendingDeleteId = id;
  deleteMessage.textContent = `Remove "${d.name}" from your bag?`;
  deleteOverlay.classList.remove('hidden');
}

confirmDeleteBtn.addEventListener('click', async () => {
  if (!pendingDeleteId) return;
  const id = pendingDeleteId;
  pendingDeleteId = null;
  deleteOverlay.classList.add('hidden');
  try {
    await apiDeleteDisc(id);
    discs = discs.filter(d => d.id !== id);
    render();
    toast('🗑 Disc removed');
  } catch (err) {
    toast('❌ Delete failed: ' + err.message);
  }
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
    if (!modalOverlay.classList.contains('hidden'))    closeModal();
    if (!deleteOverlay.classList.contains('hidden'))   deleteOverlay.classList.add('hidden');
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
document.getElementById('importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if (!file) return;
  e.target.value = '';

  let imported;
  try {
    const text = await file.text();
    imported = JSON.parse(text);
    if (!Array.isArray(imported)) throw new Error('Not an array');
  } catch {
    toast('❌ Invalid file');
    return;
  }

  const valid = imported.filter(d => d.id && d.name);
  if (!valid.length) { toast('❌ No valid discs found'); return; }

  const existingIds = new Set(discs.map(d => d.id));
  let count = 0;
  for (const raw of valid) {
    const disc = { ...raw, added: raw.added || Date.now() };
    try {
      if (existingIds.has(disc.id)) {
        await apiUpdateDisc(disc);
        const idx = discs.findIndex(x => x.id === disc.id);
        if (idx !== -1) discs[idx] = disc;
      } else {
        const created = await apiAddDisc(disc);
        discs.push(created);
        existingIds.add(disc.id);
      }
      count++;
    } catch {
      // skip discs that fail
    }
  }

  render();
  toast(`⬆ Imported ${count} disc(s)!`);
});

// ── Color Picker ─────────────────────────────────────────────
const colorPickerEl = document.getElementById('colorPicker');
const colorHiddenEl = document.getElementById('discColor');
const colorLabelEl  = document.getElementById('colorLabel');

function resetColorPicker() {
  colorPickerEl.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  colorPickerEl.querySelector('[data-color=""]').classList.add('selected');
  colorHiddenEl.value    = '';
  colorLabelEl.textContent = '';
}

function setColorPicker(colorName) {
  colorPickerEl.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
  const target = colorPickerEl.querySelector(
    colorName ? `[data-color="${colorName}"]` : '[data-color=""]'
  );
  if (target) target.classList.add('selected');
  colorHiddenEl.value      = colorName;
  colorLabelEl.textContent = colorName || '';
}

colorPickerEl.addEventListener('click', e => {
  const swatch = e.target.closest('.color-swatch');
  if (!swatch) return;
  setColorPicker(swatch.dataset.color);
});

// ── Boot ──────────────────────────────────────────────────────
async function boot() {
  try {
    discs = await apiLoadDiscs();
  } catch (err) {
    console.warn('DAB API unavailable, falling back to localStorage:', err);
    try {
      discs = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      discs = [];
    }
  }

  render();
}
boot();
