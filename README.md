# Scheduling App Frontend (Gradio)

Single-page scheduling UI that lets students log in, browse available practice rooms, and host new sessions. The interface is built entirely with [Gradio](https://www.gradio.app/) and persists data to a lightweight JSON store, making it easy to demo or extend without extra services.

## Features
- Student login gate with session banner so actions are tied to an ID.
- Auto-refreshing room list (every 5 seconds) with inline “Join” controls and privacy indicators.
- Guided room creation form with location selector, 30/60 minute duration limits, and availability checks.
- Public/private toggle: public rooms are open to everyone; private rooms only allow the owner to rejoin.
- Smart time pickers that only expose free slots for the selected location and date.

## Quick Start
```bash
# 1. (Optional) Create & activate a virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Launch the Gradio app
python app.py
```

Gradio prints a local URL (e.g. `http://127.0.0.1:7860`). Open it in a browser to interact with the frontend. Use the “Stop” button in the terminal or press `Ctrl+C` when you are done.

## UI Walkthrough
- **Log In** – Enter any Student ID to unlock the main screen; the header reflects the signed-in user.
- **Browse & Join** – The join view lists up to 20 rooms with name, start time, duration, and privacy badge; click “Join” to enroll and watch the status panel for feedback.
- **Create a Room** – Use the “Create” button, fill in the name, visibility, location, date, slot, and duration, then hit “Save”; a success message triggers an automatic refresh of the join list and slot picker.
- **Private Rooms** – Only the owner can join a private room; others receive a warning and remain on the join view.

## Development Notes
- Main entry point: `app.py` — contains the Gradio layout, event wiring, and business rules.
- Styling: see `CUSTOM_CSS` inside `app.py` for button sizing and layout tweaks.
- Locations: update the `LOCATION_OPTIONS` list in `app.py` to add/remove fields.
- Slot logic: helper functions enforce 30-minute increments and prevent overlapping bookings per location.

## Data & Storage
- Persistent data lives in `storage.json`. The app creates and updates it automatically.  
- Gradio keeps the file in memory while the server runs; manual edits while the app is live may be overwritten.
- To reset the state, stop the server and delete `storage.json` (it will be recreated on next launch).

## Troubleshooting
- **Dependencies missing?** Re-run `pip install -r requirements.txt` inside the active virtual environment.
- **Port already in use?** Launch with a custom port: `python app.py --server-port 7861`.
- **No rooms showing?** Either none exist yet or all violate current filters; try creating one or refreshing the browser.
