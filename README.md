# Scheduling App (React + Flask)

Modern single-page scheduling experience that lets students browse athletics facilities, preview locations, and host new sessions. The frontend is built with **React (Vite)** and the backend is a lightweight **Flask** API backed by JSON reservation files. The UI supports rich popovers, modal previews, and fallbacks when the API is offline.

## Features
- Student login gate so actions are tied to an ID.
- Auto-sorted lobby with join/leave controls, warning badges, and hover previews for each facility.
- Click-to-open modal dialog with photos, amenities, and map links.
- Guided room creation flow with availability checks and new facility catalog (tennis courts, stadiums, etc.).
- Calendar agenda preview that surfaces same-day sessions directly inside the scheduling flow.
- Support for additional sports (baseball, golf, tennis) with dedicated iconography.
- Light/dark theme toggle with animated microinteractions across the interface.
- Private lobby support: hosts can generate invite codes, share them, and unlock rooms from the join page.
- Backend JSON storage with automatic regeneration plus browser `localStorage` fallback when offline.

## Project Structure
```
.
├── backend/            # Flask API and storage utilities
│   ├── app.py          # API entry point
│   ├── storage/
│   │   ├── reservations/  # Generated day-by-day JSON data (gitignored)
│   │   └── storage_template.py
│   └── utils/          # Helpers for reservations, timeslots, users
├── public/             # Static assets (location preview images, favicon)
├── src/                # React application (Vite)
│   ├── components/     # UI components (LocationPreview, Room cards, etc.)
│   ├── lib/            # Shared logic (API, schedule helpers, storage)
│   ├── pages/          # Route-level views (Join, Profile, Create)
│   └── styles.css      # Global design tokens and theme
└── README.md
```

## Prerequisites
- **Node.js** (v18+) and **npm**
- **Python 3.10+**
- *(Optional)* `python -m venv venv` for an isolated backend environment

## Quick Start

### 1. Install dependencies
```bash
# Backend dependencies
python -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend dependencies
npm install
```

### 2. Launch the backend
```bash
source venv/bin/activate            # ensure the venv is active
python -m backend.app --host 0.0.0.0 --port 5050
```
The Flask API listens on `http://127.0.0.1:5050` (matching `VITE_API_BASE_URL` in `.env`). Reservation files are regenerated automatically under `backend/storage/reservations/` if they are missing.

### 3. Launch the frontend
In a second terminal:
```bash
npm run dev
```
Vite prints the local URL (usually `http://127.0.0.1:5173`). Open it in the browser while the backend is running to see live data. If the API is unreachable, the app falls back to cached `localStorage` data and shows a status banner.

### 4. Build for production
```bash
npm run build        # Generates static assets in dist/
```

## Developer Notes
- **Hover overlay**: Implemented in `src/components/LocationLinkWithPreview.jsx` using Floating UI for positioning, with a dedicated preview-image directory at `public/assets/locations/`.
- **Modal dialog**: Controlled component at `src/components/LocationPreview.jsx` with focus trapping, ESC/backdrop handling, and body scroll lock.
- **Schedules & facilities**: `src/lib/schedule.js` defines location catalogs, type filters, capacities, and icons.
- **Backend data model**: `backend/utils/utilities.py` and `backend/storage/storage_template.py` manage timeslots, courts, and JSON serialization.
- **Resetting data**: Stop the backend and delete the contents of `backend/storage/reservations/`. Restart the Flask server to regenerate fresh files. Clear browser `localStorage` (key `rooms`) to remove cached sessions.

## Troubleshooting
- **API fallback banner**: Indicates the frontend could not reach `VITE_API_BASE_URL`; ensure the Flask server is running or adjust `.env`.
- **Stale reservations after reset**: Clear both the files inside `backend/storage/reservations/` and the browser’s `localStorage` before reloading.
- **Port conflicts**: Start the backend on a different port via `python -m backend.app --host 0.0.0.0 --port 5051` and update `.env`.
- **Missing preview images**: Place PNG/JPEG files inside `public/assets/locations/` and update `src/lib/locationAssets.js` accordingly; gradient fallbacks appear if an image is absent.

## Scripts Reference
| Command | Description |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Build production-ready frontend assets |
| `python -m backend.app --host 0.0.0.0 --port 5050` | Launch the Flask API |
| `pip install -r requirements.txt` | Install backend dependencies |

Enjoy hacking on the new scheduling experience! Contributions, bug reports, and facility updates are always welcome.***
