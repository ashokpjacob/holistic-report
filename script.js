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
  let savedLayout = JSON.parse(localStorage.getItem("domainLayout")) || {};
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

//position.json
/**
 * Export entire localStorage as a JSON file.
 * filename defaults to "position.json".
 */

const REMOTE_POSITION_URL = 'https://raw.githubusercontent.com/ashokpjacob/holistic-report/refs/heads/main/position.json';

function exportLocalStorage(filename = 'position.json') {
  const exportObj = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    exportObj[key] = localStorage.getItem(key);
  }

  const content = JSON.stringify(exportObj, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 100);
}

/**
 * Import helper that accepts a plain object (key -> value) and writes to localStorage.
 * If options.overwrite is false, will prompt on conflicts.
 */
function importObjectIntoLocalStorage(obj, options = { overwrite: true }) {
  if (typeof obj !== 'object' || obj === null) {
    throw new Error('JSON root must be an object of key→value pairs');
  }
  const keys = Object.keys(obj);
  if (!options.overwrite) {
    const conflicts = keys.filter(k => localStorage.getItem(k) !== null);
    if (conflicts.length > 0) {
      const ok = confirm(`The file contains ${conflicts.length} keys that already exist in localStorage. Overwrite them?`);
      if (!ok) return 0;
    }
  }
  keys.forEach(k => {
    const v = obj[k];
    localStorage.setItem(k, v === null ? '' : String(v));
  });
  // Notify app:
  window.dispatchEvent(new Event('localStorageImported'));
  return keys.length;
}

/**
 * Import a JSON file from an <input type="file"> File object.
 * After successful import it reloads the page (small timeout to allow listeners to run).
 */
function importLocalStorageFile(file, options = { overwrite: true }) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target.result);
      const count = importObjectIntoLocalStorage(parsed, options);
      if (count && count > 0) {
        alert(`Imported ${count} keys into localStorage.`);
      } else if (count === 0) {
        // user cancelled overwrite
        return;
      }
      // Give a moment for any listeners then reload
      setTimeout(() => { location.reload(); }, 50);
    } catch (err) {
      alert('Failed to import file: ' + err.message);
      console.error(err);
    }
  };
  reader.onerror = () => alert('Failed to read file');
  reader.readAsText(file);
}

/**
 * Fetch a remote JSON file and import its contents into localStorage.
 * Returns a Promise that resolves to number of keys imported.
 */
async function fetchAndImportRemote(url, options = { overwrite: true }) {
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) {
    throw new Error(`Failed to fetch ${url}: ${resp.status} ${resp.statusText}`);
  }
  const text = await resp.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    throw new Error('Remote file is not valid JSON: ' + err.message);
  }
  const count = importObjectIntoLocalStorage(parsed, options);
  return count;
}

/* Wire up UI, but guard missing elements so script is resilient */
document.addEventListener('DOMContentLoaded', () => {
  // Auto-load remote if localStorage is empty
  try {
    if (localStorage.length === 0) {
      // Attempt to fetch remote default positions
      fetchAndImportRemote(REMOTE_POSITION_URL, { overwrite: true })
        .then(count => {
          if (count && count > 0) {
            // Inform user and reload so app picks up the new data
            // Small timeout so any listeners can run before reload
            setTimeout(() => {
              alert(`Loaded ${count} default positions from remote and will reload now.`);
              location.reload();
            }, 50);
          }
        })
        .catch(err => {
          // Fail silently in background but log for debugging
          console.warn('Could not load remote positions:', err);
        });
    }
  } catch (err) {
    console.error('Error during auto-load check:', err);
  }

  const exportBtn = document.getElementById('exportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => exportLocalStorage('position.json'));
  }

  const importBtn = document.getElementById('importBtn');
  const importFileInput = document.getElementById('importFile');

  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => importFileInput.click());

    importFileInput.addEventListener('change', (e) => {
      const f = e.target.files && e.target.files[0];
      if (f) importLocalStorageFile(f, { overwrite: true });
      e.target.value = '';
    });
  } else {
    // If UI elements are missing, you can create them programmatically or ensure they exist in your HTML.
    // Example (uncomment to auto-create UI in the page):
    /*
    const container = document.createElement('div');
    container.style.margin = '8px 0';
    container.innerHTML = `
      <button id="exportBtn">Save localStorage (position.json)</button>
      <button id="importBtn">Load localStorage from file</button>
      <input id="importFile" type="file" accept=".json,application/json" style="display:none" />
    `;
    document.body.prepend(container);
    // then re-run wiring or refresh the page
    location.reload();
    */
  }
});