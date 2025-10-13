import json
import os
import threading
import uuid
from datetime import datetime, timedelta

import gradio as gr


STORAGE_PATH = os.path.join(os.path.dirname(__file__), "storage.json")
_lock = threading.Lock()

SLOT_MINUTES = 30
MAX_DURATION_MIN = 60
TIME_FMT = "%Y-%m-%d %H:%M"
SLOTS_LOOKAHEAD_HOURS = 24
SLOTS_LOOKAHEAD_DAYS = 7
MAX_ROOM_BUTTONS = 20
CUSTOM_CSS = """
.room-option button { font-size: 18px; padding: 14px 18px; width: 100%; text-align: left; justify-content: flex-start; }
.room-option { width: 100%; }

/* Room label grows to fill row */
.room-label { text-align: left; font-size: 18px; padding: 10px 14px; flex: 1 1 auto; }

/* Make Join button smaller, green, and not full-width */
.room-join-btn { 
  flex: 0 0 auto !important; 
  margin-left: auto; 
  /* Force button theme variables to orange */
  --button-primary-background-fill: #f97316;
  --button-primary-background-fill-hover: #ea580c;
  --button-primary-text-color: #ffffff;
  --button-secondary-background-fill: #f97316;
  --button-secondary-background-fill-hover: #ea580c;
  --button-secondary-text-color: #ffffff;
}
.room-join-btn button {
  font-size: 14px;
  padding: 6px 12px;
  width: 120px;
  /* Ensure primary orange shows even if theme sets gradient */
  background: #f97316 !important; /* orange to match Create */
  background-image: none !important;
  color: #ffffff;
  border: 1px solid #ea580c !important;
}
.room-join-btn button:hover { background: #ea580c !important; }
"""
LOCATION_OPTIONS = [
    "Soccer Field A",
    "Soccer Field B",
    "Soccer Field C",
    "North Field",
    "South Field",
    "Gym Court 1",
    "Gym Court 2",
]


def _ensure_storage():
    if not os.path.exists(STORAGE_PATH):
        os.makedirs(os.path.dirname(STORAGE_PATH), exist_ok=True)
        with open(STORAGE_PATH, "w", encoding="utf-8") as f:
            json.dump({"rooms": []}, f, indent=2)


def _load_rooms():
    _ensure_storage()
    with _lock:
        with open(STORAGE_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
    return data.get("rooms", [])


def _save_rooms(rooms):
    _ensure_storage()
    with _lock:
        with open(STORAGE_PATH, "w", encoding="utf-8") as f:
            json.dump({"rooms": rooms}, f, indent=2)


def _parse_time(time_text: str):
    try:
        dt = datetime.strptime(time_text.strip(), TIME_FMT)
        return dt
    except Exception:
        return None


def _is_valid_slot(dt: datetime) -> bool:
    return dt.minute in (0, 30) and dt.second == 0 and dt.microsecond == 0


def _overlaps(start1: datetime, dur_min1: int, start2: datetime, dur_min2: int) -> bool:
    end1 = start1 + timedelta(minutes=dur_min1)
    end2 = start2 + timedelta(minutes=dur_min2)
    return not (end1 <= start2 or end2 <= start1)


def _availability_ok(location: str, start_dt: datetime, duration_min: int) -> bool:
    rooms = _load_rooms()
    for r in rooms:
        if (r.get("location") or "").strip().lower() != (location or "").strip().lower():
            continue
        existing_start_str = r.get("time")
        existing_dur = int(r.get("duration", MAX_DURATION_MIN))
        try:
            existing_start = datetime.strptime(existing_start_str, TIME_FMT)
        except Exception:
            continue
        if _overlaps(existing_start, existing_dur, start_dt, duration_min):
            return False
    return True


def _ceil_to_next_slot(dt: datetime) -> datetime:
    dt = dt.replace(second=0, microsecond=0)
    add_min = (30 - (dt.minute % 30)) % 30
    if add_min:
        dt = dt + timedelta(minutes=add_min)
    return dt


def list_available_slots(location: str, duration_min: int, hours_ahead: int = SLOTS_LOOKAHEAD_HOURS):
    try:
        duration_min = int(duration_min)
    except Exception:
        duration_min = MAX_DURATION_MIN
    start = _ceil_to_next_slot(datetime.now())
    end = start + timedelta(hours=hours_ahead)

    slots = []
    cur = start
    while cur < end:
        if _availability_ok(location or "", cur, duration_min):
            slots.append(cur.strftime(TIME_FMT))
        cur += timedelta(minutes=SLOT_MINUTES)
    return slots


def list_available_dates(days_ahead: int = SLOTS_LOOKAHEAD_DAYS):
    today = datetime.now().date()
    return [(today + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days_ahead)]


def list_available_times(location: str, duration_min: int, date_text: str):
    try:
        duration_min = int(duration_min)
    except Exception:
        duration_min = MAX_DURATION_MIN

    # Determine day window
    try:
        date_dt = datetime.strptime((date_text or "").strip() or datetime.now().strftime("%Y-%m-%d"), "%Y-%m-%d")
    except Exception:
        date_dt = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    start_of_day = date_dt.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    # If today, start from next valid slot from now; else from 00:00
    now = datetime.now()
    if start_of_day.date() == now.date():
        cur = _ceil_to_next_slot(now)
    else:
        cur = start_of_day

    times = []
    while cur < end_of_day:
        if _availability_ok(location or "", cur, duration_min):
            times.append(cur.strftime("%H:%M"))
        cur += timedelta(minutes=SLOT_MINUTES)
    return times


def list_rooms_table():
    rooms = _load_rooms()
    table = []
    for r in rooms:
        try:
            start_dt = datetime.strptime(r.get("time", ""), TIME_FMT)
            dur = int(r.get("duration", MAX_DURATION_MIN))
            end_dt = start_dt + timedelta(minutes=dur)
            end_str = end_dt.strftime(TIME_FMT)
        except Exception:
            dur = int(r.get("duration", MAX_DURATION_MIN))
            end_str = ""
        table.append({
            "room_id": r.get("id"),
            "name": r.get("name"),
            "location": r.get("location"),
            "time": r.get("time"),
            "end_time": end_str,
            "duration_min": dur,
            "owner_id": r.get("owner_id"),
            "capacity": r.get("capacity"),
            "occupied": f"{len(r.get('participants', []))}/{r.get('capacity', 0)}",
        })
    return table


def list_room_choices():
    rooms = _load_rooms()
    choices = []
    for r in rooms:
        dur = int(r.get("duration", MAX_DURATION_MIN))
        label = f"{r.get('name')} @ {r.get('time','')} ({dur}m) ({len(r.get('participants', []))}/{r.get('capacity', 0)})"
        choices.append((label, r.get("id")))
    return choices


def login(student_id):
    if not student_id or not str(student_id).strip():
        return gr.update(visible=True), gr.update(visible=False), gr.update(value="Please enter a valid Student ID.")
    sid = str(student_id).strip()
    return gr.update(visible=False), gr.update(visible=True), gr.update(value=f"Logged in as: {sid}")


def _format_room_label(r):
    dur = int(r.get("duration", MAX_DURATION_MIN))
    return f"{r.get('name','')}  @ {r.get('time','')}  ({dur}m)  ({len(r.get('participants', []))}/{r.get('capacity', 0)})"


def refresh_join_buttons():
    rooms = _load_rooms()
    labels = [_format_room_label(r) for r in rooms]
    ids = [r.get("id") for r in rooms]

    label_updates = []
    button_updates = []
    for i in range(MAX_ROOM_BUTTONS):
        if i < len(labels):
            label_updates.append(gr.update(value=labels[i], visible=True))
            button_updates.append(gr.update(visible=True))
        else:
            label_updates.append(gr.update(value="", visible=False))
            button_updates.append(gr.update(visible=False))

    return (*label_updates, *button_updates, ids)


def create_room(owner_id, name, location, date_text, time_text, duration_min, capacity):
    owner_id = (owner_id or "").strip()
    name = (name or "").strip()
    location = (location or "").strip()
    date_text = (date_text or "").strip()
    time_text = (time_text or "").strip()

    try:
        duration_min = int(duration_min)
    except Exception:
        duration_min = MAX_DURATION_MIN
    try:
        capacity = int(capacity)
    except Exception:
        capacity = 0

    if not owner_id:
        return (gr.update(value="Missing owner Student ID."),)
    if not name:
        return (gr.update(value="Room name is required."),)
    if capacity <= 0:
        return (gr.update(value="Capacity must be a positive integer."),)
    # Require a valid location selection
    if location not in LOCATION_OPTIONS:
        return (gr.update(value="Please select a valid location."),)

    # Require date and time selections
    if not date_text:
        return (gr.update(value="Please select a date."),)
    if not time_text:
        return (gr.update(value="Please select a time slot."),)

    start_dt = _parse_time(f"{date_text} {time_text}")
    if not start_dt:
        return (gr.update(value=f"Invalid time format. Use {TIME_FMT}"),)

    # Enforce 30-min slots
    if not _is_valid_slot(start_dt):
        return (gr.update(value="Start time must be on a 30-minute boundary (e.g., 07:00 or 07:30)."),)

    # Enforce duration 30 or 60 minutes
    if duration_min not in (30, 60):
        return (gr.update(value="Duration must be 30 or 60 minutes."),)

    # Availability check per location
    if not _availability_ok(location, start_dt, duration_min):
        return (gr.update(value="This location is already booked for the selected time."),)

    rooms = _load_rooms()
    room = {
        "id": str(uuid.uuid4()),
        "name": name,
        "owner_id": owner_id,
        "capacity": capacity,
        "participants": [owner_id],
        "time": start_dt.strftime(TIME_FMT),
        "duration": duration_min,
        "location": location,
    }
    rooms.append(room)
    _save_rooms(rooms)

    success_msg = f"Created room '{name}' on {start_dt.strftime('%Y-%m-%d')} at {start_dt.strftime('%H:%M')} ({duration_min}m), cap {capacity}."
    return (gr.update(value=success_msg),)


def join_room(student_id, room_id):
    if not student_id or not str(student_id).strip():
        return gr.update(value="Please log in first."), *refresh_rooms()
    if not room_id:
        return gr.update(value="Please select a room to join."), *refresh_rooms()

    rooms = _load_rooms()
    target = None
    for r in rooms:
        if r.get("id") == room_id:
            target = r
            break
    if not target:
        return gr.update(value="Room not found (refresh and try again)."), *refresh_rooms()

    participants = target.get("participants", [])
    capacity = int(target.get("capacity", 0))
    sid = str(student_id).strip()

    if sid in participants:
        return gr.update(value="You have already joined this room."), *refresh_rooms()

    if len(participants) >= capacity:
        return gr.update(value="Room is full."), *refresh_rooms()

    participants.append(sid)
    target["participants"] = participants
    _save_rooms(rooms)

    return gr.update(value=f"Joined room '{target.get('name')}'."), *refresh_rooms()


with gr.Blocks(title="Scheduling App", css=CUSTOM_CSS) as demo:
    student_state = gr.State("")

    # Login view
    with gr.Group(visible=True) as login_group:
        gr.Markdown("# Scheduling App")
        student_id_in = gr.Textbox(label="Student ID", placeholder="Enter your Student ID")
        login_btn = gr.Button("Log In", variant="primary")
        login_status = gr.Markdown("", elem_id="login_status")

    # Main view
    with gr.Group(visible=False) as main_group:
        top_info = gr.Markdown("", elem_id="top_info")

        # Join page
        with gr.Group(visible=True) as join_page:
            with gr.Row():
                with gr.Column(scale=5):
                    gr.Markdown("### Available Rooms")
                with gr.Column(scale=1):
                    goto_create_btn = gr.Button("Create", variant="primary")

            # Large per-room rows: label (left) + Join button (right)
            room_labels = []
            room_join_btns = []
            with gr.Column():
                for _i in range(MAX_ROOM_BUTTONS):
                    with gr.Row():
                        room_labels.append(gr.Markdown("", visible=False, elem_classes=["room-label"]))
                        room_join_btns.append(gr.Button("Join", visible=False, elem_classes=["room-join-btn"], variant="primary"))
            room_ids_state = gr.State([])
            join_status = gr.Markdown("")

            # Auto-refresh available rooms every 5 seconds
            auto_timer = gr.Timer(5.0)
            auto_timer.tick(fn=refresh_join_buttons, inputs=None, outputs=[*room_labels, *room_join_btns, room_ids_state])

        # Create page (separate view)
        with gr.Group(visible=False) as create_page:
            with gr.Row():
                with gr.Column(scale=5):
                    gr.Markdown("### Create a Room")
                with gr.Column(scale=1):
                    back_to_join_btn = gr.Button("Back to Join")

            with gr.Row():
                room_name = gr.Textbox(label="Room Name", placeholder="e.g., Soccer Field A")
                room_capacity = gr.Number(label="Capacity", value=4, precision=0)
            with gr.Row():
                room_location = gr.Dropdown(
                    choices=LOCATION_OPTIONS,
                    value=None,
                    label="Location (Field)",
                )
                room_date = gr.Dropdown(
                    choices=list_available_dates(),
                    value=list_available_dates()[0],
                    label="Date (YYYY-MM-DD)",
                )
                room_time = gr.Dropdown(
                    choices=[],
                    label="Time (HH:MM)",
                    value=None,
                )
                room_duration = gr.Dropdown([30, 60], value=60, label="Duration (minutes)")
            with gr.Row():
                create_submit = gr.Button("Save", variant="primary")
            create_status = gr.Markdown("")

    # Wire events
    def on_login(sid):
        lg_vis, mg_vis, msg = login(sid)
        return lg_vis, mg_vis, msg, sid, gr.update(value=f"Logged in as: {sid}")

    login_btn.click(
        on_login,
        inputs=[student_id_in],
        outputs=[login_group, main_group, login_status, student_state, top_info],
    )

    # Initial population of join buttons
    demo.load(refresh_join_buttons, inputs=None, outputs=[*room_labels, *room_join_btns, room_ids_state])

    # Create room submit
    create_evt = create_submit.click(
        create_room,
        inputs=[student_state, room_name, room_location, room_date, room_time, room_duration, room_capacity],
        outputs=[create_status],
    )

    # Update available start slots when location or duration changes
    def compute_slots(loc, dur, date_str):
        try:
            d = int(dur)
        except Exception:
            d = MAX_DURATION_MIN
        if not loc:
            return gr.update(choices=[], value=None)
        return gr.update(choices=list_available_times(loc, d, date_str), value=None)

    room_location.change(compute_slots, inputs=[room_location, room_duration, room_date], outputs=[room_time])
    room_duration.change(compute_slots, inputs=[room_location, room_duration, room_date], outputs=[room_time])
    room_date.change(compute_slots, inputs=[room_location, room_duration, room_date], outputs=[room_time])

    # After creating a room, refresh the available slots as availability changed
    create_evt.then(
        compute_slots,
        inputs=[room_location, room_duration, room_date],
        outputs=[room_time],
    )

    # After creating a room, refresh join rows so new room appears
    create_evt.then(refresh_join_buttons, inputs=None, outputs=[*room_labels, *room_join_btns, room_ids_state])

    # Navigation between pages
    def goto_create():
        return gr.update(visible=False), gr.update(visible=True), gr.update(value="")

    def goto_join():
        return gr.update(visible=True), gr.update(visible=False), gr.update(value="")

    goto_create_btn.click(goto_create, inputs=None, outputs=[join_page, create_page, create_status])
    back_to_join_btn.click(goto_join, inputs=None, outputs=[join_page, create_page, join_status])

    # Join handlers per button
    def _join_by_index(sid, ids, index):
        room_id = ids[index] if index < len(ids) else None
        res = join_room(sid, room_id)
        return res[0]

    for _idx, _btn in enumerate(room_join_btns):
        def _make_handler(i):
            def _handler(sid, ids):
                return _join_by_index(sid, ids, i)
            return _handler
        _btn.click(_make_handler(_idx), inputs=[student_state, room_ids_state], outputs=[join_status]) \
            .then(refresh_join_buttons, inputs=None, outputs=[*room_labels, *room_join_btns, room_ids_state])

if __name__ == "__main__":
    _ensure_storage()
    demo.queue().launch()
