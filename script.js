// Parse CSV
function parseCSV(text) {
  const rows = text.trim().split("\n");
  const headers = rows[0].split(",");
  return rows.slice(1).map(row => {
    const values = row.split(",");
    let obj = {};
    headers.forEach((h, i) => obj[h.trim()] = values[i] ? values[i].trim() : "");
    return obj;
  });
}

function slugifyStylePart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'item';
}

function makeStyleId(...parts) {
  return ['sid'].concat(parts.map(slugifyStylePart)).join('__');
}

const HEADER_FOOTER_KEY = 'hr_header_footer';
const HEADER_FOOTER_POPUP_URL = 'assets/header-footer-settings.html';
let headerFooterWindow = null;

function defaultHeaderFooterSettings() {
  return {
    showPageNumber: true,
    header: {
      enabled: false,
      height: 48,
      transparent: true,
      bgColor: '#ffffff',
      bgOpacity: 1,
      imageUrl: '',
      imageOpacity: 1,
      imageSizeMode: 'cover',
      imageSizeX: 100,
      imageSizeY: 100,
      imagePosX: 50,
      imagePosY: 50,
      imageRepeat: 'no-repeat'
    },
    footer: {
      enabled: false,
      height: 48,
      transparent: true,
      bgColor: '#ffffff',
      bgOpacity: 1,
      imageUrl: '',
      imageOpacity: 1,
      imageSizeMode: 'cover',
      imageSizeX: 100,
      imageSizeY: 100,
      imagePosX: 50,
      imagePosY: 50,
      imageRepeat: 'no-repeat'
    }
  };
}

function clampNum(value, min, max, fallback = min) {
  const n = Number(value);
  const v = Number.isFinite(n) ? n : fallback;
  return Math.max(min, Math.min(max, v));
}

function hexToRgb(hex) {
  const clean = String(hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16)
    };
  }
  if (clean.length === 6) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16)
    };
  }
  return { r: 255, g: 255, b: 255 };
}

function colorToRgba(hex, opacity) {
  const { r, g, b } = hexToRgb(hex);
  const a = clampNum(opacity, 0, 1, 1);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function normalizeSection(section) {
  const src = section && typeof section === 'object' ? section : {};
  const mode = ['cover', 'contain', 'custom'].includes(src.imageSizeMode) ? src.imageSizeMode : 'cover';
  return {
    enabled: !!src.enabled,
    height: clampNum(src.height, 20, 220, 48),
    transparent: !!src.transparent,
    bgColor: src.bgColor || '#ffffff',
    bgOpacity: clampNum(src.bgOpacity, 0, 1, 1),
    imageUrl: String(src.imageUrl || '').trim(),
    imageOpacity: clampNum(src.imageOpacity, 0, 1, 1),
    imageSizeMode: mode,
    imageSizeX: clampNum(src.imageSizeX, 10, 300, 100),
    imageSizeY: clampNum(src.imageSizeY, 10, 300, 100),
    imagePosX: clampNum(src.imagePosX, 0, 100, 50),
    imagePosY: clampNum(src.imagePosY, 0, 100, 50),
    imageRepeat: ['no-repeat', 'repeat', 'repeat-x', 'repeat-y'].includes(src.imageRepeat) ? src.imageRepeat : 'no-repeat'
  };
}

function normalizeHeaderFooterSettings(input) {
  const src = input && typeof input === 'object' ? input : {};
  return {
    showPageNumber: src.showPageNumber !== false,
    header: normalizeSection(src.header),
    footer: normalizeSection(src.footer)
  };
}

function loadHeaderFooterSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HEADER_FOOTER_KEY) || 'null');
    return normalizeHeaderFooterSettings(parsed || defaultHeaderFooterSettings());
  } catch (_) {
    return normalizeHeaderFooterSettings(defaultHeaderFooterSettings());
  }
}

function saveHeaderFooterSettings(cfg) {
  const normalized = normalizeHeaderFooterSettings(cfg);
  localStorage.setItem(HEADER_FOOTER_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new Event('hrLayoutChanged'));
  return normalized;
}

function buildImageFromSectionCfg(section) {
  if (!section.imageUrl) return '';
  const alpha = clampNum(section.imageOpacity, 0, 1, 1);
  if (alpha >= 0.999) return `url("${section.imageUrl}")`;
  const overlay = (1 - alpha).toFixed(3);
  return `linear-gradient(rgba(255, 255, 255, ${overlay}), rgba(255, 255, 255, ${overlay})), url("${section.imageUrl}")`;
}

function sectionStyleCfg(section) {
  const size = section.imageSizeMode === 'custom' ? `${section.imageSizeX}% ${section.imageSizeY}%` : section.imageSizeMode;
  return {
    backgroundColor: section.transparent ? 'transparent' : colorToRgba(section.bgColor, section.bgOpacity),
    backgroundImage: buildImageFromSectionCfg(section),
    backgroundSize: size,
    backgroundPosition: `${section.imagePosX}% ${section.imagePosY}%`,
    backgroundRepeat: section.imageRepeat
  };
}

function ensurePageSection(page, className, styleId, heightPx, styleCfg) {
  let el = page.querySelector(`.${className}`);
  if (!el) {
    el = document.createElement('div');
    el.className = className;
    page.appendChild(el);
  }
  el.dataset.styleId = styleId;
  el.style.height = `${heightPx}px`;
  el.style.backgroundColor = styleCfg.backgroundColor;
  el.style.backgroundImage = styleCfg.backgroundImage || '';
  el.style.backgroundSize = styleCfg.backgroundSize;
  el.style.backgroundPosition = styleCfg.backgroundPosition;
  el.style.backgroundRepeat = styleCfg.backgroundRepeat;
  return el;
}

function applyHeaderFooterToPage(page, pageIndex, settings) {
  if (!page) return;
  const cfg = normalizeHeaderFooterSettings(settings || loadHeaderFooterSettings());
  const headerId = makeStyleId('page', pageIndex, 'header');
  const footerId = makeStyleId('page', pageIndex, 'footer');
  const pageNumberId = makeStyleId('page', pageIndex, 'footer', 'page-number');

  const existingHeader = page.querySelector('.page-header');
  if (!cfg.header.enabled) {
    if (existingHeader) existingHeader.remove();
  } else {
    const headerStyle = sectionStyleCfg(cfg.header);
    ensurePageSection(page, 'page-header', headerId, cfg.header.height, headerStyle);
  }

  const existingFooter = page.querySelector('.page-footer');
  if (!cfg.footer.enabled) {
    if (existingFooter) existingFooter.remove();
  } else {
    const footerStyle = sectionStyleCfg(cfg.footer);
    const footer = ensurePageSection(page, 'page-footer', footerId, cfg.footer.height, footerStyle);
    let num = footer.querySelector('.page-number');
    if (!num) {
      num = document.createElement('span');
      num.className = 'page-number';
      footer.appendChild(num);
    }
    num.dataset.styleId = pageNumberId;
    num.textContent = `Page ${pageIndex + 1}`;
    num.style.display = cfg.showPageNumber ? 'inline' : 'none';
  }
}

function applyHeaderFooterToAllPages(settings) {
  const cfg = normalizeHeaderFooterSettings(settings || loadHeaderFooterSettings());
  const pages = Array.from(document.querySelectorAll('.a4-page'));
  pages.forEach((page, idx) => applyHeaderFooterToPage(page, idx, cfg));
}

function pushHeaderFooterStateToPopup() {
  if (!headerFooterWindow || headerFooterWindow.closed) return;
  try {
    headerFooterWindow.postMessage({ type: 'hr-header-footer-state', payload: loadHeaderFooterSettings() }, '*');
  } catch (e) {
    console.warn('Unable to sync header/footer popup state', e);
  }
}

function openHeaderFooterSettingsPopup() {
  if (!headerFooterWindow || headerFooterWindow.closed) {
    headerFooterWindow = window.open(HEADER_FOOTER_POPUP_URL, 'hrHeaderFooterSettings', 'width=820,height=760,resizable=yes,scrollbars=yes');
  } else {
    headerFooterWindow.focus();
  }
  setTimeout(pushHeaderFooterStateToPopup, 120);
}

// Load CSV file
fetch("holistic.csv")
  .then(response => response.text())
  .then(text => {
    const data = parseCSV(text);
    const grouped = {};
    data.forEach(row => {
      if (!grouped[row.Domain]) grouped[row.Domain] = {};
      if (!grouped[row.Domain][row.Subject]) grouped[row.Domain][row.Subject] = [];
      grouped[row.Domain][row.Subject].push(row);
    });
    buildPages(grouped);
  });

function buildPages(grouped) {
  const pagesContainer = document.getElementById("pages");
  pagesContainer.innerHTML = "";
  let savedLayout = {};
  try { savedLayout = JSON.parse(localStorage.getItem("domainLayout")) || {}; } catch (_) { savedLayout = {}; }
  const domains = Object.keys(grouped);
  const perPage = 6;
  const headerFooterCfg = loadHeaderFooterSettings();
  const headerTopOffset = headerFooterCfg.header.enabled ? Math.max(20, Number(headerFooterCfg.header.height || 0) + 8) : 20;

  for (let i=0; i<domains.length; i+=perPage) {
    const pageIndex = Math.floor(i / perPage);
    const page = document.createElement("div");
    page.className = "a4-page";
    page.dataset.styleId = makeStyleId('page', pageIndex);
    pagesContainer.appendChild(page);

    const hGuide = document.createElement("div");
    hGuide.className = "guide-line horizontal";
    hGuide.dataset.styleId = makeStyleId('page', pageIndex, 'guide-horizontal');
    page.appendChild(hGuide);
    const vGuide = document.createElement("div");
    vGuide.className = "guide-line vertical";
    vGuide.dataset.styleId = makeStyleId('page', pageIndex, 'guide-vertical');
    page.appendChild(vGuide);

    const slice = domains.slice(i,i+perPage);
    slice.forEach((domain, idx) => {
      const domainKey = makeStyleId('page', pageIndex, 'domain', domain);
      const domainDiv = document.createElement("div");
      domainDiv.className = "domain";
      domainDiv.dataset.domain = domain;
      domainDiv.dataset.styleId = domainKey;

      const col = idx % 2;
      const row = Math.floor(idx/2);
      const defaultTop = headerTopOffset + row*95;
      const defaultLeft = 20 + col*100;

      if (savedLayout[domain]) {
        domainDiv.style.top = savedLayout[domain].top + "px";
        domainDiv.style.left = savedLayout[domain].left + "px";
        domainDiv.style.height = savedLayout[domain].height + "px";
      } else {
        domainDiv.style.top = defaultTop + "px";
        domainDiv.style.left = defaultLeft + "px";
        domainDiv.style.height = "150px";
      }

      const dragHandle = document.createElement("div");
      dragHandle.className = "drag-handle";
      dragHandle.textContent = domain;
      dragHandle.dataset.styleId = makeStyleId(domainKey, 'drag-handle');
      domainDiv.appendChild(dragHandle);

      const topHandle = document.createElement("div");
      topHandle.className = "resize-handle resize-top";
      topHandle.dataset.styleId = makeStyleId(domainKey, 'resize-top');
      domainDiv.appendChild(topHandle);
      const bottomHandle = document.createElement("div");
      bottomHandle.className = "resize-handle resize-bottom";
      bottomHandle.dataset.styleId = makeStyleId(domainKey, 'resize-bottom');
      domainDiv.appendChild(bottomHandle);

      let subjectIndex = 0;
      for (const subject in grouped[domain]) {
        const subjectKey = makeStyleId(domainKey, 'subject', subjectIndex, subject);
        const h3 = document.createElement("h3");
        h3.textContent = subject;
        h3.dataset.styleId = makeStyleId(subjectKey, 'heading');
        domainDiv.appendChild(h3);

        const table = document.createElement("table");
        table.dataset.styleId = makeStyleId(subjectKey, 'table');
        const header = document.createElement("tr");
        header.dataset.styleId = makeStyleId(subjectKey, 'header-row');
        ["Competency","Grading"].forEach(col=>{
          const th=document.createElement("th"); th.textContent=col; th.dataset.styleId = makeStyleId(subjectKey, 'header-cell', col); header.appendChild(th);
        });
        table.appendChild(header);

        grouped[domain][subject].forEach((row, rowIndex)=>{
          const tr=document.createElement("tr");
          tr.dataset.styleId = makeStyleId(subjectKey, 'row', rowIndex);
          const td1=document.createElement("td"); td1.textContent=row.Competency+" – "+row.Description; td1.dataset.styleId = makeStyleId(subjectKey, 'row', rowIndex, 'competency');
          const td2=document.createElement("td"); td2.textContent=row.Grading; td2.dataset.styleId = makeStyleId(subjectKey, 'row', rowIndex, 'grading');
          tr.appendChild(td1); tr.appendChild(td2);
          table.appendChild(tr);
        });
        domainDiv.appendChild(table);
        subjectIndex++;
      }

      page.appendChild(domainDiv);
      attachDragResize(domainDiv, dragHandle, topHandle, bottomHandle, savedLayout, page, hGuide, vGuide);
    });
  }

  applyHeaderFooterToAllPages(headerFooterCfg);
}

function attachDragResize(domainDiv, dragHandle, topHandle, bottomHandle, savedLayout, page, hGuide, vGuide) {
  const body = document.body;

  // Drag logic with snap guides
  dragHandle.addEventListener("mousedown", e=>{
    e.preventDefault();
    body.style.cursor = "move";
    const startX=e.clientX, startY=e.clientY;
    const startTop=domainDiv.offsetTop, startLeft=domainDiv.offsetLeft;
    function onMove(ev){
      let newTop = startTop + ev.clientY - startY;
      let newLeft = startLeft + ev.clientX - startX;
      const snap = 10;
      const pageCenterX = page.offsetWidth / 2;
      const pageCenterY = page.offsetHeight / 2;

      if (Math.abs(newLeft + domainDiv.offsetWidth/2 - pageCenterX) < snap) {
        newLeft = pageCenterX - domainDiv.offsetWidth/2;
        vGuide.style.left = pageCenterX + "px";
        vGuide.style.display = "block";
      } else {
        vGuide.style.display = "none";
      }

      if (Math.abs(newTop + domainDiv.offsetHeight/2 - pageCenterY) < snap) {
        newTop = pageCenterY - domainDiv.offsetHeight/2;
        hGuide.style.top = pageCenterY + "px";
        hGuide.style.display = "block";
      } else {
        hGuide.style.display = "none";
      }

      domainDiv.style.top = newTop + "px";
      domainDiv.style.left = newLeft + "px";
    }
    function onUp(){
      document.removeEventListener("mousemove",onMove);
      document.removeEventListener("mouseup",onUp);
      hGuide.style.display = "none";
      vGuide.style.display = "none";
      body.style.cursor = "";
      saveLayout(domainDiv, savedLayout);
    }
    document.addEventListener("mousemove",onMove);
    document.addEventListener("mouseup",onUp);
  });

  // Resize logic
  [topHandle,bottomHandle].forEach(handle=>{
    handle.addEventListener("mousedown", e=>{
      e.preventDefault();
      body.style.cursor = "ns-resize";
      const startY=e.clientY;
      const startHeight=domainDiv.offsetHeight;
      const startTop=domainDiv.offsetTop;
      function onMove(ev){
                if(handle.classList.contains("resize-bottom")){
          domainDiv.style.height=(startHeight+(ev.clientY-startY))+"px";
        } else {
          const newHeight=startHeight-(ev.clientY-startY);
          if(newHeight>50){
            domainDiv.style.height=newHeight+"px";
            domainDiv.style.top=(startTop+(ev.clientY-startY))+"px";
          }
        }

        // Snap guide for resize height to page center
        const snap = 10;
        const pageCenterY = page.offsetHeight / 2;
        if (Math.abs(domainDiv.offsetTop + domainDiv.offsetHeight/2 - pageCenterY) < snap) {
          hGuide.style.top = pageCenterY + "px";
          hGuide.style.display = "block";
        } else {
          hGuide.style.display = "none";
        }
      }
      function onUp(){
        document.removeEventListener("mousemove",onMove);
        document.removeEventListener("mouseup",onUp);
        hGuide.style.display = "none";
        vGuide.style.display = "none";
        body.style.cursor = "";
        saveLayout(domainDiv, savedLayout);
      }
      document.addEventListener("mousemove",onMove);
      document.addEventListener("mouseup",onUp);
    });
  });
}

function saveLayout(el, savedLayout){
  const domain=el.dataset.domain;
  savedLayout[domain]={
    top:el.offsetTop,
    left:el.offsetLeft,
    height:el.offsetHeight
  };
  localStorage.setItem("domainLayout",JSON.stringify(savedLayout));
  window.dispatchEvent(new Event('hrLayoutChanged'));
}

// Reset button
document.getElementById("resetBtn").addEventListener("click", ()=>{
  localStorage.removeItem("domainLayout");
  localStorage.removeItem("hr_styles");
  localStorage.removeItem("hr_header_footer");
  location.reload();
});

// Print button
document.getElementById("printBtn").addEventListener("click", ()=>{
  window.print();
});

// Combined export/import utilities with hint matching

window.hrIO = window.hrIO || {};
window.hrHistory = window.hrHistory || {};

/* Helpers for hint system */

function firstTextSnippet(el, maxLen = 60) {
  if (!el) return '';
  // prefer text nodes of the element itself or the first non-empty descendant text
  const text = (el.textContent || '').trim().replace(/\s+/g, ' ');
  if (!text) return '';
  return text.length > maxLen ? text.slice(0, maxLen).trim() : text;
}

function nearestAncestorDomain(el) {
  let cur = el;
  while (cur) {
    if (cur.dataset && cur.dataset.domain) return cur.dataset.domain;
    cur = cur.parentElement;
  }
  return null;
}

function imageUrlFromCss(bgImage) {
  if (!bgImage || bgImage === 'none') return '';
  const matches = bgImage.match(/url\(["']?(.*?)["']?\)/ig);
  if (!matches || !matches.length) return '';
  const last = matches[matches.length - 1];
  const m = last.match(/url\(["']?(.*?)["']?\)/i);
  return m ? m[1] : '';
}

function parseImageOpacityFromCss(bgImage) {
  if (!bgImage || bgImage === 'none') return 1;
  const m = bgImage.match(/linear-gradient\(rgba\(255,\s*255,\s*255,\s*([\d.]+)\)/i);
  if (!m) return 1;
  const overlay = Math.max(0, Math.min(1, Number(m[1])));
  return Math.max(0, Math.min(1, 1 - overlay));
}

function jsonEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function snapshotCurrentState() {
  const domainLayout = collectCurrentLayout();
  const { stylesMap } = collectCurrentStylesAndHints();
  const headerFooter = loadHeaderFooterSettings();
  return { domainLayout, hr_styles: stylesMap, header_footer: headerFooter };
}

function applyHistorySnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== 'object') return;
  const layout = snapshot.domainLayout && typeof snapshot.domainLayout === 'object' ? snapshot.domainLayout : {};
  const styles = snapshot.hr_styles && typeof snapshot.hr_styles === 'object' ? snapshot.hr_styles : {};
  const headerFooter = snapshot.header_footer && typeof snapshot.header_footer === 'object'
    ? normalizeHeaderFooterSettings(snapshot.header_footer)
    : loadHeaderFooterSettings();

  localStorage.setItem('domainLayout', JSON.stringify(layout));
  localStorage.setItem('hr_styles', JSON.stringify(styles));
  localStorage.setItem(HEADER_FOOTER_KEY, JSON.stringify(headerFooter));
  applyLayoutToDOM(layout);
  applyHeaderFooterToAllPages(headerFooter);

  try {
    if (window.hrEditor && typeof window.hrEditor.importFromObject === 'function') {
      window.hrEditor.importFromObject(styles, { overwrite: true });
    } else {
      window.dispatchEvent(new Event('localStorageImported'));
    }
  } catch (e) {
    console.warn('applyHistorySnapshot: style apply failed', e);
    window.dispatchEvent(new Event('localStorageImported'));
  }
}

function initHistoryManager(maxSteps = 10) {
  const state = {
    undo: [],
    redo: [],
    max: maxSteps,
    isApplying: false
  };

  function updateButtons() {
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    if (undoBtn) undoBtn.disabled = state.undo.length <= 1;
    if (redoBtn) redoBtn.disabled = state.redo.length === 0;
  }

  function capture() {
    if (state.isApplying) return;
    const snap = snapshotCurrentState();
    if (!state.undo.length || !jsonEqual(state.undo[state.undo.length - 1], snap)) {
      state.undo.push(snap);
      if (state.undo.length > state.max) state.undo.shift();
      state.redo = [];
    }
    updateButtons();
  }

  function undo() {
    if (state.undo.length <= 1) return;
    const current = state.undo.pop();
    state.redo.push(current);
    const previous = state.undo[state.undo.length - 1];
    state.isApplying = true;
    applyHistorySnapshot(previous);
    state.isApplying = false;
    updateButtons();
  }

  function redo() {
    if (!state.redo.length) return;
    const next = state.redo.pop();
    state.undo.push(next);
    if (state.undo.length > state.max) state.undo.shift();
    state.isApplying = true;
    applyHistorySnapshot(next);
    state.isApplying = false;
    updateButtons();
  }

  window.hrHistory.capture = capture;
  window.hrHistory.undo = undo;
  window.hrHistory.redo = redo;
  window.hrHistory.isApplying = () => state.isApplying;

  const undoBtn = document.getElementById('undoBtn');
  const redoBtn = document.getElementById('redoBtn');
  if (undoBtn) undoBtn.addEventListener('click', undo);
  if (redoBtn) redoBtn.addEventListener('click', redo);

  document.addEventListener('keydown', (e) => {
    if (!(e.ctrlKey || e.metaKey)) return;
    const k = (e.key || '').toLowerCase();
    if (k === 'z' && !e.shiftKey) {
      e.preventDefault();
      undo();
    }
    if (k === 'y' || (k === 'z' && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  });

  // Capture once pages/styles are built; retry briefly if content is not ready.
  let tries = 0;
  const t = setInterval(() => {
    tries++;
    if (document.querySelector('.domain') || tries > 20) {
      capture();
      clearInterval(t);
    }
  }, 120);

  updateButtons();
}

/**
 * Collect current layout by scanning .domain elements and returning an object
 * domain -> { top, left, height }.
 */
function collectCurrentLayout() {
  const layout = {};
  const domains = document.querySelectorAll('.domain');
  domains.forEach(d => {
    const name = d.dataset && d.dataset.domain ? d.dataset.domain : null;
    if (!name) return;
    layout[name] = {
      top: d.offsetTop,
      left: d.offsetLeft,
      height: d.offsetHeight
    };
  });
  return layout;
}

/**
 * Collect final styles currently applied to elements present in the DOM.
 * Returns { stylesMap, hintsMap }.
 */
function collectCurrentStylesAndHints() {
  let sourceStyles = {};
  try {
    if (window.hrEditor && typeof window.hrEditor.getStyles === 'function') {
      const s = window.hrEditor.getStyles();
      if (s && typeof s === 'object') sourceStyles = s;
    }
  } catch (e) {
    console.warn('hrEditor.getStyles failed', e);
  }
  if (!Object.keys(sourceStyles).length) {
    try { sourceStyles = JSON.parse(localStorage.getItem('hr_styles') || '{}'); } catch (e) { sourceStyles = {}; }
  }

  const styles = {};
  const hints = {};

  function deriveStyleFromElement(el) {
    const style = {};
    if (!el) return style;

    const ff = el.style.fontFamily;
    if (ff) style.fontFamily = ff;

    const fs = el.style.fontSize;
    if (fs) style.fontSize = fs;

    const col = el.style.color;
    if (col) style.color = col;

    const fw = el.style.fontWeight;
    if (fw) style.fontWeight = fw;

    const fi = el.style.fontStyle;
    if (fi) style.fontStyle = fi;

    const bg = el.style.backgroundColor;
    if (bg && bg !== 'transparent' && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgba(0,0,0,0)') {
      style.backgroundColor = bg;
    }

    const bgImg = el.style.backgroundImage;
    if (bgImg && bgImg !== 'none') {
      const bgUrl = imageUrlFromCss(bgImg);
      style.backgroundImageUrl = bgUrl;
      style.backgroundImageOpacity = parseImageOpacityFromCss(bgImg);
      style.backgroundImage = bgUrl ? `url("${bgUrl}")` : bgImg;
      style.backgroundSize = el.style.backgroundSize || 'cover';
      style.backgroundRepeat = el.style.backgroundRepeat || 'no-repeat';
      style.backgroundPosition = el.style.backgroundPosition || 'center center';
    }

    return style;
  }

  const pagesContainer = document.getElementById('pages') || document;
  const nodes = Array.from(pagesContainer.querySelectorAll('[data-style-id]'));

  nodes.forEach(el => {
    const styleId = el.dataset && el.dataset.styleId ? el.dataset.styleId : null;
    if (!styleId) return;

    const fromSource = sourceStyles[styleId] && typeof sourceStyles[styleId] === 'object' ? sourceStyles[styleId] : {};
    const fromDom = deriveStyleFromElement(el);
    const finalStyle = Object.assign({}, fromSource, fromDom);

    // Keep background-image fields aligned to this element's real state.
    const bgImg = (el.style.backgroundImage || '').trim();
    if (!bgImg || bgImg === 'none') {
      delete finalStyle.backgroundImage;
      delete finalStyle.backgroundSize;
      delete finalStyle.backgroundRepeat;
      delete finalStyle.backgroundPosition;
    }

    if (Object.keys(finalStyle).length) {
      styles[styleId] = finalStyle;
    }

    hints[styleId] = {
      tag: el.tagName.toLowerCase(),
      text: firstTextSnippet(el, 60),
      domain: nearestAncestorDomain(el)
    };
  });

  return { stylesMap: styles, hintsMap: hints };
}

/**
 * Try to match a hint to an element in the current DOM.
 * Returns matched element or null.
 * Matching order: domain+tag+text contains -> domain+tag -> tag+text -> first tag
 */
function findElementForHint(hint) {
  const pagesContainer = document.getElementById('pages');
  const candidates = pagesContainer ? Array.from(pagesContainer.querySelectorAll(hint.tag || '*')) : Array.from(document.querySelectorAll(hint.tag || '*'));

  // domain+tag+text
  if (hint.domain && hint.text) {
    for (const c of candidates) {
      const cDomain = nearestAncestorDomain(c);
      if (cDomain !== hint.domain) continue;
      const txt = (c.textContent || '').trim().replace(/\s+/g, ' ');
      if (txt && txt.toLowerCase().includes(hint.text.toLowerCase())) return c;
    }
  }
  // domain+tag
  if (hint.domain && hint.tag) {
    for (const c of candidates) {
      const cDomain = nearestAncestorDomain(c);
      if (cDomain === hint.domain) return c;
    }
  }
  // tag+text
  if (hint.text && hint.tag) {
    for (const c of candidates) {
      const txt = (c.textContent || '').trim().replace(/\s+/g, ' ');
      if (txt && txt.toLowerCase().includes(hint.text.toLowerCase())) return c;
    }
  }
  // first tag match
  if (hint.tag) {
    if (candidates.length) return candidates[0];
  }
  // fallback: nothing
  return null;
}

/**
 * Fallback remap when no hints exist:
 * assign imported style IDs to current DOM elements in document order.
 */
function remapStyleIdsByOrder(stylesFromFile) {
  if (!stylesFromFile || typeof stylesFromFile !== 'object') return {};
  const pagesContainer = document.getElementById('pages') || document;
  const nodes = Array.from(pagesContainer.querySelectorAll('[data-style-id]'));
  const importedIds = Object.keys(stylesFromFile);
  if (!nodes.length || !importedIds.length) return {};

  const remapped = {};
  const n = Math.min(nodes.length, importedIds.length);
  for (let i = 0; i < n; i++) {
    const targetId = nodes[i].dataset && nodes[i].dataset.styleId ? nodes[i].dataset.styleId : importedIds[i];
    remapped[targetId] = stylesFromFile[importedIds[i]];
  }
  return remapped;
}

function remapStylesByHints(stylesFromFile, hints) {
  const remapped = {};
  Object.keys(hints).forEach(styleId => {
    const hint = hints[styleId] || {};
    if (!hint.tag && !hint.text && !hint.domain) return;
    const matched = findElementForHint(hint);
    if (!matched) return;
    const targetId = matched.dataset && matched.dataset.styleId ? matched.dataset.styleId : styleId;
    if (stylesFromFile[styleId]) remapped[targetId] = stylesFromFile[styleId];
  });
  return remapped;
}

function normalizeStylesForCurrentDom(stylesFromFile, hints = {}) {
  if (!stylesFromFile || typeof stylesFromFile !== 'object') return {};

  const pagesContainer = document.getElementById('pages') || document;
  const domNodes = Array.from(pagesContainer.querySelectorAll('[data-style-id]'));
  const domIds = new Set(domNodes.map(n => n.dataset && n.dataset.styleId).filter(Boolean));

  const normalized = {};
  const unmatched = {};

  Object.keys(stylesFromFile).forEach(styleId => {
    if (domIds.has(styleId)) normalized[styleId] = stylesFromFile[styleId];
    else unmatched[styleId] = stylesFromFile[styleId];
  });

  if (!Object.keys(unmatched).length) return normalized;

  // Try hint-based mapping for unmatched keys first.
  const matchedSourceIds = new Set();
  if (hints && Object.keys(hints).length) {
    Object.keys(hints).forEach(sourceId => {
      if (!Object.prototype.hasOwnProperty.call(unmatched, sourceId)) return;
      const hint = hints[sourceId] || {};
      if (!hint.tag && !hint.text && !hint.domain) return;
      const matched = findElementForHint(hint);
      if (!matched || !matched.dataset || !matched.dataset.styleId) return;
      const targetId = matched.dataset.styleId;
      if (Object.prototype.hasOwnProperty.call(normalized, targetId)) return;
      normalized[targetId] = unmatched[sourceId];
      matchedSourceIds.add(sourceId);
    });
  }

  // Any still-unmatched keys get deterministic order fallback on remaining DOM targets.
  const stillUnmatched = {};
  Object.keys(unmatched).forEach(styleId => {
    if (!matchedSourceIds.has(styleId)) stillUnmatched[styleId] = unmatched[styleId];
  });

  if (Object.keys(stillUnmatched).length) {
    const remainingNodes = domNodes.filter(n => {
      const id = n.dataset && n.dataset.styleId;
      return id && !Object.prototype.hasOwnProperty.call(normalized, id);
    });
    const remainingIds = remainingNodes.map(n => n.dataset.styleId);
    const sourceIds = Object.keys(stillUnmatched);
    const n = Math.min(remainingIds.length, sourceIds.length);
    for (let i = 0; i < n; i++) {
      normalized[remainingIds[i]] = stillUnmatched[sourceIds[i]];
    }
  }

  return normalized;
}

/**
 * Apply a layout object to the DOM so import is visible immediately.
 * layout: { domainName: {top,left,height}, ... }
 */
function applyLayoutToDOM(layout) {
  if (!layout || typeof layout !== 'object') return;
  Object.keys(layout).forEach(domain => {
    // try to find element with data-domain equal to domain
    const el = document.querySelector(`.domain[data-domain="${CSS && CSS.escape ? CSS.escape(domain) : domain}"]`) || Array.from(document.querySelectorAll('.domain')).find(d => d.dataset.domain === domain);
    if (el) {
      const cfg = layout[domain];
      if (cfg.top !== undefined) el.style.top = Number(cfg.top) + 'px';
      if (cfg.left !== undefined) el.style.left = Number(cfg.left) + 'px';
      if (cfg.height !== undefined) el.style.height = Number(cfg.height) + 'px';
    }
  });
}

/**
 * File -> Save layout
 * Persist the current layout and styles to localStorage (no download).
 * Saves domainLayout and hr_styles (and keeps hr_styles in storage).
 */
function saveLayoutToLocalStorage() {
  const layout = collectCurrentLayout();
  localStorage.setItem('domainLayout', JSON.stringify(layout));

  const { stylesMap } = collectCurrentStylesAndHints();
  localStorage.setItem('hr_styles', JSON.stringify(stylesMap, null, 2));

  const headerFooter = loadHeaderFooterSettings();
  localStorage.setItem(HEADER_FOOTER_KEY, JSON.stringify(headerFooter, null, 2));

  window.dispatchEvent(new Event('localStorageImported'));
  alert('Saved current layout, styles, header and footer settings to localStorage.');
}

/**
 * File -> Export layout
 * Download final JSON snapshot containing current domainLayout, hr_styles and header_footer.
 */
function exportCombined(filename = 'layout-styles.json') {
  try {
    const domainLayout = collectCurrentLayout();
    const { stylesMap } = collectCurrentStylesAndHints();
    const headerFooter = loadHeaderFooterSettings();
    const out = {
      domainLayout: domainLayout,
      hr_styles: stylesMap,
      header_footer: headerFooter
    };

    const blob = new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 200);
  } catch (err) {
    console.error('exportCombined failed', err);
    alert('Export failed: ' + (err && err.message ? err.message : String(err)));
  }
}

/**
 * Import a combined layout-styles file (File object).
 * - options.overwriteStyles: boolean, true = replace hr_styles, false = merge
 * The importer will:
 *  - persist domainLayout to localStorage and apply it to DOM (positions)
 *  - persist hr_styles to localStorage (merged or overwritten)
 *  - use hr_styles_hints to try to reassign style IDs to DOM elements
 *  - then ask editor to import styles or dispatch localStorageImported
 */
function importCombinedFile(file, options = { overwriteStyles: true }) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      if (typeof parsed !== 'object' || parsed === null) {
        return alert('Invalid JSON: expected an object with "domainLayout" and/or "hr_styles".');
      }

      // 1) domainLayout
      if (parsed.hasOwnProperty('domainLayout')) {
        const dl = parsed.domainLayout;
        if (typeof dl === 'string') {
          try {
            const maybeObj = JSON.parse(dl);
            localStorage.setItem('domainLayout', JSON.stringify(maybeObj));
            applyLayoutToDOM(maybeObj);
          } catch (_) {
            localStorage.setItem('domainLayout', dl);
            try { applyLayoutToDOM(JSON.parse(dl)); } catch (_) {}
          }
        } else if (typeof dl === 'object' && dl !== null) {
          localStorage.setItem('domainLayout', JSON.stringify(dl));
          applyLayoutToDOM(dl);
        } else {
          localStorage.setItem('domainLayout', JSON.stringify(dl));
        }
      }

      // 2) hr_styles (merge or overwrite)
      let stylesFromFile = {};
      if (parsed.hasOwnProperty('hr_styles')) {
        stylesFromFile = parsed.hr_styles || {};
      }

      // 2b) header/footer settings
      if (parsed.hasOwnProperty('header_footer')) {
        const cfg = saveHeaderFooterSettings(parsed.header_footer || {});
        applyHeaderFooterToAllPages(cfg);
      }

      // 3) Reassign style IDs so editor mapping works.
      const hints = parsed.hr_styles_hints || {};
      let normalizedStyles = normalizeStylesForCurrentDom(stylesFromFile, hints);

      if (parsed.hasOwnProperty('hr_styles')) {
        if (options.overwriteStyles) {
          localStorage.setItem('hr_styles', JSON.stringify(normalizedStyles));
        } else {
          let existing = {};
          try { existing = JSON.parse(localStorage.getItem('hr_styles') || '{}'); } catch (e) { existing = {}; }
          const merged = Object.assign({}, existing, normalizedStyles);
          localStorage.setItem('hr_styles', JSON.stringify(merged));
          normalizedStyles = merged;
        }
      }

      // 4) Now tell the editor to import styles (if available) so it can set its stylesMap and apply them
      try {
        const stylesObj = normalizedStyles && Object.keys(normalizedStyles).length ? normalizedStyles : JSON.parse(localStorage.getItem('hr_styles') || '{}');
        if (window.hrEditor && typeof window.hrEditor.importFromObject === 'function') {
          window.hrEditor.importFromObject(stylesObj, { overwrite: !!options.overwriteStyles });
        } else {
          // fallback: dispatch event so editor picks it up
          window.dispatchEvent(new Event('localStorageImported'));
        }
      } catch (err) {
        console.warn('hrEditor.importFromObject failed:', err);
        window.dispatchEvent(new Event('localStorageImported'));
      }

      alert('Imported layout+styles and mapped style IDs to current elements (hint-based when available, otherwise document-order fallback).');

    } catch (err) {
      console.error('Import failed', err);
      alert('Failed to import combined file: ' + err.message);
    }
  };
  reader.onerror = () => alert('Failed to read file');
  reader.readAsText(file);
}

// Expose for UI
window.hrIO.collectCurrentLayout = collectCurrentLayout;
window.hrIO.collectCurrentStylesAndHints = collectCurrentStylesAndHints;
window.hrIO.saveLayoutToLocalStorage = saveLayoutToLocalStorage;
window.hrIO.exportCombined = exportCombined;
window.hrIO.importCombinedFile = importCombinedFile;

/* Wire up file menu and actions (same menu markup assumed) */
document.addEventListener('DOMContentLoaded', () => {
  const fileButton = document.getElementById('file-button');
  const fileDropdown = document.getElementById('file-dropdown');
  const editButton = document.getElementById('edit-button');
  const editDropdown = document.getElementById('edit-dropdown');

  function closeAllMenus() {
    if (fileDropdown) { fileDropdown.style.display = 'none'; fileButton.setAttribute('aria-expanded', 'false'); }
    if (editDropdown) { editDropdown.style.display = 'none'; editButton.setAttribute('aria-expanded', 'false'); }
  }

  if (fileButton) {
    fileButton.addEventListener('click', () => {
      const expanded = fileButton.getAttribute('aria-expanded') === 'true';
      closeAllMenus();
      if (!expanded) { fileDropdown.style.display = 'block'; fileButton.setAttribute('aria-expanded', 'true'); }
    });
  }

  if (editButton) {
    editButton.addEventListener('click', () => {
      const expanded = editButton.getAttribute('aria-expanded') === 'true';
      closeAllMenus();
      if (!expanded) { editDropdown.style.display = 'block'; editButton.setAttribute('aria-expanded', 'true'); }
    });
  }

  document.addEventListener('click', (e) => {
    const inFileMenu = document.getElementById('file-menu') && document.getElementById('file-menu').contains(e.target);
    const inEditMenu = document.getElementById('edit-menu') && document.getElementById('edit-menu').contains(e.target);
    if (!inFileMenu && !inEditMenu) closeAllMenus();
  });

  const saveLayoutBtn = document.getElementById('saveLayoutBtn');
  const exportLayoutBtn = document.getElementById('exportLayoutBtn');
  const importLayoutBtn = document.getElementById('importLayoutBtn');
  const importLayoutFile = document.getElementById('importLayoutFile');
  const headerFooterBtn = document.getElementById('headerFooterBtn');

  initHistoryManager(10);

  window.addEventListener('hrLayoutChanged', () => {
    if (window.hrHistory && typeof window.hrHistory.capture === 'function') {
      window.hrHistory.capture();
    }
  });
  window.addEventListener('hrStylesChanged', () => {
    if (window.hrHistory && typeof window.hrHistory.capture === 'function') {
      window.hrHistory.capture();
    }
  });

  if (saveLayoutBtn) {
    saveLayoutBtn.addEventListener('click', () => {
      saveLayoutToLocalStorage();
      if (window.hrHistory && typeof window.hrHistory.capture === 'function') window.hrHistory.capture();
      closeAllMenus();
    });
  }

  if (exportLayoutBtn) {
    exportLayoutBtn.addEventListener('click', () => {
      exportCombined('layout-styles.json');
      closeAllMenus();
    });
  }

  if (importLayoutBtn && importLayoutFile) {
    importLayoutBtn.addEventListener('click', () => importLayoutFile.click());
    importLayoutFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) {
        const overwrite = confirm('Overwrite existing saved styles with the imported file? OK = overwrite, Cancel = merge.');
        importCombinedFile(f, { overwriteStyles: overwrite });
        if (window.hrHistory && typeof window.hrHistory.capture === 'function') window.hrHistory.capture();
      }
      e.target.value = '';
      closeAllMenus();
    });
  }

  if (headerFooterBtn) {
    headerFooterBtn.addEventListener('click', () => {
      openHeaderFooterSettingsPopup();
      closeAllMenus();
    });
  }

  window.addEventListener('message', (event) => {
    const msg = event && event.data ? event.data : null;
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'hr-header-footer-ready') {
      pushHeaderFooterStateToPopup();
      return;
    }
    if (msg.type === 'hr-header-footer-update') {
      const cfg = saveHeaderFooterSettings(msg.payload || {});
      applyHeaderFooterToAllPages(cfg);
      if (window.hrHistory && typeof window.hrHistory.capture === 'function') window.hrHistory.capture();
    }
  });
});