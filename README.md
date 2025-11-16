# Prim's Algorithm Interactive Studio

This repository hosts a single-page application dedicated to a "state-of-the-art" Prim's algorithm playground. Instead of a lec
cture outline, the entire experience now revolves around experimentation: design graphs, generate random networks, import or e
xport JSON, and watch Prim's algorithm execute with live data-structure readouts.

## Feature Highlights
- **Drag-friendly canvas builder** – add, delete, rename (double-click), and reposition nodes, then wire up weighted edges with quick prompts.
- **Smart start-node selection** – choose any vertex from a dropdown before running Prim's algorithm and rerun instantly.
- **Live algorithm cockpit** – start/step/auto-run controls, adjustable animation speeds, code-line highlighting, and MST hea
lth indicators.
- **Random graph forge** – parameterized node count and density sliders guarantee connected graphs for rapid exploration.
- **Import/export workflow** – serialize the current graph to JSON, copy it to the clipboard, and re-import saved scenarios.
- **Data-structure telemetry** – adjacency lists, candidate (priority queue) snapshots, MST edge ledgers, and a scrolling ste
p history all update in real time.

## Project Structure
```
./index.html   # Main UI shell, layout, and Tailwind utility classes
./styles.css   # Custom theming, panels, and helper classes
./scripts.js   # Canvas interactions, Prim's algorithm state machine, and utilities
```

## Running the Studio Locally
1. Use any static HTTP server. Python's built-in server works without additional dependencies.
2. From the repository root run:
   ```bash
   python -m http.server 8000
   ```
3. Visit `http://localhost:8000` in your browser. The hero panel will reflect your current graph statistics, and the workspac
e panel contains all of the controls described above.

Because everything is static and Tailwind is loaded via CDN, you can deploy this folder to any static host (GitHub Pages, Netli
fy, Render, etc.) without additional build steps.
