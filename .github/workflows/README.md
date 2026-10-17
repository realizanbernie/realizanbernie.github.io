# Fiber Power Computing — working prototype

A responsive, mobile-first FTTH/GPON planning UI with dark/night mode, project management, a basic optical-loss calculator, splitter comparison, topology preview, NAP/port records, client records, and JSON/PDF export paths.

## Run the frontend

**No build step is required.**

### Option A — easiest
Open `index.html` in a modern browser. The app stores project data in that browser's `localStorage`.

### Option B — local web server (recommended)
From this folder, run one of these:

Python:
```bash
python -m http.server 8080
```

Node.js (if you already have it):
```bash
npx serve .
```

Then open `http://localhost:8080` (Python) or the URL shown by `serve`.

On Android, you can transfer this folder to a computer or use a local HTML editor/server app. Browser restrictions vary; use a local server for best results.

## Features that work

- Sidebar and mobile bottom navigation.
- Responsive layout for desktop and mobile.
- Dark/night mode and light mode; preference is saved locally.
- Create and switch projects.
- Edit project and OLT basics.
- Editable calculator values and live optical-loss recalculation on submit.
- Candidate splitter ratio comparison.
- Topology configuration and visual preview.
- Add/edit/delete NAP and client records.
- Detect duplicate client NAP-port assignment in the basic add flow.
- Export active project as JSON.
- Print the report or use the browser's “Save as PDF”.
- Local browser persistence using `localStorage`.
- Optional Node.js API scaffold in `backend/`.

## Important limitations

This is a functional UI prototype, not a certified network-design tool. The optical model is deliberately simplified. It does not yet model separate downstream/upstream wavelengths and profiles, per-output manufacturer insertion loss, all PON class rules, real GIS cable routes, or live OLT telemetry. The optimizer only compares a few sample candidates. Confirm the exact equipment datasheets, optical budgets and field measurements before installation.

The current frontend does not call the optional Node API; the API folder is a reserved scaffold. A future integration can be implemented using `config.example.js` and an authenticated API client.

## Suggested next steps

1. Add automated tests for calculations and topology validation.
2. Create a PostgreSQL schema and migrations.
3. Add secure authentication and roles.
4. Build an explicit connection model (upstream node + output port + downstream node + cable segment).
5. Replace sample splitter losses with manufacturer data per output port.
6. Implement a full topology optimizer and compare cost, optical margin, capacity and route constraints.
7. Add GIS mapping and measured optical power import.
8. Add offline/online sync only after conflict handling is designed.
