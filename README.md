# Prim's Algorithm Learning Resource

This project now ships a classroom-ready, hostable lecture site that covers Prim's Algorithm from intuition to code, plus an interactive canvas tool.

## What's Included
- **Minute-by-minute lesson plan** tailored for an 8–10 minute entry-level discrete math presentation.
- **Concept breakdowns** highlighting the greedy choice property, cycle-free invariant, and runtime insights.
- **Narrated pseudocode + sample graph storyboard** for walking through the algorithm with students.
- **Full interactive visualizer** (from the provided specification) so learners can build graphs, step through Prim's algorithm, and inspect live MST statistics.

## Project Structure
```
./index.html   # Main lecture site with all sections and embedded interactive tool
./styles.css   # Custom styling for panels, agenda cards, and typography
./scripts.js   # Interactive graph builder + Prim's algorithm visualizer logic
```

## Running the Site Locally
1. Install any static HTTP server (Python's built-in server works great).
2. From the repository root, run:
   ```bash
   python -m http.server 8000
   ```
3. Visit `http://localhost:8000` in your browser to walk through the lecture and launch the interactive component.

The site is self-contained (TailwindCSS is loaded via CDN) and ready for classroom display or sharing with students.
