import os
from datetime import datetime, timedelta
from typing import Tuple

from flask import Flask, request, jsonify, abort
from flask_cors import CORS

from backend.storage.storage_template import CourtType
from backend.utils.utilities import (
    add_player_to_timeslot,
    remove_player_from_timeslot,
    clear_timeslot,
    list_reservations_between,
    ensure_reservations_for_date,
    initialize_reservations_for_next_10_days,
    load_daily_reservations,
)

DEFAULT_LOOKAHEAD_DAYS = 7
DEFAULT_TIMESLOTS = [f"{hour:02d}:{minute:02d}" for hour in range(0, 24) for minute in (0, 30)]
DEFAULT_COURTS = {
    "Tennis Courts": (CourtType.TENNIS, 8),
    "Armington Physical Education Center* ∆": (CourtType.BASKETBALL, 20),
    "L.C. Boles Golf Course": (CourtType.GOLF, 12),
    "Cindy Barr Field": (CourtType.FOOTBALL, 24),
    "Carl W. Dale Soccer Field": (CourtType.SOCCER, 22),
    "Murray Baseball Field": (CourtType.BASEBALL, 20),
    "Papp Stadium* ∆": (CourtType.FOOTBALL, 28),
    "Scot Center* ∆": (CourtType.BASKETBALL, 24),
    "Softball Diamond": (CourtType.BASEBALL, 18),
    "Timken Gymnasium*": (CourtType.BASKETBALL, 18),
}

# Ensure we have an initial set of reservation files.
initialize_reservations_for_next_10_days(DEFAULT_COURTS, DEFAULT_TIMESLOTS)

app = Flask(__name__)

# Allow the frontend to send cookies/credentials during local development.
# Flask-CORS requires explicit origins when credentials are enabled.
_frontend_origins = os.environ.get(
    "FRONTEND_ORIGINS",
    "http://localhost:5173 http://127.0.0.1:5173 http://localhost:3000 http://127.0.0.1:3000",
)
ALLOWED_ORIGINS = [origin.strip() for origin in _frontend_origins.split() if origin.strip()]
CORS(app, resources={r"/api/*": {"origins": ALLOWED_ORIGINS}}, supports_credentials=True)


def _parse_room_id(room_id: str) -> Tuple[str, str, str]:
    try:
        date_str, court_name, time_str = room_id.split("|")
        return date_str, court_name, time_str
    except ValueError:
        abort(400, description="Invalid room id")


def _serialize_entry(entry: dict, *, include_access_code: bool = False) -> dict:
    time_string = f"{entry['date']} {entry['time']}"
    payload = {
        "id": entry["id"],
        "name": entry.get("room_name") or entry.get("court"),
        "location": entry.get("court"),
        "time": time_string,
        "duration": entry.get("duration_min") or 60,
        "owner_id": entry.get("owner_id") or "",
        "privacy": entry.get("privacy", "public"),
        "type": (entry.get("court_type") or "general").lower(),
        "capacity": entry.get("capacity"),
        "participants": entry.get("participants", []),
        "status": entry.get("status", "available"),
    }
    if include_access_code and entry.get("access_code"):
        payload["access_code"] = entry.get("access_code")
    return payload


def _ensure_date(date_dt: datetime):
    ensure_reservations_for_date(date_dt, DEFAULT_COURTS, DEFAULT_TIMESLOTS)
    reservations = load_daily_reservations(date_dt)
    if not reservations:
        abort(500, description="Unable to load reservations")
    return reservations


def _build_entry(date_dt: datetime, court_name: str, timeslot: str) -> dict:
    reservations = _ensure_date(date_dt)
    court = reservations.root.get(court_name)
    if not court:
        abort(404, description="Court not found")
    slot = court.timeslots.get(timeslot)
    if not slot:
        abort(404, description="Timeslot not found")

    date_str = date_dt.strftime("%Y-%m-%d")
    return {
        "id": f"{date_str}|{court_name}|{timeslot}",
        "date": date_str,
        "time": timeslot,
        "court": court_name,
        "court_type": court.type.value,
        "capacity": court.capacity,
        "participants": slot.players_id,
        "owner_id": slot.owner_id,
        "room_name": slot.room_name,
        "privacy": slot.type,
        "duration_min": slot.duration_min,
        "status": slot.status,
        "access_code": slot.access_code,
    }


@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.get("/api/rooms")
def list_rooms():
    student_id = str(request.args.get("student_id", "")).strip()
    entries = list_reservations_between(datetime.now(), DEFAULT_LOOKAHEAD_DAYS)
    rooms = []
    for entry in entries:
        include_code = bool(student_id) and entry.get("owner_id") == student_id and entry.get("privacy") == "private"
        rooms.append(_serialize_entry(entry, include_access_code=include_code))
    return jsonify({"rooms": rooms})


@app.get("/api/rooms/<room_id>")
def get_room(room_id):
    student_id = str(request.args.get("student_id", "")).strip()
    date_str, court_name, time_str = _parse_room_id(room_id)
    date_dt = datetime.strptime(date_str, "%Y-%m-%d")
    entry = _build_entry(date_dt, court_name, time_str)
    include_code = entry.get("owner_id") == student_id and entry.get("privacy") == "private"
    return jsonify({"room": _serialize_entry(entry, include_access_code=include_code)})


@app.post("/api/rooms")
def create_room():
    payload = request.get_json(force=True) or {}
    for field in ["owner_id", "name", "location", "time"]:
        if not str(payload.get(field, "")).strip():
            abort(400, description=f"{field} is required")

    owner_id = str(payload.get("owner_id")).strip()
    location = payload.get("location")
    time_str = str(payload.get("time")).strip()

    try:
        date_part, slot_part = time_str.split(" ")
        date_dt = datetime.strptime(date_part, "%Y-%m-%d")
    except ValueError:
        abort(400, description="time must be in 'YYYY-MM-DD HH:MM' format")

    reservations = _ensure_date(date_dt)
    court = reservations.root.get(location)
    if not court:
        abort(404, description="Invalid location")

    result = add_player_to_timeslot(
        date_dt,
        location,
        slot_part,
        owner_id,
        payload.get("owner_name"),
        timeslot_type=(payload.get("privacy") or "public").lower(),
        room_name=payload.get("name"),
        duration_min=int(payload.get("duration", 60) or 60),
        access_code=payload.get("access_code"),
    )

    if not result.get("success"):
        abort(409, description=result.get("message", "Unable to create room"))

    additional_participants = [sid for sid in (payload.get("participants") or []) if sid and sid != owner_id]
    for sid in additional_participants:
        join_result = add_player_to_timeslot(
            date_dt,
            location,
            slot_part,
            sid,
            None,
            timeslot_type=result.get("timeslot_type", "public"),
            room_name=result.get("room_name"),
            duration_min=result.get("duration_min") or 60,
            access_code=result.get("access_code"),
        )
        if not join_result.get("success"):
            abort(409, description=join_result.get("message", "Unable to add participant"))

    entry = _build_entry(date_dt, location, slot_part)
    include_code = bool(result.get("access_code")) and entry.get("privacy") == "private"
    serialized = _serialize_entry(entry, include_access_code=include_code)
    if include_code:
        serialized["access_code"] = result.get("access_code")
    return jsonify({"room": serialized}), 201


@app.post("/api/rooms/<room_id>/attendees")
def update_attendance(room_id):
    payload = request.get_json(force=True) or {}
    student_id = str(payload.get("student_id", "")).strip()
    action = (payload.get("action") or "toggle").lower()
    if not student_id:
        abort(400, description="student_id is required")

    date_str, court_name, time_str = _parse_room_id(room_id)
    date_dt = datetime.strptime(date_str, "%Y-%m-%d")
    reservations = _ensure_date(date_dt)
    court = reservations.root.get(court_name)
    if not court:
        abort(404, description="Court not found")
    slot = court.timeslots.get(time_str)
    if not slot:
        abort(404, description="Timeslot not found")

    access_code = payload.get("access_code")

    if action == "leave":
        result = remove_player_from_timeslot(date_dt, court_name, time_str, student_id)
    else:
        result = add_player_to_timeslot(
            date_dt,
            court_name,
            time_str,
            student_id,
            None,
            timeslot_type=slot.type,
            room_name=slot.room_name,
            duration_min=slot.duration_min or 60,
            access_code=access_code,
        )

    if not result.get("success"):
        status = 409 if "full" in result.get("message", "").lower() else 400
        abort(status, description=result.get("message", "Unable to update attendance"))

    entry = _build_entry(date_dt, court_name, time_str)
    include_code = entry.get("owner_id") == student_id and entry.get("privacy") == "private"
    return jsonify({"room": _serialize_entry(entry, include_access_code=include_code)})


@app.delete("/api/rooms/<room_id>")
def delete_room(room_id):
    student_id = str(request.args.get("student_id", "")).strip()
    date_str, court_name, time_str = _parse_room_id(room_id)
    date_dt = datetime.strptime(date_str, "%Y-%m-%d")
    reservations = _ensure_date(date_dt)
    court = reservations.root.get(court_name)
    if not court:
        abort(404, description="Court not found")
    slot = court.timeslots.get(time_str)
    if not slot:
        abort(404, description="Timeslot not found")
    if slot.owner_id and student_id and student_id != slot.owner_id:
        abort(403, description="Only the owner can cancel this room")

    result = clear_timeslot(date_dt, court_name, time_str)
    if not result.get("success"):
        abort(500, description=result.get("message", "Unable to clear timeslot"))
    return ("", 204)


@app.get("/api/profile/<student_id>")
def profile(student_id):
    sid = (student_id or "").strip()
    entries = list_reservations_between(datetime.now(), DEFAULT_LOOKAHEAD_DAYS)
    owned = [_serialize_entry(entry, include_access_code=True) for entry in entries if entry.get("owner_id") == sid]
    joined = [_serialize_entry(entry) for entry in entries if sid in entry.get("participants", []) and entry.get("owner_id") != sid]
    return jsonify({"owned": owned, "joined": joined})


@app.post("/api/rooms/private-access")
def private_access_lookup():
    payload = request.get_json(force=True) or {}
    access_code = str(payload.get("access_code", "")).strip().upper()
    if not access_code:
        abort(400, description="access_code is required")

    entries = list_reservations_between(datetime.now(), DEFAULT_LOOKAHEAD_DAYS)
    for entry in entries:
        code = (entry.get("access_code") or "").strip().upper()
        if code and code == access_code:
            return jsonify({"room": _serialize_entry(entry)})

    abort(404, description="No room matches that invite code")


@app.get("/api/availability/dates")
def availability_dates():
    days = int(request.args.get("days", DEFAULT_LOOKAHEAD_DAYS))
    today = datetime.now().date()
    dates = [(today + timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    return jsonify({"dates": dates})


@app.get("/api/availability/times")
def availability_times():
    location = request.args.get("location", "")
    date_text = request.args.get("date", datetime.now().strftime("%Y-%m-%d"))

    try:
        date_dt = datetime.strptime(date_text, "%Y-%m-%d")
    except ValueError:
        abort(400, description="Invalid date format. Use YYYY-MM-DD")

    reservations = _ensure_date(date_dt)
    now = datetime.now()
    times = []
    if location:
        court = reservations.root.get(location)
        if not court:
            return jsonify({"times": []})
        for time_str, slot in court.timeslots.items():
            slot_dt = datetime.strptime(f"{date_text} {time_str}", "%Y-%m-%d %H:%M")
            if slot.owner_id:
                continue
            if slot_dt < now:
                continue
            times.append(time_str)
    else:
        for court in reservations.root.values():
            for time_str, slot in court.timeslots.items():
                slot_dt = datetime.strptime(f"{date_text} {time_str}", "%Y-%m-%d %H:%M")
                if slot.owner_id:
                    continue
                if slot_dt < now:
                    continue
                if time_str not in times:
                    times.append(time_str)
    times.sort()
    return jsonify({"times": times})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5050)))
