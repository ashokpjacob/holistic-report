// assets/js/editor.js
// Robust editor that works with script.js-generated content.
// Drop this in (replace existing editor.js). It will:
// - use #pages as the A4 container if #a4-editor is missing
// - create a minimal sidebar if none exists
// - attach selection/edit behavior with drag-detection to avoid conflicts
// - persist styles to localStorage under key "hr_styles"

(() => {
  const STORAGE_KEY = 'hr_styles';
  let stylesMap = {};
  let nextId = Date.now();

  function genId(){ return 's' + (nextId++); }

  // --- Utility helpers ---
  function safeGet(id){ return document.getElementById(id) || null; }
  function rgbToHex(rgb){
    if(!rgb) return '#000000';
    if(rgb[0] === '#') return rgb;
    const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if(!m) return rgb;
    return '#' + [1,2,3].map(i => parseInt(m[i],10).toString(16).padStart(2,'0')).join('');
  }

  // --- Load / Save styles ---
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

  // --- Create minimal sidebar if missing ---
  function createSidebarIfMissing(){
    if (safeGet('sidebar')) return; // exists
    const aside = document.createElement('aside');
    aside.id = 'sidebar';
    aside.style.cssText = 'position:fixed;right:0;top:0;width:260px;height:100vh;background:#fff;border-left:1px solid #e6e9ef;padding:12px;overflow:auto;z-index:9999;';
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

  // --- Script-wide state ---
  let selectedEl = null;
  let a4 = null; // container for pages
  let editMode = false;
  window.hrEditor = window.hrEditor || {};
  window.hrEditor.isDragging = false;

  // --- Apply style object to an element ---
  function applyStyleToElement(el, styleObj){
    if(!el || !styleObj) return;
    if(styleObj.fontFamily) el.style.fontFamily = styleObj.fontFamily;
    else el.style.fontFamily = '';
    if(styleObj.fontSize) el.style.fontSize = styleObj.fontSize;
    else el.style.fontSize = '';
    if(styleObj.color) el.style.color = styleObj.color;
    else el.style.color = '';
    el.style.fontWeight = styleObj.fontWeight || '';
    el.style.fontStyle = styleObj.fontStyle || '';
  }

  // --- Ensure nodes have data-style-id and apply saved styles ---
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

  // --- Selection UI ---
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

  function selectElement(el){
    if(window.hrEditor.isDragging) return; // don't select while dragging
    if(selectedEl) selectedEl.classList && selectedEl.classList.remove('selected-outline');
    selectedEl = el;
    if(!selectedEl) return safeGet('selectedInfo') && (safeGet('selectedInfo').textContent = 'No selection');
    selectedEl.classList && selectedEl.classList.add('selected-outline');
    if(!selectedEl.dataset.styleId) selectedEl.dataset.styleId = genId();
    const sid = selectedEl.dataset.styleId;
    safeGet('selectedInfo') && (safeGet('selectedInfo').innerHTML = `Selected: &lt;${selectedEl.tagName.toLowerCase()}&gt; id=${sid}`);
    populateControlsFromElement(selectedEl);
  }

  function deselect(){
    if(selectedEl) selectedEl.classList && selectedEl.classList.remove('selected-outline');
    selectedEl = null;
    safeGet('selectedInfo') && (safeGet('selectedInfo').textContent = 'No selection');
  }

  // --- Apply / Reset handlers ---
  function applyToSelected(){
    if(!selectedEl) return alert('Select an element first');
    const style = styleFromControls();
    applyStyleToElement(selectedEl, style);
    stylesMap[selectedEl.dataset.styleId] = style;
    saveStyles();
  }
  function resetSelected(){
    if(!selectedEl) return;
    selectedEl.style.fontFamily = '';
    selectedEl.style.fontSize = '';
    selectedEl.style.color = '';
    selectedEl.style.fontWeight = '';
    selectedEl.style.fontStyle = '';
    const sid = selectedEl.dataset.styleId;
    if(sid && stylesMap[sid]) { delete stylesMap[sid]; saveStyles(); }
    populateControlsFromElement(selectedEl);
  }

  // --- Toggle edit mode ---
  function setEditMode(on){
    editMode = !!on;
    if(a4) a4.querySelectorAll('*').forEach(el => { if(el.nodeType===1) el.contentEditable = editMode ? 'true' : 'false'; });
    const btn = safeGet('toggleEdit');
    if(btn) btn.textContent = editMode ? 'Exit Edit Mode' : 'Toggle Edit Mode';
  }

  // --- Mutation observer for dynamically created content ---
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

  // --- Safe initialization after DOM ready ---
  function initEditor(){
    loadStyles();
    createSidebarIfMissing();

    // find container: prefer #a4-editor, fallback to #pages
    a4 = safeGet('a4-editor') || safeGet('pages');
    if(!a4){
      console.error('hr editor: no A4 container found (#a4-editor or #pages). Editor will not attach.');
      return;
    }

    // Add selected-outline style if missing
    const styleTag = document.createElement('style');
    styleTag.textContent = `.selected-outline{outline:3px dashed rgba(0,120,255,0.6);outline-offset:-4px}`;
    document.head.appendChild(styleTag);

    // ensure pre-existing nodes have ids and styles applied
    a4.querySelectorAll('*').forEach(node => { if(node.nodeType===1 && !node.dataset.styleId) node.dataset.styleId = genId(); });
    Object.keys(stylesMap).forEach(id => {
      const el = a4.querySelector(`[data-style-id="${id}"]`);
      if(el) applyStyleToElement(el, stylesMap[id]);
    });

    // click selection: delegation on container (click, not mousedown)
    a4.addEventListener('click', e => {
      // if click on sidebar etc, ignore
      if(!a4.contains(e.target)) return;
      // allow selection only on element nodes
      let target = e.target;
      // don't select the page container itself
      if(target === a4) return deselect();
      selectElement(target);
      e.stopPropagation();
    });

    // small heuristic: detect dragging started on .drag-handle to avoid selection during drag
    document.addEventListener('mousedown', e => {
      if(e.target.closest && e.target.closest('.drag-handle')){
        window.hrEditor.isDragging = true;
      }
    });
    document.addEventListener('mouseup', () => { window.hrEditor.isDragging = false; });

    // wire UI controls (safely)
    const applyBtn = safeGet('applyBtn');
    const resetBtnStyle = safeGet('resetBtnStyle');
    const exportBtnStyle = safeGet('exportBtnStyle'); // optional
    const importFileStyle = safeGet('importFileStyle'); // optional
    const toggleEditBtn = safeGet('toggleEdit');

    applyBtn && applyBtn.addEventListener('click', applyToSelected);
    resetBtnStyle && resetBtnStyle.addEventListener('click', resetSelected);
    toggleEditBtn && toggleEditBtn.addEventListener('click', () => setEditMode(!editMode));

    // keyboard: delete selection with Escape
    document.addEventListener('keydown', e => { if(e.key === 'Escape') deselect(); });

    // make sure nodes added by script.js get ids/styles and are editable if editMode
    startObserver();

    // expose API
    window.hrEditor.applyAllStyles = () => {
      Object.keys(stylesMap).forEach(id => {
        const el = a4.querySelector(`[data-style-id="${id}"]`);
        if(el) applyStyleToElement(el, stylesMap[id]);
      });
    };
    window.hrEditor.getStyles = () => stylesMap;
    window.hrEditor.saveStyles = saveStyles;

    // initial info
    safeGet('selectedInfo') && (safeGet('selectedInfo').textContent = 'No selection');
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initEditor);
  else initEditor();

})();