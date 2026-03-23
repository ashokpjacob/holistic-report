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

  for (let i=0; i<domains.length; i+=perPage) {
    const page = document.createElement("div");
    page.className = "a4-page";
    pagesContainer.appendChild(page);

    const hGuide = document.createElement("div");
    hGuide.className = "guide-line horizontal";
    page.appendChild(hGuide);
    const vGuide = document.createElement("div");
    vGuide.className = "guide-line vertical";
    page.appendChild(vGuide);

    const slice = domains.slice(i,i+perPage);
    slice.forEach((domain, idx) => {
      const domainDiv = document.createElement("div");
      domainDiv.className = "domain";
      domainDiv.dataset.domain = domain;

      const col = idx % 2;
      const row = Math.floor(idx/2);
      const defaultTop = 20 + row*95;
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
      domainDiv.appendChild(dragHandle);

      const topHandle = document.createElement("div");
      topHandle.className = "resize-handle resize-top";
      domainDiv.appendChild(topHandle);
      const bottomHandle = document.createElement("div");
      bottomHandle.className = "resize-handle resize-bottom";
      domainDiv.appendChild(bottomHandle);

      for (const subject in grouped[domain]) {
        const h3 = document.createElement("h3");
        h3.textContent = subject;
        domainDiv.appendChild(h3);

        const table = document.createElement("table");
        const header = document.createElement("tr");
        ["Competency","Grading"].forEach(col=>{
          const th=document.createElement("th"); th.textContent=col; header.appendChild(th);
        });
        table.appendChild(header);

        grouped[domain][subject].forEach(row=>{
          const tr=document.createElement("tr");
          const td1=document.createElement("td"); td1.textContent=row.Competency+" – "+row.Description;
          const td2=document.createElement("td"); td2.textContent=row.Grading;
          tr.appendChild(td1); tr.appendChild(td2);
          table.appendChild(tr);
        });
        domainDiv.appendChild(table);
      }

      page.appendChild(domainDiv);
      attachDragResize(domainDiv, dragHandle, topHandle, bottomHandle, savedLayout, page, hGuide, vGuide);
    });
  }
}

function attachDragResize(domainDiv, dragHandle, topHandle, bottomHandle, savedLayout, page, hGuide, vGuide) {
  // Drag logic with snap guides
  dragHandle.addEventListener("mousedown", e=>{
    e.preventDefault();
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
      saveLayout(domainDiv, savedLayout);
    }
    document.addEventListener("mousemove",onMove);
    document.addEventListener("mouseup",onUp);
  });

  // Resize logic
  [topHandle,bottomHandle].forEach(handle=>{
    handle.addEventListener("mousedown", e=>{
      e.preventDefault();
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
}

// Reset button
document.getElementById("resetBtn").addEventListener("click", ()=>{
  localStorage.removeItem("domainLayout");
  location.reload();
});

// Print button
document.getElementById("printBtn").addEventListener("click", ()=>{
  window.print();
});

// Combined export/import utilities with hint matching

window.hrIO = window.hrIO || {};

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
 * Collect current styles: prefer editor API if available, otherwise read localStorage.hr_styles.
 * Also build small element hints for each styleId so we can remap on import.
 * Returns { stylesMap, hintsMap }.
 */
function collectCurrentStylesAndHints() {
  let styles = {};
  try {
    if (window.hrEditor && typeof window.hrEditor.getStyles === 'function') {
      const s = window.hrEditor.getStyles();
      if (s && typeof s === 'object') styles = s;
    }
  } catch (e) {
    console.warn('hrEditor.getStyles failed', e);
  }
  if (!Object.keys(styles).length) {
    try { styles = JSON.parse(localStorage.getItem('hr_styles') || '{}'); } catch (e) { styles = {}; }
  }

  const hints = {};
  Object.keys(styles).forEach(styleId => {
    // try to find the element that had this styleId
    const el = document.querySelector(`[data-style-id="${CSS && CSS.escape ? CSS.escape(styleId) : styleId}"]`);
    if (el) {
      hints[styleId] = {
        tag: el.tagName.toLowerCase(),
        text: firstTextSnippet(el, 60),
        domain: nearestAncestorDomain(el)
      };
    } else {
      // fallback: no element currently has that id; we can't create good hint without traces, skip
      hints[styleId] = { tag: '', text: '', domain: '' };
    }
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

  window.dispatchEvent(new Event('localStorageImported'));
  alert('Saved current layout and styles to localStorage.');
}

/**
 * File -> Export layout
 * Download combined JSON file containing domainLayout, hr_styles, and hr_styles_hints.
 */
function exportCombined(filename = 'layout-styles.json') {
  try {
    const domainLayout = collectCurrentLayout();
    const { stylesMap, hintsMap } = collectCurrentStylesAndHints();
    const out = {
      domainLayout: domainLayout,
      hr_styles: stylesMap,
      hr_styles_hints: hintsMap
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
        if (options.overwriteStyles) {
          localStorage.setItem('hr_styles', JSON.stringify(stylesFromFile));
        } else {
          let existing = {};
          try { existing = JSON.parse(localStorage.getItem('hr_styles') || '{}'); } catch (e) { existing = {}; }
          const merged = Object.assign({}, existing, stylesFromFile);
          localStorage.setItem('hr_styles', JSON.stringify(merged));
        }
      }

      // 3) Use hints (if any) to reassign style IDs to DOM elements so editor mapping works
      const hints = parsed.hr_styles_hints || {};
      if (Object.keys(hints).length) {
        Object.keys(hints).forEach(styleId => {
          const hint = hints[styleId] || {};
          // Skip empty hints
          if (!hint.tag && !hint.text && !hint.domain) return;
          const matched = findElementForHint(hint);
          if (matched) {
            try {
              matched.dataset.styleId = styleId;
            } catch (e) {
              // ignore
            }
          }
        });
      }

      // 4) Now tell the editor to import styles (if available) so it can set its stylesMap and apply them
      try {
        const stylesObj = stylesFromFile && Object.keys(stylesFromFile).length ? stylesFromFile : JSON.parse(localStorage.getItem('hr_styles') || '{}');
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

      alert('Imported layout+styles and attempted to map styles to elements (best-effort). If some styles are missing, try re-running Save layout then Export to regenerate stable hints.');

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

  if (fileButton) {
    fileButton.addEventListener('click', (e) => {
      const expanded = fileButton.getAttribute('aria-expanded') === 'true';
      fileButton.setAttribute('aria-expanded', String(!expanded));
      fileDropdown.style.display = expanded ? 'none' : 'block';
    });

    document.addEventListener('click', (e) => {
      if (!document.getElementById('file-menu').contains(e.target)) {
        fileDropdown.style.display = 'none';
        fileButton.setAttribute('aria-expanded', 'false');
      }
    });
  }

  const saveLayoutBtn = document.getElementById('saveLayoutBtn');
  const exportLayoutBtn = document.getElementById('exportLayoutBtn');
  const importLayoutBtn = document.getElementById('importLayoutBtn');
  const importLayoutFile = document.getElementById('importLayoutFile');

  if (saveLayoutBtn) {
    saveLayoutBtn.addEventListener('click', () => {
      saveLayoutToLocalStorage();
      if (fileDropdown) { fileDropdown.style.display = 'none'; fileButton.setAttribute('aria-expanded','false'); }
    });
  }

  if (exportLayoutBtn) {
    exportLayoutBtn.addEventListener('click', () => {
      exportCombined('layout-styles.json');
      if (fileDropdown) { fileDropdown.style.display = 'none'; fileButton.setAttribute('aria-expanded','false'); }
    });
  }

  if (importLayoutBtn && importLayoutFile) {
    importLayoutBtn.addEventListener('click', () => importLayoutFile.click());
    importLayoutFile.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) {
        const overwrite = confirm('Overwrite existing saved styles with the imported file? OK = overwrite, Cancel = merge.');
        importCombinedFile(f, { overwriteStyles: overwrite });
      }
      e.target.value = '';
      if (fileDropdown) { fileDropdown.style.display = 'none'; fileButton.setAttribute('aria-expanded','false'); }
    });
  }
});