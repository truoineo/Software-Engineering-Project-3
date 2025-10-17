React Frontend (Vite)
======================

This repository now contains a standalone React app that reproduces the Scheduling UI with Join/Create/Profile pages and a profile icon.

Quick start
- Prereq: Node.js 18+ and npm
- Install: `npm install`
- Run dev server: `npm run dev`
- Open: shown URL (typically http://localhost:5173)

Pages
- Login: enter Student ID (saved in localStorage)
- Join: list available rooms; click Join to add yourself
- Create: create rooms with location, date, time, duration, visibility
- Profile: shows rooms you own and joined

Storage
- Uses `localStorage` under the `rooms` key; no backend required.

Project structure
- `src/pages` — page components (Login/Join/Create/Profile)
- `src/components/TopBar.jsx` — header with Create button and profile icon
- `src/lib/auth.jsx` — Student ID context (localStorage-backed)
- `src/lib/storage.js` — room persistence utilities
- `src/lib/schedule.js` — scheduling utilities and constants
- `src/styles.css` — full-screen, dark-themed styles

Build
- `npm run build` produces a static site in `dist/`.

