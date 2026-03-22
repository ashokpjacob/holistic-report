// assets/js/editor.js
// Editor with multi-select and Ctrl/Command+click "select all same tag" behavior.
// Drop this in (replace existing editor.js). Requires script.js to run earlier (defer ordering).

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

  function createSidebarIfMissing(){
    if (safeGet('sidebar')) return;
    const aside = document.createElement('aside');
    aside.id = 'sidebar';
    aside.style.cssText = 'position:fixed;right:0;top:0;width:300px;height:100vh;background:#fff;border-left:1px solid #e6e9ef;padding:12px;overflow:auto;z-index:9999;';
    aside.innerHTML = `
      <h3 style="margin-top:0">Style</h3>
      <div class="control"><label>Font</label>
        <select id="fontFamily" style="width:100%;padding:6px;border:1px solid #ddd">
          <option value="Arial, Helvetica, sans-serif">Arial</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Times New Roman', Times, serif">Times New Roman</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="system-ui, -apple-system, 'Segoe UI', Roboto">System UI</option>
        </select>
      </div>
      <div class="control"><label>Size (px)</label><input id="fontSize" type="number" min="6" max="200" style="width:100%;padding:6px;border:1px solid #ddd"/></div>
      <div class="control"><label>Color</label><input id="fontColor" type="color" style="width:100%"/></div>
      <div class="control"><label><input id="boldToggle" type="checkbox"/> Bold</label> <label style="margin-left:8px"><input id="italicToggle" type="checkbox"/> Italic</label></div>
      <div style="margin-top:8px"><button id="applyBtn" style="padding:6px 10px;margin-right:6px">Apply</button><button id="resetBtnStyle" style="padding:6px 10px">Reset</button></div>
      <hr/>
      <div style="margin-top:8px"><button id="toggleEdit" style="padding:6px 10px">Toggle Edit Mode</button></div>
      <div id="selectedInfo" style="font-size:12px;color:#666;margin-top:8px">No selection</div>
    `;
    document.body.appendChild(aside);
  }

  // --- state ---
  let a4 = null;
  let editMode = false;
  let selectedEls = []; // array of selected elements
  window.hrEditor = window.hrEditor || {};
  window.hrEditor.isDragging = false;

  function applyStyleToElement(el, styleObj){
    if(!el || !styleObj) return;
    if(styleObj.fontFamily) el.style.fontFamily = styleObj.fontFamily; else el.style.fontFamily = '';
    if(styleObj.fontSize) el.style.fontSize = styleObj.fontSize; else el.style.fontSize = '';
    if(styleObj.color) el.style.color = styleObj.color; else el.style.color = '';
    el.style.fontWeight = styleObj.fontWeight || '';
    el.style.fontStyle = styleObj.fontStyle || '';
  }

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

  function populateControlsFromElement(el){
    if(!el) return;
    const cs = window.getComputedStyle(el);
    safeGet('fontFamily') && (safeGet('fontFamily').value = el.style.fontFamily || cs.fontFamily || '');
    safeGet('fontSize') && (safeGet('fontSize').value = parseInt(el.style.fontSize || cs.fontSize || 16, 10));
    safeGet('fontColor') && (safeGet('fontColor').value = rgbToHex(el.style.color || cs.color || '#000000'));
    safeGet('boldToggle') && (safeGet('boldToggle').checked = (el.style.fontWeight || cs.fontWeight) >= 700 || el.style.fontWeight === 'bold');
    safeGet('italicToggle') && (safeGet('italicToggle').checked = (el.style.fontStyle || cs.fontStyle) === 'italic');
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
    if(!a4 || !el) return;
    const tag = el.tagName;
    const matches = Array.from(a4.querySelectorAll(tag));
    if(matches.length === 0) return;
    clearSelectionVisuals();
    selectedEls = [];
    matches.forEach(m => {
      if(!m.dataset.styleId) m.dataset.styleId = genId();
      m.classList && m.classList.add('selected-outline');
      selectedEls.push(m);
    });
    // Populate controls from first element
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
    if(a4) a4.querySelectorAll('*').forEach(el => { if(el.nodeType===1) el.contentEditable = editMode ? 'true' : 'false'; });
    const btn = safeGet('toggleEdit');
    if(btn) btn.textContent = editMode ? 'Exit Edit Mode' : 'Toggle Edit Mode';
  }

  let mo = null;
  function startObserver(){
    if(!a4) return;
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
    mo.observe(a4, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-style-id'] });
  }

  function debounce(fn, wait){ let t; return function(...args){ clearTimeout(t); t = setTimeout(() => fn.apply(this, args), wait); }; }

  function initEditor(){
    loadStyles();
    createSidebarIfMissing();

    a4 = safeGet('a4-editor') || safeGet('pages');
    if(!a4){
      console.error('hr editor: no A4 container found (#a4-editor or #pages). Editor will not attach.');
      return;
    }

    // selected-outline style
    const styleTag = document.createElement('style');
    styleTag.textContent = `.selected-outline{outline:3px dashed rgba(0,120,255,0.6);outline-offset:-4px}`;
    document.head.appendChild(styleTag);

    // ensure ids and apply saved styles
    a4.querySelectorAll('*').forEach(node => { if(node.nodeType===1 && !node.dataset.styleId) node.dataset.styleId = genId(); });
    Object.keys(stylesMap).forEach(id => {
      const el = a4.querySelector(`[data-style-id="${id}"]`);
      if(el) applyStyleToElement(el, stylesMap[id]);
    });

    // click handler: support ctrl/meta to select all same-tag
    a4.addEventListener('click', e => {
      if(!a4.contains(e.target)) return;
      if(window.hrEditor.isDragging) return; // ignore during drag
      // ctrlKey for Windows/Linux, metaKey for Mac
      const ctrl = e.ctrlKey || e.metaKey;
      const target = e.target;
      if(target === a4){ deselectAll(); return; }
      if(ctrl){
        selectAllSameTag(target);
      } else {
        selectSingleElement(target);
      }
      e.stopPropagation();
    });

    // detect drag starts to avoid click selection during drags
    document.addEventListener('mousedown', e => {
      if(e.target.closest && e.target.closest('.drag-handle')){
        window.hrEditor.isDragging = true;
      }
    });
    document.addEventListener('mouseup', () => { window.hrEditor.isDragging = false; });

    // UI wiring
    const applyBtn = safeGet('applyBtn');
    const resetBtnStyle = safeGet('resetBtnStyle');
    const toggleEditBtn = safeGet('toggleEdit');

    applyBtn && applyBtn.addEventListener('click', applyToSelected);
    resetBtnStyle && resetBtnStyle.addEventListener('click', resetSelected);
    toggleEditBtn && toggleEditBtn.addEventListener('click', () => setEditMode(!editMode));

    // keyboard shortcuts
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') deselectAll();
      if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a'){ // Ctrl/Cmd+A -> select all elements in a4
        e.preventDefault();
        // select all top-level elements inside a4 (or all elements)
        const all = Array.from(a4.querySelectorAll('*')).filter(n => n.nodeType === 1);
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

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initEditor);
  else initEditor();

})();