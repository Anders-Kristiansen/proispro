# UX Spec: User Disc Photo Feature

**Author:** Livingston (UX Designer)  
**Date:** 2025-05  
**Status:** Proposed  
**Stakeholders:** Rusty (Frontend), Anders (User)

---

## 1. Design Decision: Photo vs. Chart Display Strategy

### Recommendation: **Tabbed View** (Photo | Chart)

**Rationale:**
- Both views have value: the photo feels personal and helps visual identification; the chart shows flight path at a glance
- Users shouldn't have to choose between them — both should be accessible
- A tab switcher is familiar, mobile-friendly (large tap targets), and doesn't require scrolling
- Priority order: User photo > Catalog photo > Chart (chart is always available via tab)

**Implementation:**
```html
<div class="fg-modal-image-col">
  <!-- Tab switcher (only shown when photo exists) -->
  <div class="image-tab-bar" x-show="hasPhoto(selectedDisc)">
    <button 
      class="tab-btn" 
      :class="{ active: imageTab === 'photo' }"
      @click="imageTab = 'photo'"
      aria-label="Show photo">📷 Photo</button>
    <button 
      class="tab-btn" 
      :class="{ active: imageTab === 'chart' }"
      @click="imageTab = 'chart'"
      aria-label="Show flight chart">✈️ Chart</button>
  </div>

  <!-- Photo view -->
  <div class="image-container" x-show="imageTab === 'photo' && hasPhoto(selectedDisc)">
    <img 
      :src="photoUrl(selectedDisc)" 
      :alt="selectedDisc.name + ' disc photo'"
      class="disc-photo" />
    <div class="photo-actions">
      <button class="photo-action-btn" @click="changePhoto(selectedDisc)">
        Change
      </button>
      <button class="photo-action-btn photo-remove" @click="removePhoto(selectedDisc)">
        Remove
      </button>
    </div>
  </div>

  <!-- Chart view (SVG flight path) -->
  <div class="image-container" x-show="imageTab === 'chart' || !hasPhoto(selectedDisc)">
    <svg class="fg-flight-path" viewBox="0 0 300 220" xmlns="http://www.w3.org/2000/svg">
      <!-- existing SVG chart code -->
    </svg>
    
    <!-- Upload overlay (only when no photo) -->
    <button 
      class="upload-overlay-btn" 
      x-show="isInBag(selectedDisc) && !hasPhoto(selectedDisc)"
      @click="triggerPhotoUpload(selectedDisc)"
      aria-label="Add a photo of your disc">
      <span class="upload-icon">📷</span>
      <span class="upload-label">Add your photo</span>
    </button>
  </div>
</div>
```

**Why NOT a toggle or priority approach:**
- ❌ Priority approach (photo hides chart): Users lose flight path visualization once they add a photo — regression in functionality
- ❌ Side-by-side: Too cramped on mobile, left column becomes crowded
- ✅ Tabs: Clean, familiar, gives both views equal priority, degrades gracefully when no photo

---

## 2. Upload Entry Point

### Recommendation: Overlay Button on Chart (Empty State Only)

**When to show:** 
- Disc is in user's bag (`isInBag(selectedDisc)`)
- No user photo exists (`!hasPhoto(selectedDisc)`)
- Currently viewing chart tab (or photo tab doesn't exist yet)

**Design:**
```css
.upload-overlay-btn {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: .5rem;
  padding: .75rem 1.25rem;
  background: oklch(0.82 0.18 80); /* accent color */
  color: oklch(0.15 0.02 260); /* dark text */
  border: none;
  border-radius: 999px;
  font-size: .9rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0,0,0,.3);
  transition: transform .15s, filter .15s;
  
  /* Touch target: min 44×44px */
  min-height: 44px;
  min-width: 44px;
}

.upload-overlay-btn:hover {
  filter: brightness(1.1);
  transform: translateX(-50%) scale(1.05);
}

.upload-overlay-btn:active {
  transform: translateX(-50%) scale(.98);
}

.upload-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.upload-label {
  white-space: nowrap;
}

/* Mobile: icon-only version for space */
@media (max-width: 400px) {
  .upload-overlay-btn {
    padding: .75rem;
  }
  .upload-label {
    display: none;
  }
}
```

**Touch target:** 44×44px minimum (WCAG 2.5.5 Target Size). Button is positioned at bottom center of chart — easy thumb reach on mobile.

**Alternative considered:** Floating action button (FAB) in top-right of modal.  
**Rejected:** Less discoverable, conflicts with close button, doesn't feel contextual to the image area.

---

## 3. Upload Flow

### Step-by-Step UX

1. **Trigger:** User taps "Add your photo" button
2. **File picker opens** (native OS dialog via `<input type="file" accept="image/*">`)
3. **Preview state** (immediately after file selected):
   ```html
   <!-- Replace chart with preview -->
   <div class="image-container uploading" x-show="uploadState === 'preview'">
     <img 
       :src="previewUrl" 
       alt="Photo preview"
       class="disc-photo preview" />
     <div class="preview-actions">
       <button class="btn btn-secondary" @click="cancelUpload()">
         Cancel
       </button>
       <button class="btn btn-primary" @click="confirmUpload()">
         ✓ Confirm
       </button>
     </div>
   </div>
   ```
4. **Uploading state** (during Supabase upload):
   ```html
   <div class="image-container uploading" x-show="uploadState === 'uploading'">
     <div class="upload-spinner">
       <div class="spinner"></div>
       <p>Uploading…</p>
     </div>
   </div>
   ```
5. **Success:** Switch to photo tab, show uploaded photo with "Change" / "Remove" buttons
6. **Error:** Toast notification + revert to chart view

**Escape path:** "Cancel" button in preview state, or close modal (no upload triggered)

---

## 4. The 6 States

### State 1: Empty (No Photo, No Catalog Pic)
**Visual:** SVG flight chart + overlay button "Add your photo"  
**Condition:** `!userPhotoUrl && !catalogPic`  
**CTA:** Upload overlay button

### State 2: Has Catalog Pic (No User Photo)
**Visual:** Catalog photo shown by default (tab bar: Photo | Chart)  
**Condition:** `!userPhotoUrl && catalogPic`  
**CTA:** "Add your photo" button below catalog image (smaller, secondary style)  
**Rationale:** Catalog photo is helpful but not personal — offer upgrade path

```html
<div class="image-container" x-show="imageTab === 'photo' && catalogPic && !userPhotoUrl">
  <img 
    :src="catalogPic" 
    alt="Stock photo"
    class="disc-photo catalog" />
  <div class="catalog-badge">Stock photo</div>
  <button 
    class="btn btn-secondary btn-sm upload-cta"
    @click="triggerPhotoUpload(selectedDisc)">
    📷 Add your photo
  </button>
</div>
```

**CSS for badge:**
```css
.catalog-badge {
  position: absolute;
  top: .75rem;
  right: .75rem;
  padding: .25rem .6rem;
  background: rgba(15, 23, 42, 0.7);
  color: var(--clr-muted);
  font-size: .7rem;
  font-weight: 600;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: .05em;
}
```

### State 3: Has User Photo
**Visual:** User photo shown (tab bar: Photo | Chart)  
**Condition:** `userPhotoUrl`  
**CTA:** "Change" / "Remove" buttons overlaid on hover (desktop) or always visible (mobile)

### State 4: Uploading
**Visual:** Spinner + "Uploading…" text (centered)  
**Condition:** `uploadState === 'uploading'`  
**No CTA** (blocking operation)

### State 5: Error
**Visual:** Toast notification (top-right of modal or page)  
**Message:** "Upload failed. Please try again." (with retry icon)  
**Condition:** `uploadState === 'error'`  
**Fallback:** Revert to previous view (chart or catalog pic)

### State 6: Loading (Fetching Photo URL)
**Visual:** Subtle skeleton loader (gray rectangle with pulse animation)  
**Condition:** `photoLoading === true`  
**Duration:** <500ms typically (Supabase Storage is fast)

---

## 5. Accessibility Requirements

### Keyboard Navigation
1. **Tab switcher:** Keyboard focusable, arrow keys move between tabs (ARIA tabs pattern)
2. **Upload button:** Native `<input type="file">` hidden, triggered by visible `<button>` (ARIA label: "Add a photo of your disc")
3. **Photo actions:** "Change" / "Remove" buttons are keyboard focusable
4. **Focus management:** After upload success, focus moves to "Change" button (announces success)

### ARIA Attributes
```html
<!-- Tab bar -->
<div class="image-tab-bar" role="tablist" aria-label="Image view options">
  <button 
    role="tab"
    :aria-selected="imageTab === 'photo'"
    :tabindex="imageTab === 'photo' ? 0 : -1"
    @click="imageTab = 'photo'"
    @keydown.arrow-right.prevent="imageTab = 'chart'"
    id="tab-photo">
    📷 Photo
  </button>
  <button 
    role="tab"
    :aria-selected="imageTab === 'chart'"
    :tabindex="imageTab === 'chart' ? 0 : -1"
    @click="imageTab = 'chart'"
    @keydown.arrow-left.prevent="imageTab = 'photo'"
    id="tab-chart">
    ✈️ Chart
  </button>
</div>

<!-- Tab panels -->
<div 
  role="tabpanel" 
  :aria-labelledby="tab-photo"
  :hidden="imageTab !== 'photo'">
  <!-- Photo content -->
</div>

<div 
  role="tabpanel" 
  :aria-labelledby="tab-chart"
  :hidden="imageTab !== 'chart'">
  <!-- Chart content -->
</div>

<!-- File input (hidden) -->
<input 
  type="file" 
  accept="image/*"
  id="photo-upload-input"
  @change="handleFileSelected($event)"
  style="display:none"
  aria-label="Choose disc photo file" />

<!-- Trigger button -->
<button 
  @click="$refs.photoInput.click()"
  aria-label="Add a photo of your disc">
  📷 Add your photo
</button>
```

### Screen Reader Announcements
- **Upload success:** `aria-live="polite"` region announces "Photo uploaded successfully"
- **Upload error:** `aria-live="assertive"` region announces "Upload failed. Please try again."
- **Tab switch:** Native ARIA tabs pattern announces "Photo, tab 1 of 2, selected"

### Color Contrast
- Upload button: Background `oklch(0.82 0.18 80)` + dark text `oklch(0.15 0.02 260)` = **WCAG AAA** (contrast ratio ~14:1)
- "Remove" button: Use red accent with sufficient contrast (test against dark surface)

---

## 6. Mobile Considerations

### Thumb Reach Zone
- **Upload button:** Bottom center (easiest reach with thumb)
- **Tab switcher:** Top of image area (still reachable, less critical once photo exists)
- **Change/Remove buttons:** Bottom of photo (within reach zone)

### Responsive Breakpoints
```css
@media (max-width: 767px) {
  .fg-modal-content {
    grid-template-columns: 1fr; /* Stack: image on top, details below */
  }
  
  .fg-modal-image-col {
    min-height: 50vh; /* Give photo space to breathe */
  }
  
  .image-tab-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    background: var(--clr-surface2);
  }
  
  .photo-actions {
    /* Always visible on mobile (no hover) */
    opacity: 1;
    position: static;
    margin-top: 1rem;
  }
}
```

### File Input on Mobile
- `accept="image/*"` triggers native camera/photo picker
- No custom camera UI needed — rely on OS capabilities

---

## 7. The One Thing Rusty Might Miss

### ⚠️ **Photo Aspect Ratio & Cropping**

**Problem:** User uploads a 16:9 landscape photo of their disc on grass. The modal's left column is 1:1.2 aspect ratio (taller than wide). The photo either:
1. Stretches (distorted disc)
2. Letter/pillarboxes (ugly black bars)
3. Crops unpredictably (disc might be cut off)

**Solution:** `object-fit: cover` with `object-position: center`

```css
.disc-photo {
  width: 100%;
  height: 100%;
  object-fit: cover; /* Crop to fill container, maintain aspect */
  object-position: center; /* Keep disc centered */
  border-radius: 8px;
}

.image-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1.2; /* Match modal column aspect */
  overflow: hidden;
  background: var(--clr-surface2); /* Fallback while loading */
}
```

**Why this matters:**
- Users will upload photos from phones (varying ratios: 4:3, 16:9, 1:1)
- Cropping is acceptable (photo is contextual, not critical content)
- Center cropping keeps the disc visible (users typically center the disc when photographing)

**Advanced (future enhancement):** Client-side crop tool before upload (like Instagram). Out of scope for MVP.

---

## 8. Implementation Checklist for Rusty

### HTML Structure
- [ ] Add tab bar (`<div class="image-tab-bar" role="tablist">`)
- [ ] Wrap photo in `<div class="image-container">` with aspect ratio
- [ ] Add hidden `<input type="file" accept="image/*">` (ref: `photoInput`)
- [ ] Add upload overlay button on chart (conditional: `isInBag && !hasPhoto`)
- [ ] Add "Change" / "Remove" buttons on photo view
- [ ] Add preview actions ("Cancel" / "Confirm") during preview state
- [ ] Add spinner for uploading state
- [ ] Add `aria-live` regions for upload status announcements

### Alpine.js State
```javascript
// Add to flightGuide() component
imageTab: 'photo',          // or 'chart'
uploadState: null,          // null | 'preview' | 'uploading' | 'error'
previewUrl: null,           // Blob URL for preview
selectedFile: null,         // File object
photoLoading: false,        // True while fetching Storage URL

hasPhoto(disc) {
  return !!disc.userPhotoUrl || !!disc.catalogPic;
},

photoUrl(disc) {
  if (disc.userPhotoUrl) {
    return supabase.storage.from('disc-photos').getPublicUrl(disc.userPhotoUrl).data.publicUrl;
  }
  return disc.catalogPic || null;
},

triggerPhotoUpload(disc) {
  this.$refs.photoInput.click();
},

handleFileSelected(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  this.selectedFile = file;
  this.previewUrl = URL.createObjectURL(file);
  this.uploadState = 'preview';
},

cancelUpload() {
  URL.revokeObjectURL(this.previewUrl);
  this.previewUrl = null;
  this.selectedFile = null;
  this.uploadState = null;
  this.$refs.photoInput.value = ''; // Reset input
},

async confirmUpload() {
  this.uploadState = 'uploading';
  
  try {
    const userId = this.user.id;
    const discId = this.selectedDisc.id;
    const ext = this.selectedFile.name.split('.').pop();
    const path = `${userId}/${discId}.${ext}`;
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('disc-photos')
      .upload(path, this.selectedFile, { upsert: true });
    
    if (uploadError) throw uploadError;
    
    // Update disc_wear_adjustments with photo path
    const { error: dbError } = await supabase
      .from('disc_wear_adjustments')
      .update({ user_photo_url: path })
      .eq('user_disc_id', discId)
      .eq('user_id', userId);
    
    if (dbError) throw dbError;
    
    // Success: update local state
    this.selectedDisc.userPhotoUrl = path;
    this.imageTab = 'photo';
    this.uploadState = null;
    this.announceStatus('Photo uploaded successfully');
    
    // Focus management: move to "Change" button
    this.$nextTick(() => {
      this.$refs.changePhotoBtn?.focus();
    });
  } catch (error) {
    console.error('Upload failed:', error);
    this.uploadState = 'error';
    this.announceStatus('Upload failed. Please try again.', 'assertive');
    
    // Revert to chart after 2s
    setTimeout(() => {
      this.uploadState = null;
      this.imageTab = 'chart';
    }, 2000);
  } finally {
    URL.revokeObjectURL(this.previewUrl);
    this.previewUrl = null;
    this.selectedFile = null;
    this.$refs.photoInput.value = '';
  }
},

async removePhoto(disc) {
  if (!confirm('Remove this photo?')) return;
  
  try {
    // Delete from Storage
    const { error: deleteError } = await supabase.storage
      .from('disc-photos')
      .remove([disc.userPhotoUrl]);
    
    if (deleteError) throw deleteError;
    
    // Update DB
    const { error: dbError } = await supabase
      .from('disc_wear_adjustments')
      .update({ user_photo_url: null })
      .eq('user_disc_id', disc.id)
      .eq('user_id', this.user.id);
    
    if (dbError) throw dbError;
    
    // Update local state
    disc.userPhotoUrl = null;
    this.imageTab = 'chart'; // Switch back to chart
    this.announceStatus('Photo removed');
  } catch (error) {
    console.error('Remove failed:', error);
    alert('Failed to remove photo. Please try again.');
  }
},

changePhoto(disc) {
  this.triggerPhotoUpload(disc);
},

announceStatus(message, priority = 'polite') {
  // Announce to screen readers via aria-live region
  const announcer = document.getElementById(`sr-announcer-${priority}`);
  if (announcer) {
    announcer.textContent = message;
    setTimeout(() => { announcer.textContent = ''; }, 3000);
  }
}
```

### CSS (flight-guide.css)
- [ ] `.image-tab-bar` styles (flex, gap, border-bottom)
- [ ] `.tab-btn` styles (active state, hover, focus ring)
- [ ] `.image-container` (aspect-ratio, overflow, position relative)
- [ ] `.disc-photo` (object-fit: cover, border-radius)
- [ ] `.upload-overlay-btn` (positioned absolute, bottom center, shadow)
- [ ] `.photo-actions` (overlay on hover, always visible on mobile)
- [ ] `.catalog-badge` (top-right badge)
- [ ] `.upload-spinner` (centered flexbox, spinner animation)
- [ ] `.preview-actions` (button group at bottom)
- [ ] Mobile breakpoint adjustments

### ARIA / A11y
- [ ] Tab switcher uses `role="tablist"`, `role="tab"`, `role="tabpanel"`
- [ ] Arrow key navigation between tabs
- [ ] Hidden file input has descriptive `aria-label`
- [ ] Upload button has `aria-label="Add a photo of your disc"`
- [ ] Add `<div id="sr-announcer-polite" aria-live="polite" class="sr-only"></div>`
- [ ] Add `<div id="sr-announcer-assertive" aria-live="assertive" class="sr-only"></div>`
- [ ] Focus moves to "Change" button after successful upload

### Testing
- [ ] Upload works (Supabase Storage + DB update)
- [ ] Remove works (Storage delete + DB update)
- [ ] Preview cancellation works (no DB writes)
- [ ] Error handling shows toast + reverts view
- [ ] Tab switcher keyboard navigation works
- [ ] Photo scales correctly (various aspect ratios)
- [ ] Mobile: file input triggers camera/photo picker
- [ ] Mobile: buttons are within thumb reach
- [ ] Screen reader announces upload success/failure

---

## 9. Personal Feel — Future Enhancements

These are **out of scope** for MVP but would enhance the "your disc" feeling:

1. **Disc nickname field** (e.g., "Trusty", "Big Red") — shown in modal header below official name
2. **Wear indicator dots** (visual: 5 dots, fill based on condition) — next to condition badge
3. **Custom notes section** (already exists in schema!) — expand to show on modal if non-empty
4. **Photo gallery** (if user uploads multiple shots) — swipe through photos
5. **Drag-to-reorder** (in bag view) — arrange discs by throw order
6. **Color-coded tags** (e.g., "Main bag", "Winter rotation") — visual categories

These are adjacent features to discuss with Anders after photo MVP ships.

---

## Summary

**Top Recommendation:** Use a tabbed interface (Photo | Chart) so users get both the personal photo AND the flight visualization. Don't make them choose.

**Critical UX detail Rusty must nail:** Photo aspect ratio handling via `object-fit: cover` — prevents stretched/distorted disc images.

**Mobile-first wins:** Bottom-center upload button (thumb reach), always-visible photo actions (no hover), native file picker integration.

**Accessibility compliance:** ARIA tabs pattern, keyboard navigation, screen reader announcements, 44px touch targets.

**States covered:** All 6 states specified with HTML snippets and CSS classes — Rusty has clear implementation guide.
