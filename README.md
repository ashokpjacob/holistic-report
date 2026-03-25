# Holistic Report Card Enterprise

A browser-based holistic report card platform aligned with CBSE NEP 2020.
The project now includes an enterprise landing portal with community support and a dedicated report editor demo.
It loads competency data from CSV, builds multi-page A4 report cards, and provides drag/resize/styling controls with export/import and print support.

No backend and no build step are required.

---

## Live Demo

[holistic-report on GitHub Pages](https://ashokpjacob.github.io/holistic-report)

Direct editor demo: [app.html](https://ashokpjacob.github.io/holistic-report/app.html)

---

## Getting Started

```bash
git clone https://github.com/ashokpjacob/holistic-report.git
cd holistic-report
```

Open `index.html` in a modern browser.

- `index.html`: enterprise landing page with support actions
- `app.html`: full report editor demo

The editor automatically reads `holistic.csv` from the project root.

---

## Project Structure

```text
holistic-report/
├── index.html                      # Enterprise landing page (community support, contact sales, demo launch)
├── app.html                        # Main app shell (menus, sidebar, pages container)
├── script.js                       # Page builder, drag/resize, layout save/export/import, undo/redo, header/footer
├── styles.css                      # Report page styles, guides, print rules, header/footer styles
├── holistic.csv                    # Input data source
├── layout-styles.json              # Example exported layout snapshot
├── assets/
│   ├── header-footer-settings.html # Popup editor for header/footer configuration
│   ├── image-adjuster.html         # Popup editor for background image sizing/position
│   ├── css/
│   │   └── editor.css              # App-shell + sidebar UI styles
│   └── js/
│       └── editor.js               # Style editor behavior, image adjuster messaging, style persistence
└── README.md
```

---

## CSV Data Format

Edit `holistic.csv` to add/update report content.

| Column | Description |
|---|---|
| `Domain` | Top-level grouping |
| `Subject` | Subject under a domain (can be blank) |
| `Competency` | Competency label |
| `Description` | Competency details |

Each Domain becomes a draggable block with subject tables.

---

## Features

### Core Editor

- CSV-driven report generation from `holistic.csv`
- Multi-page A4 layout generation
- Drag and vertical resize for each domain block
- Snap guides for alignment
- Stable deterministic style IDs for reliable re-import

### Modern UI

- Enterprise landing page for application access and support channels
- App header with File and Edit menus
- Edit mode status chip
- Sidebar style panels (Typography, Background, Table Fill)
- Selection chip showing current target element

### Style Controls

- Font family, size, color, bold, italic
- Background color with transparency and opacity
- Background image URL with image opacity
- Table fill color with transparency and opacity (auto-apply)

### Background Image Adjuster Popup

From the sidebar, use **Adjust Image Size/Position** to open `assets/image-adjuster.html`.

Supported controls:

- Size mode: `cover`, `contain`, `custom %`
- Custom width and height percentages
- Position X and Y percentages
- Repeat mode: `no-repeat`, `repeat`, `repeat-x`, `repeat-y`

Changes apply live to the selected element and are saved into layout export.

### Header/Footer Popup

From **Edit -> Header / Footer...**, open `assets/header-footer-settings.html`.

Supported controls:

- Enable/disable header
- Enable/disable footer
- Header and footer height
- Transparent option for each
- Background color and opacity for each
- Optional background image URL for each
- Image opacity for each
- Image size/position/repeat controls for each
- Footer page number toggle

Header/footer settings are applied live across all report pages and stored with layout export/import.

### Undo/Redo (10-step)

- Header buttons: **Undo** and **Redo**
- Keyboard: `Ctrl+Z`, `Ctrl+Y`, `Ctrl+Shift+Z`
- Tracks up to 10 recent edits
- Covers layout moves/resizes, style changes, and header/footer changes

### File Menu

| Item | Description |
|---|---|
| Save layout | Saves current layout + styles + header/footer to localStorage |
| Export layout (download) | Downloads `layout-styles.json` with all current settings |
| Import layout (load file) | Imports previously exported JSON (overwrite or merge styles) |
| Load Default Design (GitHub) | Loads and applies default `layout-styles.json` design from GitHub (with fallback to local file) |
| Print Report | Opens browser print dialog for clean A4 output |

### Edit Menu

| Item | Description |
|---|---|
| Header / Footer... | Opens header/footer popup editor |
| Reset Layout | Clears saved layout, styles, and header/footer state, then reloads |

---

## Exported Layout JSON

`layout-styles.json` now includes three top-level sections:

```json
{
  "domainLayout": {
    "Domain Name": { "top": 120, "left": 20, "height": 150 }
  },
  "hr_styles": {
    "sid__page__0__domain__language-literacy-development": {
      "fontSize": "13px",
      "color": "#222222",
      "backgroundImageUrl": "https://example.com/bg.png",
      "backgroundImageOpacity": 0.8,
      "backgroundSize": "120% 100%",
      "backgroundPosition": "50% 50%",
      "backgroundRepeat": "no-repeat"
    }
  },
  "header_footer": {
    "showPageNumber": true,
    "header": {
      "enabled": true,
      "height": 48,
      "transparent": false,
      "bgColor": "#ffffff",
      "bgOpacity": 1,
      "imageUrl": "",
      "imageOpacity": 1,
      "imageSizeMode": "cover",
      "imageSizeX": 100,
      "imageSizeY": 100,
      "imagePosX": 50,
      "imagePosY": 50,
      "imageRepeat": "no-repeat"
    },
    "footer": {
      "enabled": true,
      "height": 48,
      "transparent": true,
      "bgColor": "#ffffff",
      "bgOpacity": 1,
      "imageUrl": "",
      "imageOpacity": 1,
      "imageSizeMode": "cover",
      "imageSizeX": 100,
      "imageSizeY": 100,
      "imagePosX": 50,
      "imagePosY": 50,
      "imageRepeat": "no-repeat"
    }
  }
}
```

---

## Printing

Use **File -> Print Report**.

- A4 print sizing is enforced
- Editor UI is hidden for print
- Report pages print with clean page breaks
- Works with "Save as PDF" in browser print dialogs

---

## Browser Support

Tested with modern desktop browsers:

- Chrome
- Edge
- Firefox
- Safari

---

## Support and Sales

- Community support email: `66997515+ashokpjacob@users.noreply.github.com`
- Contact sales for customization, white-labeling, and deployment support via the same email from the landing page actions

---

## License

See [LICENSE](LICENSE).
