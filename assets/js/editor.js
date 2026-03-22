// assets/js/editor.js
// Editor integrated for the provided HTML IDs:
// - binds to fontFamily, fontSize, fontColor, boldToggle, italicToggle,
//   applyBtn, resetStyleBtn, exportStylesBtn, importStylesFile, selectedInfo,
//   toggleEdit, printBtn, resetBtn
// - expects #pages (created in index.html inside #pages-wrapper)
// - saves styles to localStorage key "hr_styles" and exports/imports styles.json

(() => {
  const STORAGE_KEY = 'hr_styles';
  let stylesMap = {};
  let nextId = Date.now();
  function genId(){ return 's' + (nextId++); }
  function safeGet(id){ return document.getElementById(id) || null; }
  function rgbToHex(rgb){
    if(!rgb) return '#000000';
    if(rgb[0] === '#') return rgb;
    const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m) return rgb;
    return '#' + [1,2,3].map(i => parseInt(m[i],10).toString(16).padStart(2,'0')).join('');
  }

  // load/save
  function loadStyles(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      stylesMap = raw ? JSON.parse(raw) : {};
    }catch(e){
      console.warn('hr editor: failed to parse styles', e);
      stylesMap = {};
    }
  }
  function saveStyles(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(stylesMap, null, 2)); }

  // export to file
 // Replace existing exportStylesToFile(...) with this
function exportStylesToFile(filename = 'styles.json') {
  if (!pagesContainer) {
    alert('Nothing to export: #pages container not found.');
    return;
  }

  // Collect only elements inside the pages container that have a data-style-id
  const out = {};
  const nodes = Array.from(pagesContainer.querySelectorAll('[data-style-id]'));

  nodes.forEach(el => {
    const sid = el.dataset.styleId;
    if (!sid) return;

    // Read computed/inline values for the properties we manage
    const cs = window.getComputedStyle(el);
    const style = {};

    // Only include properties that are actually set (inline or computed)
    const ff = el.style.fontFamily || cs.fontFamily;
    if (ff) style.fontFamily = ff;

    const fs = el.style.fontSize || cs.fontSize;
    if (fs) style.fontSize = fs;

    const col = el.style.color || cs.color;
    if (col) {
      // normalize color to hex when possible
      try { style.color = (col[0] === '#') ? col : rgbToHex(col); } catch(e) { style.color = col; }
    }

    const fw = el.style.fontWeight || cs.fontWeight;
    if (fw) style.fontWeight = fw;

    const fi = el.style.fontStyle || cs.fontStyle;
    if (fi) style.fontStyle = fi;

    // Only save if there's at least one property
    if (Object.keys(style).length) out[sid] = style;
  });

  // Replace in-memory map with only applied styles, persist, and export
  stylesMap = out;
  saveStyles();

  try {
    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 200);
  } catch (err) {
    console.error('Export failed', err);
    alert('Export failed: ' + (err && err.message ? err.message : String(err)));
  }
}

  // import from file object
 // Replaces importStylesFile(file, options) in assets/js/editor.js
function importStylesFile(file, options = { overwrite: false }) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (typeof parsed !== 'object' || parsed === null) {
        return alert('Invalid JSON: expected an object mapping style ids to style objects.');
      }

      // We'll build a newStyles object that we'll merge/overwrite into stylesMap
      const newStyles = parsed;

      // If user chose overwrite, simply replace stylesMap with newStyles
      if (options.overwrite) {
        stylesMap = newStyles;
      } else {
        // Merge: prefer existing keys, but we'll still attempt to apply new keys
        stylesMap = Object.assign({}, stylesMap, newStyles);
      }

      // Apply styles to DOM:
      // 1) Apply to any element that already has a matching data-style-id
      const unmatchedKeys = [];
      Object.keys(newStyles).forEach(key => {
        const el = pagesContainer && pagesContainer.querySelector(`[data-style-id="${key}"]`);
        if (el) {
          applyStyleToElement(el, newStyles[key]);
        } else {
          unmatchedKeys.push(key);
        }
      });

      // 2) Heuristic fallback: for unmatched keys, assign them to elements in document order
      //    that don't already have a matched imported key; this helps when IDs were regenerated.
      if (unmatchedKeys.length && pagesContainer) {
        // Build list of candidate elements in pagesContainer in document order.
        // Only consider elements that are visible nodes (nodeType===1). Exclude elements that already
        // have a data-style-id that exists in stylesMap (we already applied those).
        const candidates = Array.from(pagesContainer.querySelectorAll('*')).filter(el => {
          // skip elements that already have a style id that is present in stylesMap matched above
          return !(el.dataset && el.dataset.styleId && Object.prototype.hasOwnProperty.call(newStyles, el.dataset.styleId));
        });

        // Pair unmatchedKeys to candidates in order.
        let i = 0;
        unmatchedKeys.forEach(key => {
          // find next available candidate
          while (i < candidates.length && (!candidates[i] || candidates[i].dataset && Object.prototype.hasOwnProperty.call(newStyles, candidates[i].dataset.styleId))) {
            i++;
          }
          if (i >= candidates.length) return; // no more candidates
          const el = candidates[i++];
          // Assign the imported key to the element so future loads match.
          el.dataset.styleId = key;
          // Apply the style
          applyStyleToElement(el, newStyles[key]);
        });
      }

      // Persist merged/overwritten stylesMap
      saveStyles();

      // Re-apply (safe) to ensure everything that can be updated is updated
      applyAllStyles();

      alert('Imported styles and applied them (best-effort).');

    } catch (err) {
      console.error('Import failed', err);
      alert('Failed to import: ' + err.message);
    }
  };
  reader.onerror = () => alert('Failed to read file');
  reader.readAsText(file);
}

  // apply style to element
  function applyStyleToElement(el, styleObj){
    if(!el || !styleObj) return;
    el.style.fontFamily = styleObj.fontFamily || '';
    el.style.fontSize = styleObj.fontSize || '';
    el.style.color = styleObj.color || '';
    el.style.fontWeight = styleObj.fontWeight || '';
    el.style.fontStyle = styleObj.fontStyle || '';
  }

  // apply saved styles to all matching elements
  function applyAllStyles(){
    if(!pagesContainer) return;
    Object.keys(stylesMap).forEach(id => {
      const el = pagesContainer.querySelector(`[data-style-id="${id}"]`);
      if(el) applyStyleToElement(el, stylesMap[id]);
    });
  }

  // ensure element (and descendants) have data-style-id and apply saved styles
  function ensureIdsAndApply(node){
    if(!node || node.nodeType !== 1) return;
    if(!node.dataset.styleId) node.dataset.styleId = genId();
    const sid = node.dataset.styleId;
    if(stylesMap[sid]) applyStyleToElement(node, stylesMap[sid]);
    if(editMode) node.contentEditable = 'true';
    node.querySelectorAll && node.querySelectorAll('*').forEach(child => {
      if(child.nodeType === 1 && !child.dataset.styleId) child.dataset.styleId = genId();
      const csid = child.dataset.styleId;
      if(csid && stylesMap[csid]) applyStyleToElement(child, stylesMap[csid]);
      if(editMode) child.contentEditable = 'true';
    });
  }

  // state
  let pagesContainer = null; // #pages
  let editMode = false;
  let selectedEls = []; // multi-select support
  window.hrEditor = window.hrEditor || {};
  window.hrEditor.isDragging = false;

  function populateControlsFromElement(el){
    if(!el) return;
    const cs = window.getComputedStyle(el);
    const ff = safeGet('fontFamily'), fs = safeGet('fontSize'), fc = safeGet('fontColor'), bt = safeGet('boldToggle'), it = safeGet('italicToggle');
    if(ff) ff.value = el.style.fontFamily || cs.fontFamily || '';
    if(fs) fs.value = parseInt(el.style.fontSize || cs.fontSize || 16, 10);
    if(fc) fc.value = rgbToHex(el.style.color || cs.color || '#000000');
    if(bt) bt.checked = (el.style.fontWeight || cs.fontWeight) >= 700 || el.style.fontWeight === 'bold';
    if(it) it.checked = (el.style.fontStyle || cs.fontStyle) === 'italic';
  }

  function styleFromControls(){
    const style = {};
    const ff = safeGet('fontFamily'), fs = safeGet('fontSize'), fc = safeGet('fontColor'), bt = safeGet('boldToggle'), it = safeGet('italicToggle');
    if(ff) style.fontFamily = ff.value;
    if(fs) style.fontSize = (parseInt(fs.value, 10) || 12) + 'px';
    if(fc) style.color = fc.value;
    style.fontWeight = bt && bt.checked ? '700' : '400';
    style.fontStyle = it && it.checked ? 'italic' : 'normal';
    return style;
  }

  function updateSelectedInfo(){
    const info = safeGet('selectedInfo');
    if(!info) return;
    if(selectedEls.length === 0) info.textContent = 'No selection';
    else if(selectedEls.length === 1) {
      const el = selectedEls[0];
      info.innerHTML = `Selected: &lt;${el.tagName.toLowerCase()}&gt; id=${el.dataset.styleId || ''}`;
    } else {
      info.textContent = `Selected ${selectedEls.length} elements (multi-select)`;
    }
  }

  function clearSelectionVisuals(){
    selectedEls.forEach(el => el.classList && el.classList.remove('selected-outline'));
  }

  function selectSingleElement(el){
    clearSelectionVisuals();
    selectedEls = [];
    if(!el) { updateSelectedInfo(); return; }
    if(!el.dataset.styleId) el.dataset.styleId = genId();
    selectedEls = [el];
    el.classList && el.classList.add('selected-outline');
    populateControlsFromElement(el);
    updateSelectedInfo();
  }

  function selectAllSameTag(el){
    if(!pagesContainer || !el) return;
    const tag = el.tagName;
    const matches = Array.from(pagesContainer.querySelectorAll(tag));
    if(matches.length === 0) return;
    clearSelectionVisuals();
    selectedEls = [];
    matches.forEach(m => {
      if(!m.dataset.styleId) m.dataset.styleId = genId();
      m.classList && m.classList.add('selected-outline');
      selectedEls.push(m);
    });
    populateControlsFromElement(selectedEls[0]);
    updateSelectedInfo();
  }

  function deselectAll(){
    clearSelectionVisuals();
    selectedEls = [];
    updateSelectedInfo();
  }

  function applyToSelected(){
    if(!selectedEls || selectedEls.length === 0) return;
    const style = styleFromControls();
    selectedEls.forEach(el => {
      applyStyleToElement(el, style);
      if(!el.dataset.styleId) el.dataset.styleId = genId();
      stylesMap[el.dataset.styleId] = style;
    });
    saveStyles();
  }

  function resetSelected(){
    if(!selectedEls || selectedEls.length === 0) return;
    selectedEls.forEach(el => {
      el.style.fontFamily = '';
      el.style.fontSize = '';
      el.style.color = '';
      el.style.fontWeight = '';
      el.style.fontStyle = '';
      const sid = el.dataset.styleId;
      if(sid && stylesMap[sid]) { delete stylesMap[sid]; }
    });
    saveStyles();
    if(selectedEls.length) populateControlsFromElement(selectedEls[0]);
    updateSelectedInfo();
  }

  function setEditMode(on){
    editMode = !!on;
    if(pagesContainer) pagesContainer.querySelectorAll('*').forEach(el => { if(el.nodeType===1) el.contentEditable = editMode ? 'true' : 'false'; });
    const btn = safeGet('toggleEdit');
    if(btn) btn.textContent = editMode ? 'Exit Edit Mode' : 'Toggle Edit Mode';
  }

  // observe dynamic content
  let mo = null;
  function startObserver(){
    if(!pagesContainer) return;
    mo = new MutationObserver(mutations => {
      mutations.forEach(m => {
        if(m.addedNodes && m.addedNodes.length){
          m.addedNodes.forEach(node => {
            if(node.nodeType === 1) ensureIdsAndApply(node);
            if(node.nodeType === 11 && node.querySelectorAll) node.querySelectorAll('*').forEach(ch => ensureIdsAndApply(ch));
          });
        }
        if(m.type === 'attributes' && m.attributeName === 'data-style-id'){
          const el = m.target;
          const sid = el.dataset.styleId;
          if(sid && stylesMap[sid]) applyStyleToElement(el, stylesMap[sid]);
        }
      });
    });
    mo.observe(pagesContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-style-id'] });
  }

  function debounce(fn, wait){ let t; return function(...args){ clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); }; }

  // init
  function init(){
    loadStyles();

    // find pages container (#pages) - the script.js will populate it
    pagesContainer = safeGet('pages');
    if(!pagesContainer){
      console.error('Editor: #pages is missing. Add <div id="pages"></div> inside #pages-wrapper so script.js can populate pages.');
      // don't abort entirely, but attempt to look for content inside pages-wrapper if pages not present
      const wrapper = safeGet('pages-wrapper');
      if(wrapper && wrapper.children.length) {
        pagesContainer = wrapper; // fallback
      } else {
        // still continue so sidebar works
      }
    }

    // minimal selection style
    const st = document.createElement('style');
    st.textContent = `.selected-outline{outline:3px dashed rgba(0,120,255,0.6);outline-offset:-4px}`;
    document.head.appendChild(st);

    // wire sidebar elements that exist
    const applyBtn = safeGet('applyBtn');
    const resetStyleBtn = safeGet('resetStyleBtn') || safeGet('resetBtnStyle');
    const exportBtn = safeGet('exportStylesBtn') || safeGet('exportBtn');
    const importFileInput = safeGet('importStylesFile') || safeGet('importStylesFile');
    const toggleEditBtn = safeGet('toggleEdit');

    // ensure all existing nodes inside pages get style IDs and apply loaded styles
    if(pagesContainer) pagesContainer.querySelectorAll('*').forEach(node => { if(node.nodeType===1 && !node.dataset.styleId) node.dataset.styleId = genId(); });
    applyAllStyles();

    // click selection (support ctrl/meta for select all same-tag)
    const containerForClicks = pagesContainer || document; // fallback
    containerForClicks.addEventListener('click', e => {
      if(window.hrEditor.isDragging) return;
      const target = e.target;
      // only handle elements inside pagesContainer when it exists
      if(pagesContainer && !pagesContainer.contains(target)) return;
      if(target === pagesContainer) { deselectAll(); return; }
      const ctrl = e.ctrlKey || e.metaKey;
      if(ctrl) selectAllSameTag(target);
      else selectSingleElement(target);
      e.stopPropagation();
    });

    // avoid selecting while dragging (drag-handle)
    document.addEventListener('mousedown', e => {
      if(e.target.closest && e.target.closest('.drag-handle')) window.hrEditor.isDragging = true;
    });
    document.addEventListener('mouseup', () => { window.hrEditor.isDragging = false; });

    // wire the sidebar controls
    applyBtn && applyBtn.addEventListener('click', applyToSelected);
    resetStyleBtn && resetStyleBtn.addEventListener('click', resetSelected);
    toggleEditBtn && toggleEditBtn.addEventListener('click', () => setEditMode(!editMode));

    // export/import wiring
    exportBtn && exportBtn.addEventListener('click', () => exportStylesToFile('styles.json'));
    if(importFileInput){
      // ensure input shows file dialog only when user clicks it (or you can add a button to trigger it)
      importFileInput.addEventListener('change', (e) => {
        const f = e.target.files && e.target.files[0];
        if(f){
          const overwrite = confirm('Overwrite existing saved styles with the imported file? OK = overwrite, Cancel = merge non-conflicting keys only.');
          importStylesFile(f, { overwrite });
        }
        e.target.value = '';
      });
    }

    // keyboard: Esc clears selection, Ctrl/Cmd+A selects all in pages
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') deselectAll();
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a'){
        e.preventDefault();
        const all = pagesContainer ? Array.from(pagesContainer.querySelectorAll('*')).filter(n => n.nodeType===1) : [];
        if(all.length){
          clearSelectionVisuals();
          selectedEls = [];
          all.forEach(el => {
            if(!el.dataset.styleId) el.dataset.styleId = genId();
            el.classList && el.classList.add('selected-outline');
            selectedEls.push(el);
          });
          populateControlsFromElement(selectedEls[0]);
          updateSelectedInfo();
        }
      }
    });

    startObserver();

    // live-apply controls (debounced)
    const liveApply = debounce(() => { if(selectedEls.length) applyToSelected(); }, 120);
    const ff = safeGet('fontFamily'), fs = safeGet('fontSize'), fc = safeGet('fontColor'), bt = safeGet('boldToggle'), it = safeGet('italicToggle');
    if(ff) ff.addEventListener('change', liveApply);
    if(fs) fs.addEventListener('input', liveApply);
    if(fc) fc.addEventListener('input', liveApply);
    if(bt) bt.addEventListener('change', liveApply);
    if(it) it.addEventListener('change', liveApply);

    updateSelectedInfo();
  }

  // expose API for debugging
  window.hrEditor.exportToFile = exportStylesToFile;
  window.hrEditor.importFromObject = (obj, options = { overwrite: false }) => {
    if(typeof obj !== 'object' || obj === null) throw new Error('importFromObject expects an object mapping');
    if(options.overwrite) stylesMap = obj;
    else stylesMap = Object.assign({}, stylesMap, obj);
    saveStyles();
    applyAllStyles();
  };
  window.hrEditor.getStyles = () => stylesMap;

  // start
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();