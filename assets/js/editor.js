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
  function stableFallbackId(el){
    if(!el || !pagesContainer || !pagesContainer.contains(el)) return genId();
    const parts = [];
    let current = el;
    while(current && current !== pagesContainer){
      const parent = current.parentElement;
      if(!parent) break;
      const index = Array.from(parent.children).indexOf(current);
      parts.unshift(`${current.tagName.toLowerCase()}-${index}`);
      current = parent;
    }
    return 'sid__fallback__' + parts.join('__');
  }
  function rgbToHex(rgb){
    if(!rgb) return '#000000';
    if(rgb[0] === '#') return rgb;
    const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m) return rgb;
    return '#' + [1,2,3].map(i => parseInt(m[i],10).toString(16).padStart(2,'0')).join('');
  }
  function colorForPicker(value, fallback = '#ffffff'){
    if(!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value === 'rgba(0,0,0,0)') return fallback;
    const hex = rgbToHex(value);
    return /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
  }
  function imageUrlFromCss(bgImage){
    if(!bgImage || bgImage === 'none') return '';
    const matches = bgImage.match(/url\(["']?(.*?)["']?\)/ig);
    if(!matches || !matches.length) return '';
    const last = matches[matches.length - 1];
    const m = last.match(/url\(["']?(.*?)["']?\)/i);
    return m ? m[1] : '';
  }
  function parseImageOpacityFromCss(bgImage){
    if(!bgImage || bgImage === 'none') return 1;
    const m = bgImage.match(/linear-gradient\(rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/i);
    if(!m) return 1;
    const overlay = Math.max(0, Math.min(1, Number(m[1])));
    return Math.max(0, Math.min(1, 1 - overlay));
  }
  function buildBackgroundImageWithOpacity(url, opacity){
    if(!url) return '';
    const alpha = Math.max(0, Math.min(1, Number(opacity)));
    if(alpha >= 0.999) return `url("${url}")`;
    const overlay = (1 - alpha).toFixed(3);
    return `linear-gradient(rgba(255, 255, 255, ${overlay}), rgba(255, 255, 255, ${overlay})), url("${url}")`;
  }
  function hexToRgb(hex){
    const clean = (hex || '').replace('#','').trim();
    if(clean.length === 3){
      const r = parseInt(clean[0] + clean[0], 16);
      const g = parseInt(clean[1] + clean[1], 16);
      const b = parseInt(clean[2] + clean[2], 16);
      return { r, g, b };
    }
    if(clean.length === 6){
      const r = parseInt(clean.slice(0,2), 16);
      const g = parseInt(clean.slice(2,4), 16);
      const b = parseInt(clean.slice(4,6), 16);
      return { r, g, b };
    }
    return { r: 255, g: 255, b: 255 };
  }
  function colorToRgba(hex, opacity){
    const { r, g, b } = hexToRgb(hex);
    const alpha = Math.max(0, Math.min(1, Number(opacity)));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  function parseColorAndOpacity(value, fallbackHex = '#ffffff'){
    if(!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value === 'rgba(0,0,0,0)'){
      return { hex: fallbackHex, opacity: 0, transparent: true };
    }
    if(value[0] === '#'){
      return { hex: colorForPicker(value, fallbackHex), opacity: 1, transparent: false };
    }
    const m = value.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i);
    if(!m){
      return { hex: colorForPicker(value, fallbackHex), opacity: 1, transparent: false };
    }
    const hex = '#' + [1,2,3].map(i => parseInt(m[i],10).toString(16).padStart(2,'0')).join('');
    const alpha = m[4] === undefined ? 1 : Math.max(0, Math.min(1, Number(m[4])));
    return { hex, opacity: alpha, transparent: alpha === 0 };
  }
  function updateOpacityLabel(inputId, labelId){
    const input = safeGet(inputId);
    const label = safeGet(labelId);
    if(!input || !label) return;
    const v = Math.max(0, Math.min(1, Number(input.value || 0)));
    label.textContent = v.toFixed(2);
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

    const bg = el.style.backgroundColor || cs.backgroundColor;
    if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') style.backgroundColor = bg;

    const bgImg = el.style.backgroundImage || cs.backgroundImage;
    if (bgImg && bgImg !== 'none') {
      const existing = stylesMap[sid] || {};
      const bgUrl = existing.backgroundImageUrl || imageUrlFromCss(bgImg);
      const bgOpacity = existing.backgroundImageOpacity !== undefined ? Number(existing.backgroundImageOpacity) : parseImageOpacityFromCss(bgImg);
      style.backgroundImageUrl = bgUrl;
      style.backgroundImageOpacity = bgOpacity;
      style.backgroundImage = bgUrl ? `url("${bgUrl}")` : bgImg;
      style.backgroundSize = el.style.backgroundSize || cs.backgroundSize || 'cover';
      style.backgroundRepeat = el.style.backgroundRepeat || cs.backgroundRepeat || 'no-repeat';
      style.backgroundPosition = el.style.backgroundPosition || cs.backgroundPosition || 'center center';
    }

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

  function normalizeImportedStyles(parsed){
    if(typeof parsed !== 'object' || parsed === null) return null;
    if(parsed.hr_styles && typeof parsed.hr_styles === 'object') return parsed.hr_styles;
    return parsed;
  }

  function importStylesObject(newStyles, options = { overwrite: false }){
    if(typeof newStyles !== 'object' || newStyles === null) return;

    const remappedStyles = {};

    Object.keys(newStyles).forEach(key => {
      const el = pagesContainer && pagesContainer.querySelector(`[data-style-id="${key}"]`);
      if (el) {
        const targetId = el.dataset.styleId || stableFallbackId(el);
        remappedStyles[targetId] = newStyles[key];
      }
    });

    const unmatchedKeys = Object.keys(newStyles).filter(key => !pagesContainer || !pagesContainer.querySelector(`[data-style-id="${key}"]`));

    if (unmatchedKeys.length && pagesContainer) {
      const candidates = Array.from(pagesContainer.querySelectorAll('*')).filter(el => {
        const styleId = el.dataset && el.dataset.styleId ? el.dataset.styleId : stableFallbackId(el);
        return !Object.prototype.hasOwnProperty.call(remappedStyles, styleId);
      });

      let i = 0;
      unmatchedKeys.forEach(key => {
        while (i < candidates.length) {
          const candidate = candidates[i++];
          if (!candidate) continue;
          const targetId = candidate.dataset.styleId || stableFallbackId(candidate);
          candidate.dataset.styleId = targetId;
          remappedStyles[targetId] = newStyles[key];
          break;
        }
      });
    }

    if (options.overwrite) {
      stylesMap = remappedStyles;
    } else {
      stylesMap = Object.assign({}, stylesMap, remappedStyles);
    }

    Object.keys(remappedStyles).forEach(key => {
      const el = pagesContainer && pagesContainer.querySelector(`[data-style-id="${key}"]`);
      if (el) applyStyleToElement(el, remappedStyles[key]);
    });

    saveStyles();
    applyAllStyles();
  }

  // import from file object
function importStylesFile(file, options = { overwrite: false }) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const newStyles = normalizeImportedStyles(parsed);
      if (!newStyles) {
        return alert('Invalid JSON: expected an object mapping style ids to style objects.');
      }

      importStylesObject(newStyles, options);
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
    el.style.backgroundColor = styleObj.backgroundColor || '';
    const imageUrl = styleObj.backgroundImageUrl || imageUrlFromCss(styleObj.backgroundImage || '');
    const imageOpacity = styleObj.backgroundImageOpacity !== undefined ? Number(styleObj.backgroundImageOpacity) : parseImageOpacityFromCss(styleObj.backgroundImage || '');
    el.style.backgroundImage = imageUrl ? buildBackgroundImageWithOpacity(imageUrl, imageOpacity) : '';
    el.style.backgroundSize = styleObj.backgroundSize || '';
    el.style.backgroundRepeat = styleObj.backgroundRepeat || '';
    el.style.backgroundPosition = styleObj.backgroundPosition || '';
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
    if(!node.dataset.styleId) node.dataset.styleId = stableFallbackId(node);
    const sid = node.dataset.styleId;
    if(stylesMap[sid]) applyStyleToElement(node, stylesMap[sid]);
    if(editMode) node.contentEditable = 'true';
    node.querySelectorAll && node.querySelectorAll('*').forEach(child => {
      if(child.nodeType === 1 && !child.dataset.styleId) child.dataset.styleId = stableFallbackId(child);
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
    const ff = safeGet('fontFamily'), fs = safeGet('fontSize'), fc = safeGet('fontColor'), bg = safeGet('bgColor'), bgTransparent = safeGet('bgTransparent'), bgOpacity = safeGet('bgOpacity'), bgImg = safeGet('bgImageUrl'), bgImgOpacity = safeGet('bgImageOpacity'), tf = safeGet('tableFillColor'), tfTransparent = safeGet('tableFillTransparent'), tfOpacity = safeGet('tableFillOpacity'), bt = safeGet('boldToggle'), it = safeGet('italicToggle');
    if(ff) ff.value = el.style.fontFamily || cs.fontFamily || '';
    if(fs) fs.value = parseInt(el.style.fontSize || cs.fontSize || 16, 10);
    if(fc) fc.value = rgbToHex(el.style.color || cs.color || '#000000');
    if(bg || bgTransparent || bgOpacity){
      const parsed = parseColorAndOpacity(el.style.backgroundColor || cs.backgroundColor || '', '#ffffff');
      if(bg) bg.value = parsed.hex;
      if(bgTransparent) bgTransparent.checked = parsed.transparent;
      if(bgOpacity) bgOpacity.value = String(parsed.opacity);
      updateOpacityLabel('bgOpacity', 'bgOpacityValue');
    }
    if(bgImg || bgImgOpacity){
      const sid = el.dataset && el.dataset.styleId ? el.dataset.styleId : '';
      const mapStyle = sid && stylesMap[sid] ? stylesMap[sid] : {};
      const cssBg = el.style.backgroundImage || cs.backgroundImage || '';
      if(bgImg) bgImg.value = mapStyle.backgroundImageUrl || imageUrlFromCss(cssBg);
      if(bgImgOpacity) bgImgOpacity.value = String(mapStyle.backgroundImageOpacity !== undefined ? Number(mapStyle.backgroundImageOpacity) : parseImageOpacityFromCss(cssBg));
      updateOpacityLabel('bgImageOpacity', 'bgImageOpacityValue');
    }
    if(bt) bt.checked = (el.style.fontWeight || cs.fontWeight) >= 700 || el.style.fontWeight === 'bold';
    if(it) it.checked = (el.style.fontStyle || cs.fontStyle) === 'italic';
    if(tf){
      const table = el.matches('table') ? el : el.closest('table') || el.querySelector('table');
      const sample = table ? (table.querySelector('th,td') || table) : el;
      const tcs = window.getComputedStyle(sample);
      const parsed = parseColorAndOpacity(sample.style.backgroundColor || tcs.backgroundColor || '', '#f5f5f5');
      tf.value = parsed.hex;
      if(tfTransparent) tfTransparent.checked = parsed.transparent;
      if(tfOpacity) tfOpacity.value = String(parsed.opacity);
      updateOpacityLabel('tableFillOpacity', 'tableFillOpacityValue');
    }
  }

  function styleFromControls(){
    const style = {};
    const ff = safeGet('fontFamily'), fs = safeGet('fontSize'), fc = safeGet('fontColor'), bg = safeGet('bgColor'), bgTransparent = safeGet('bgTransparent'), bgOpacity = safeGet('bgOpacity'), bgImg = safeGet('bgImageUrl'), bgImgOpacity = safeGet('bgImageOpacity'), bt = safeGet('boldToggle'), it = safeGet('italicToggle');
    if(ff) style.fontFamily = ff.value;
    if(fs) style.fontSize = (parseInt(fs.value, 10) || 12) + 'px';
    if(fc) style.color = fc.value;
    if(bg){
      const isTransparent = !!(bgTransparent && bgTransparent.checked);
      const opacity = bgOpacity ? Number(bgOpacity.value) : 1;
      style.backgroundColor = isTransparent ? 'transparent' : colorToRgba(bg.value, opacity);
    }
    const imageUrl = bgImg ? (bgImg.value || '').trim() : '';
    if(imageUrl){
      const opacity = bgImgOpacity ? Number(bgImgOpacity.value) : 1;
      style.backgroundImageUrl = imageUrl;
      style.backgroundImageOpacity = opacity;
      style.backgroundImage = `url("${imageUrl}")`;
      style.backgroundSize = 'cover';
      style.backgroundRepeat = 'no-repeat';
      style.backgroundPosition = 'center center';
    } else {
      style.backgroundImageUrl = '';
      style.backgroundImageOpacity = 1;
      style.backgroundImage = '';
      style.backgroundSize = '';
      style.backgroundRepeat = '';
      style.backgroundPosition = '';
    }
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
    if(!el.dataset.styleId) el.dataset.styleId = stableFallbackId(el);
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
      if(!m.dataset.styleId) m.dataset.styleId = stableFallbackId(m);
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
      if(!el.dataset.styleId) el.dataset.styleId = stableFallbackId(el);
      stylesMap[el.dataset.styleId] = style;
    });
    saveStyles();
  }

  function applyTableFillToSelected(){
    if(!selectedEls || selectedEls.length === 0) return;
    const fillControl = safeGet('tableFillColor');
    const transparentControl = safeGet('tableFillTransparent');
    const opacityControl = safeGet('tableFillOpacity');
    const fill = fillControl ? fillControl.value : '';
    const fillColor = transparentControl && transparentControl.checked
      ? 'transparent'
      : colorToRgba(fill, opacityControl ? Number(opacityControl.value) : 1);
    if(!fill) return;

    const visited = new Set();
    selectedEls.forEach(el => {
      const tables = [];
      if(el.matches && el.matches('table')) tables.push(el);
      const closest = el.closest && el.closest('table');
      if(closest) tables.push(closest);
      if(el.querySelectorAll) el.querySelectorAll('table').forEach(t => tables.push(t));

      tables.forEach(table => {
        if(!table || visited.has(table)) return;
        visited.add(table);

        const targets = [table].concat(Array.from(table.querySelectorAll('th,td')));
        targets.forEach(target => {
          target.style.backgroundColor = fillColor;
          if(!target.dataset.styleId) target.dataset.styleId = stableFallbackId(target);
          const existing = stylesMap[target.dataset.styleId] || {};
          stylesMap[target.dataset.styleId] = Object.assign({}, existing, { backgroundColor: fillColor });
        });
      });
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
      el.style.backgroundColor = '';
      el.style.backgroundImage = '';
      el.style.backgroundSize = '';
      el.style.backgroundRepeat = '';
      el.style.backgroundPosition = '';
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
    const applyTableFillBtn = safeGet('applyTableFillBtn');
    const resetStyleBtn = safeGet('resetStyleBtn') || safeGet('resetBtnStyle');
    const exportBtn = safeGet('exportStylesBtn') || safeGet('exportBtn');
    const importFileInput = safeGet('importStylesFile') || safeGet('importStylesFile');
    const toggleEditBtn = safeGet('toggleEdit');
    const bgOpacity = safeGet('bgOpacity');
    const bgImageOpacity = safeGet('bgImageOpacity');
    const tableFillOpacity = safeGet('tableFillOpacity');

    updateOpacityLabel('bgOpacity', 'bgOpacityValue');
    updateOpacityLabel('bgImageOpacity', 'bgImageOpacityValue');
    updateOpacityLabel('tableFillOpacity', 'tableFillOpacityValue');

    // ensure all existing nodes inside pages get style IDs and apply loaded styles
    if(pagesContainer) pagesContainer.querySelectorAll('*').forEach(node => { if(node.nodeType===1 && !node.dataset.styleId) node.dataset.styleId = stableFallbackId(node); });
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
    applyTableFillBtn && applyTableFillBtn.addEventListener('click', applyTableFillToSelected);
    resetStyleBtn && resetStyleBtn.addEventListener('click', resetSelected);
    toggleEditBtn && toggleEditBtn.addEventListener('click', () => setEditMode(!editMode));

    // export/import wiring
    exportBtn && exportBtn.addEventListener('click', () => exportStylesToFile('styles.json'));
    if(importFileInput){
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
            if(!el.dataset.styleId) el.dataset.styleId = stableFallbackId(el);
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
    const liveApplyTableFill = debounce(() => { if(selectedEls.length) applyTableFillToSelected(); }, 120);
    const ff = safeGet('fontFamily'), fs = safeGet('fontSize'), fc = safeGet('fontColor'), bg = safeGet('bgColor'), bgTransparent = safeGet('bgTransparent'), bgImg = safeGet('bgImageUrl'), bt = safeGet('boldToggle'), it = safeGet('italicToggle'), tfTransparent = safeGet('tableFillTransparent');
    if(ff) ff.addEventListener('change', liveApply);
    if(fs) fs.addEventListener('input', liveApply);
    if(fc) fc.addEventListener('input', liveApply);
    if(bg) bg.addEventListener('input', liveApply);
    if(bgTransparent) bgTransparent.addEventListener('change', liveApply);
    if(bgOpacity) {
      bgOpacity.addEventListener('input', () => {
        updateOpacityLabel('bgOpacity', 'bgOpacityValue');
        liveApply();
      });
    }
    if(bgImg) bgImg.addEventListener('change', liveApply);
    if(bgImageOpacity) {
      bgImageOpacity.addEventListener('input', () => {
        updateOpacityLabel('bgImageOpacity', 'bgImageOpacityValue');
        liveApply();
      });
    }
    if(bt) bt.addEventListener('change', liveApply);
    if(it) it.addEventListener('change', liveApply);
    const tableFillColor = safeGet('tableFillColor');
    if(tableFillColor) tableFillColor.addEventListener('input', liveApplyTableFill);
    if(tableFillOpacity) {
      tableFillOpacity.addEventListener('input', () => {
        updateOpacityLabel('tableFillOpacity', 'tableFillOpacityValue');
        liveApplyTableFill();
      });
    }
    if(tfTransparent) tfTransparent.addEventListener('change', () => {
      updateOpacityLabel('tableFillOpacity', 'tableFillOpacityValue');
      liveApplyTableFill();
    });

    updateSelectedInfo();

    // When imports write to localStorage, they dispatch localStorageImported. Reload styles from storage then apply.
    window.addEventListener('localStorageImported', () => {
      console.log('localStorageImported: reloading styles and applying them');
      loadStyles();
      applyAllStyles();
    });
  }

  // expose API for debugging
  window.hrEditor.exportToFile = exportStylesToFile;
  window.hrEditor.importFromObject = (obj, options = { overwrite: false }) => {
    if(typeof obj !== 'object' || obj === null) throw new Error('importFromObject expects an object mapping');
    importStylesObject(normalizeImportedStyles(obj), options);
  };
  window.hrEditor.getStyles = () => stylesMap;

  // start
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

})();