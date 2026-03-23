# Holistic Report Card Generator

A web-based report card designer aligned with **CBSE NEP 2020**. It dynamically loads competencies from a CSV file, organizes them by domain and subject across A4 pages, and gives teachers a full drag-resize-style editor to build and export print-ready report cards — no server or build step required.

---

## 🌐 Live Demo

👉 [holistic-report on GitHub Pages](https://ashokpjacob.github.io/holistic-report)

---

## 🚀 Getting Started

```bash
git clone https://github.com/ashokpjacob/holistic-report.git
cd holistic-report
# Open index.html directly in any modern browser — no build step needed
```

The app reads `holistic.csv` from the same folder automatically on load.

---

## 📂 Project Structure

```
holistic-report/
├── index.html          # Main application shell + style sidebar
├── script.js           # Page builder, drag/resize, layout save/export/import
├── styles.css          # A4 page, domain block, print styles
├── holistic.csv        # Competency data (edit this to customise content)
├── layout-styles.json  # Saved layout snapshot (export/import file)
├── assets/
│   ├── index.html      # (assets sub-page)
│   ├── css/
│   │   └── editor.css  # Sidebar and app-shell styles
│   └── js/
│       └── editor.js   # Style sidebar logic, apply/reset, import/export
└── README.md
```

---

## 📄 CSV Data Format

Edit `holistic.csv` to add your own domains, subjects, and competencies.

| Column | Description |
|---|---|
| `Domain` | Top-level grouping (e.g. *Cognitive Development*) |
| `Subject` | Subject within the domain (e.g. *Maths*) — can be blank |
| `Competency` | Skill name (e.g. *Number Sense*) |
| `Description` | Full competency description shown in the report card |

Each unique Domain becomes a draggable block. Subjects and competencies are rendered as rows inside that block's table.

---

## ✨ Features

### Content
- **CSV-driven** — all domains, subjects and competencies come from `holistic.csv`; no code changes needed to update content
- **Multi-page A4 layout** — content is automatically distributed across pages; each page is exactly 210 × 297 mm

### Layout Editor
- **Drag & drop** — grab the dark handle bar at the top of any domain block to reposition it freely on the page
- **Resize** — drag the top or bottom resize handle to adjust block height
- **Snap guides** — red alignment guides appear when a block is near the horizontal or vertical centre of the page
- **Edit Mode toggle** — the "Toggle Edit Mode" button in the toolbar enables/disables drag and resize so you can scroll freely when not editing

### Style Editor (left sidebar)

Click any element on the page to select it, then use the sidebar controls:

| Control | What it does |
|---|---|
| **Font** | Choose from System UI, Arial, Georgia, Times New Roman, Courier New |
| **Size (px)** | Set font size |
| **Color** | Text/foreground colour picker |
| **Background color** | Solid background colour with **Transparent** checkbox and **Opacity** slider (0–1) |
| **Background image URL** | Paste any image URL; the **Image opacity** slider (0–1) dims the image behind content |
| **Table fill color** | Fill colour for table cells, with **Transparent** checkbox and **Opacity** slider; applied automatically on change |
| **Bold / Italic** | Toggle text weight and style |
| **Apply** | Commit the current sidebar values to the selected element |
| **Reset** | Remove all custom styles from the selected element |

Styles are attached to elements by stable, deterministic IDs (e.g. `sid__page__0__domain__maths__subject__0__number-sense__row__0__competency`) so they survive page reload.

### File Menu

| Item | Description |
|---|---|
| **Save layout** | Persists current positions and styles to `localStorage` (survives reload without downloading anything) |
| **Export layout (download)** | Downloads `layout-styles.json` — a snapshot of all positions and styles |
| **Import layout (load file)** | Load a previously exported `.json` file; choose to **overwrite** or **merge** with current styles |
| **Print Report** | Opens the browser print dialog; sidebar and toolbar are hidden automatically |

### Edit Menu

| Item | Description |
|---|---|
| **Reset Layout** | Clears all saved positions **and** styles from `localStorage` and reloads the page to a blank slate |

---

## 💾 Layout File (`layout-styles.json`)

The exported JSON contains two sections:

```json
{
  "domainLayout": {
    "Domain Name": { "left": "10mm", "top": "20mm", "height": "80px" }
  },
  "hr_styles": {
    "sid__page__0__domain__maths": {
      "backgroundColor": "#e8f0fe",
      "backgroundImage": "none",
      "backgroundImageUrl": "",
      "backgroundImageOpacity": 1,
      "fontSize": "13px",
      "fontFamily": "Arial, Helvetica, sans-serif",
      "color": "#222",
      "fontWeight": "bold"
    }
  }
}
```

- **`domainLayout`** — pixel/mm positions of every domain block per page
- **`hr_styles`** — all visual styles keyed by stable element ID

Import this file on any machine to reproduce the exact layout and styling.

---

## 🖨 Printing

Use **File → Print Report**. The browser print dialog opens with:
- A4 paper size pre-set via `@page { size: A4; margin: 0; }`
- Sidebar, toolbar, and menu bar hidden via `@media print`
- Each page has a `page-break-after: always` so pages don't bleed into each other
- "Save as PDF" in the print dialog produces a clean PDF

---

## 🔧 Customisation

### Change the competency data
Edit `holistic.csv`. Each row is one competency. Add new domains/subjects freely — the layout auto-adjusts.

### Add a background image to a page or domain block
1. Enable Edit Mode
2. Click the page or domain block
3. Paste an image URL into **Background image URL** in the sidebar
4. Adjust **Image opacity** as needed
5. Click **Apply**, then **File → Save layout** or **Export layout**

### Use a different colour scheme
Select any element, set colours via the sidebar, and export the layout file. Share that file with colleagues to distribute the design.

---

## 🌐 Browser Support

Works in all modern browsers (Chrome, Edge, Firefox, Safari). No internet connection required after the page loads (images loaded from external URLs obviously need connectivity).

---

## 📝 License

See [LICENSE](LICENSE).
