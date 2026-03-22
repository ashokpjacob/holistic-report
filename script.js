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