Scheduling App (Gradio)

Quick start

- Create and activate a virtual environment (optional).
- Install dependencies: `pip install -r schedule_app/requirements.txt`
- Run the app: `python schedule_app/app.py`
- Open the printed local URL in your browser.

Features

- Login with Student ID.
- View list of rooms from JSON storage.
- Join an existing room (capacity enforced).
- Create a new room; owner auto-joins; saved to JSON.

Storage

- JSON file lives at `schedule_app/storage.json`.
- It is auto-created on first run.

Notes

- Time can be entered as free text (e.g., `2025-10-06 15:30`). If left blank, current time is used.
- Use the Refresh button to reload the latest room list and choices.

