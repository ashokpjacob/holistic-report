# Holistic Report Card Generator

Holistic Report Card Generator (CBSE NEP 2020 Aligned)  
A web-based tool to design and print holistic student report cards in line with the CBSE National Education Policy 2020. It dynamically loads competencies from a CSV file, organizes them by domain and subject, and allows teachers to drag, resize, and customize layouts. Layouts are saved locally and can be printed in clean A4 format.

---

## ✨ Features
- 📂 **CSV Data Import**: Load domains, subjects, competencies, and descriptions from `holistic.csv`.
- 📄 **A4 Page Layout**: Automatically paginated into neat report card pages.
- 🎛 **Drag & Resize**: Move and resize domain blocks with snap-to-center guides.
- 💾 **Persistent Layouts**: Layouts saved in `localStorage` for reuse.
- 🖨 **Print-Friendly**: Export clean report cards directly to PDF or paper.
- 🎨 **Customizable**: Adaptable to different school philosophies and grading systems.

---

## 📂 Project Structure

•	index.html        # Main application
•	holistic.csv      # Sample CSV data
•	style.css         # Inline styles (inside HTML)
•	README.md         # Documentation


---

## 🚀 Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/ashokpjacob/holistic-report.git
   Open index.html in your browser.
   
The app will automatically load holistic.csv and render the report card.

Customize the layout by dragging/resizing domains.
Use Reset Layout to clear saved positions.
Use Print Report to export to PDF or paper.
   cd holistic-report-card
