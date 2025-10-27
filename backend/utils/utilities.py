"""Utility helpers for reservations and user registration."""

from datetime import datetime, timedelta
from pathlib import Path
import json
import re
from typing import Optional, Literal
import sys
import random


sys.path.insert(0, str(Path(__file__).parent.parent))
from storage.storage_template import (
    DailyReservations,
    CourtReservations,
    TimeSlot,
    CourtType,
    Users,
    User,
)


def generate_access_code(length: int = 6) -> str:
    """Generate a human-friendly access code (avoids ambiguous characters)."""
    alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789"
    return "".join(random.choice(alphabet) for _ in range(length))


# Storage directories
STORAGE_DIR = Path(__file__).parent.parent / "storage"
RESERVATIONS_DIR = STORAGE_DIR / "reservations"
USERS_FILE = STORAGE_DIR / "users.json"


def validate_user_id(user_id: str) -> tuple[bool, str]:
    """
    Validate that user ID is in 7-digit format.
    
    Args:
        user_id: The user ID to validate
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check if it's a 7-digit string
    if not re.match(r'^\d{7}$', user_id):
        return False, "User ID must be exactly 7 digits"
    
    return True, ""


def load_users() -> Optional[Users]:
    """
    Load all users from users.json using Pydantic model.
    
    Returns:
        Users object or None if file doesn't exist
    """
    if not USERS_FILE.exists():
        return None
    
    try:
        with USERS_FILE.open("r") as f:
            data = json.load(f)
        return Users.model_validate(data)
    except Exception as e:
        print(f"Error loading users: {e}")
        return None


def save_users(users: Users) -> bool:
    """
    Save users to users.json using Pydantic model.
    
    Args:
        users: Users object to save
        
    Returns:
        True if successful, False otherwise
    """
    try:
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)

        with USERS_FILE.open("w") as f:
            json.dump(users.model_dump(), f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving users: {e}")
        return False


def get_or_register_user(user_id: str, name: None | str) -> tuple[bool, str, dict]:
    """
    Get existing user or register a new one if they don't exist.
    Validates user ID format (7 digits).
    
    Args:
        user_id: The user ID (must be 7 digits)
        name: Optional name for new users. If not provided, uses "User {user_id}"
        
    Returns:
        Tuple of (success, message, user_data)
    """
    # Validate user ID format
    is_valid, error_msg = validate_user_id(user_id)
    if not is_valid:
        return False, error_msg, {}
    
    # Load existing users
    users = load_users()
    if users is None:
        # Create new Users object if file doesn't exist
        users = Users({})
    
    # If user exists, return it
    if user_id in users.root:
        user_data = users.root[user_id].model_dump()
        return True, "Existing user", user_data
    
    # Register new user
    if name is None:
        name = f"User {user_id}"
    
    users.root[user_id] = User(name=name)
    
    if save_users(users):
        user_data = users.root[user_id].model_dump()
        return True, f"New user registered: {name}", user_data
    else:
        return False, "Error saving new user", {}


def get_reservation_filename(date: datetime) -> str:
    """
    Get the filename for a specific date's reservations.
    
    Args:
        date: The date for the reservations
        
    Returns:
        Filename like "reservations_2025-10-21.json"
    """
    return f"reservations_{date.strftime('%Y-%m-%d')}.json"


def get_reservation_filepath(date: datetime) -> Path:
    """Get the full path to a date's reservation file"""
    return RESERVATIONS_DIR / get_reservation_filename(date)


def load_daily_reservations(date: datetime) -> Optional[DailyReservations]:
    """
    Load reservations for a specific date.
    
    Args:
        date: The date to load reservations for
        
    Returns:
        DailyReservations object or None if file doesn't exist
    """
    filepath = get_reservation_filepath(date)
    
    if not filepath.exists():
        return None
    
    try:
        with filepath.open("r") as f:
            data = json.load(f)
        return DailyReservations.model_validate(data)
    except Exception as e:
        print(f"Error loading reservations for {date.date()}: {e}")
        return None


def save_daily_reservations(date: datetime, reservations: DailyReservations) -> bool:
    """
    Save reservations for a specific date.
    
    Args:
        date: The date for the reservations
        reservations: DailyReservations object to save
        
    Returns:
        True if successful, False otherwise
    """
    filepath = get_reservation_filepath(date)

    try:
        RESERVATIONS_DIR.mkdir(parents=True, exist_ok=True)

        with filepath.open("w") as f:
            json.dump(reservations.model_dump(), f, indent=2)
        return True
    except Exception as e:
        print(f"Error saving reservations for {date.date()}: {e}")
        return False


def cleanup_old_reservations() -> int:
    """
    Delete reservation files older than today.
    
    Returns:
        Number of files deleted
    """
    if not RESERVATIONS_DIR.exists():
        return 0
    
    today = datetime.now().date()
    deleted_count = 0
    
    # Find all reservation files
    for filepath in RESERVATIONS_DIR.glob("reservations_*.json"):
        try:
            # Extract date from filename
            filename = filepath.stem  # "reservations_2025-10-21"
            date_str = filename.split("_")[1]  # "2025-10-21"
            file_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            
            # Delete if in the past
            if file_date < today:
                filepath.unlink()
                deleted_count += 1
                print(f"Deleted old reservation file: {filepath.name}")
        except Exception as e:
            print(f"Error processing {filepath.name}: {e}")
    
    return deleted_count


def initialize_reservations_for_next_10_days(
    courts: dict[str, tuple[CourtType, int]],
    timeslots: list[str],
) -> int:
    """Ensure reservation files exist for the next 10 days."""
    created_count = 0
    today = datetime.now().date()

    for days_ahead in range(10):
        target_date = datetime.combine(today + timedelta(days=days_ahead), datetime.min.time())
        filepath = get_reservation_filepath(target_date)
        if filepath.exists():
            continue

        courts_data = {}
        for court_name, (court_type, capacity) in courts.items():
            timeslots_data = {
                time: TimeSlot(players_id=[], status="available", type="public")
                for time in timeslots
            }
            courts_data[court_name] = CourtReservations(
                type=court_type,
                capacity=capacity,
                timeslots=timeslots_data,
            )

        reservations = DailyReservations(courts_data)
        if save_daily_reservations(target_date, reservations):
            created_count += 1
            print(f"Created reservation file for {target_date.date()}")

    return created_count


def ensure_reservations_for_date(
    date: datetime,
    courts: dict[str, tuple[CourtType, int]],
    timeslots: list[str],
) -> DailyReservations:
    """Ensure there is a reservation file for the given date and return it."""
    reservations = load_daily_reservations(date)
    if reservations:
        return reservations

    courts_data = {}
    for court_name, (court_type, capacity) in courts.items():
        timeslots_data = {
            time: TimeSlot(players_id=[], status="available", type="public")
            for time in timeslots
        }
        courts_data[court_name] = CourtReservations(
            type=court_type,
            capacity=capacity,
            timeslots=timeslots_data,
        )

    reservations = DailyReservations(courts_data)
    save_daily_reservations(date, reservations)
    return reservations


def sync_timeslot_status(timeslot: TimeSlot, capacity: int) -> None:
    """
    Synchronize the status field with the current player count.
    
    Args:
        timeslot: The timeslot to update
        capacity: Maximum number of players allowed
    """
    if len(timeslot.players_id) >= capacity:
        timeslot.status = "full"
    else:
        timeslot.status = "available"


def add_player_to_timeslot(
    date: datetime,
    court_name: str,
    timeslot: str,
    user_id: str,
    user_name: str | None,
    timeslot_type: Literal["private", "public"] = "public",
    room_name: str | None = None,
    duration_min: int | None = None,
    access_code: str | None = None,
    reservation_name: str = "",
    court_type_label: str = "",
) -> dict:
    """
    Add a player to a specific timeslot and auto-update status.
    Automatically registers new users if they don't exist.
    
    Args:
        date: The date for the reservation
        court_name: Name of the court (e.g., "Court A")
        timeslot: Time in HH:MM format (e.g., "09:00")
        user_id: Student ID to add (must be 7 digits)
        user_name: Optional name for new users
        timeslot_type: "private" or "public" (only applies to first player)
        reservation_name: Optional name for the reservation (only applies to first player)
        court_type: User-defined court/activity type (only applies to first player)
    
    Returns:
        Dictionary with success status and message
    """
    # Validate timeslot_type
    if timeslot_type not in ["private", "public"]:
        return {"success": False, "message": "Timeslot type must be 'private' or 'public'"}
    
    # Validate and register user if needed
    success, message, user_data = get_or_register_user(user_id, user_name)
    if not success:
        return {"success": False, "message": message}
    
    # Note if user was just registered
    is_new_user = "registered" in message.lower()
    
    # Load reservations for the date
    reservations = load_daily_reservations(date)
    if not reservations:
        return {"success": False, "message": "No reservations found for this date"}
    
    # Get the court
    court = reservations.root.get(court_name)
    if not court:
        return {"success": False, "message": f"Court '{court_name}' not found"}
    
    # Get the timeslot
    slot = court.timeslots.get(timeslot)
    if not slot:
        return {"success": False, "message": f"Timeslot '{timeslot}' not found"}
    
    # Validation
    if user_id in slot.players_id:
        return {"success": False, "message": "Already joined this timeslot"}
    
    if len(slot.players_id) >= court.capacity:
        return {"success": False, "message": "Timeslot is full"}
    
    # Check if trying to join a private timeslot
    normalized_code = (access_code or "").strip().upper() or None

    if slot.type == "private" and len(slot.players_id) > 0:
        if not normalized_code or slot.access_code != normalized_code:
            return {"success": False, "message": "Invalid or missing access code for this private room."}
    
    # Set type, reservation name, and court type if this is the first player
    is_first_player = len(slot.players_id) == 0
    if is_first_player:
        slot.type = timeslot_type
        slot.owner_id = user_id
        slot.room_name = (room_name or reservation_name or f"{court_name} {timeslot}")
        slot.duration_min = duration_min
        slot.reservation_name = reservation_name or slot.reservation_name
        slot.court_type = court_type_label or slot.court_type
        if timeslot_type == "private":
            slot.access_code = normalized_code or generate_access_code()
        else:
            slot.access_code = None
    else:
        if not slot.room_name and room_name:
            slot.room_name = room_name
        if reservation_name and not slot.reservation_name:
            slot.reservation_name = reservation_name
        if court_type_label and not slot.court_type:
            slot.court_type = court_type_label
        if slot.type == "private" and slot.access_code:
            normalized_code = slot.access_code
    
    # Add player
    slot.players_id.append(user_id)
    
    # Auto-update status
    sync_timeslot_status(slot, court.capacity)
    
    # Save changes
    if save_daily_reservations(date, reservations):
        result = {
            "success": True,
            "message": f"Successfully joined {court_name} at {timeslot}",
            "status": slot.status,
            "timeslot_type": slot.type,
            "reservation_name": slot.reservation_name,
            "court_type": slot.court_type,
            "current_players": len(slot.players_id),
            "capacity": court.capacity,
            "user_name": user_data.get("name", "Unknown"),
            "room_name": slot.room_name,
            "owner_id": slot.owner_id,
            "duration_min": slot.duration_min or 60,
        }
        
        if is_first_player:
            result["message"] += f" (Set as {timeslot_type})"
            if slot.type == "private" and slot.access_code:
                result["access_code"] = slot.access_code
            if slot.reservation_name:
                result["message"] += f" - '{slot.reservation_name}'"
            if slot.court_type:
                result["message"] += f" ({slot.court_type})"
        
        if is_new_user:
            result["new_user_registered"] = True
            result["message"] += f" (New user '{user_data['name']}' registered)"
        
        return result
    else:
        return {"success": False, "message": "Error saving reservation"}


def remove_player_from_timeslot(
    date: datetime,
    court_name: str,
    timeslot: str,
    user_id: str
) -> dict:
    """
    Remove a player from a specific timeslot and auto-update status.
    
    Args:
        date: The date for the reservation
        court_name: Name of the court (e.g., "Court A")
        timeslot: Time in HH:MM format (e.g., "09:00")
        user_id: Student ID to remove
    
    Returns:
        Dictionary with success status and message
    """
    # Load reservations for the date
    reservations = load_daily_reservations(date)
    if not reservations:
        return {"success": False, "message": "No reservations found for this date"}
    
    # Get the court
    court = reservations.root.get(court_name)
    if not court:
        return {"success": False, "message": f"Court '{court_name}' not found"}
    
    # Get the timeslot
    slot = court.timeslots.get(timeslot)
    if not slot:
        return {"success": False, "message": f"Timeslot '{timeslot}' not found"}
    
    # Check if user is in the timeslot
    if user_id not in slot.players_id:
        return {"success": False, "message": "Not in this timeslot"}
    
    # Remove player
    slot.players_id.remove(user_id)

    # If owner leaves, promote next participant or reset metadata
    if slot.owner_id == user_id:
        slot.owner_id = slot.players_id[0] if slot.players_id else None
        if not slot.owner_id:
            slot.room_name = None
            slot.type = "public"
            slot.duration_min = None
            slot.access_code = None
            slot.reservation_name = ""
            slot.court_type = ""
    
    # Auto-update status
    sync_timeslot_status(slot, court.capacity)
    
    # Save changes
    if save_daily_reservations(date, reservations):
        return {
            "success": True,
            "message": f"Successfully left {court_name} at {timeslot}",
            "status": slot.status,
            "current_players": len(slot.players_id),
            "capacity": court.capacity,
            "owner_id": slot.owner_id,
            "room_name": slot.room_name,
        }
    else:
        return {"success": False, "message": "Error saving reservation"}


def clear_timeslot(
    date: datetime,
    court_name: str,
    timeslot: str,
) -> dict:
    """Reset a timeslot to its default state."""
    reservations = load_daily_reservations(date)
    if not reservations:
        return {"success": False, "message": "No reservations found for this date"}

    court = reservations.root.get(court_name)
    if not court:
        return {"success": False, "message": f"Court '{court_name}' not found"}

    slot = court.timeslots.get(timeslot)
    if not slot:
        return {"success": False, "message": f"Timeslot '{timeslot}' not found"}

    slot.players_id = []
    slot.status = "available"
    slot.type = "public"
    slot.owner_id = None
    slot.room_name = None
    slot.duration_min = None
    slot.access_code = None
    slot.reservation_name = ""
    slot.court_type = ""

    if save_daily_reservations(date, reservations):
        return {"success": True}
    return {"success": False, "message": "Error saving reservation"}


def list_reservations_between(start_date: datetime, days: int = 7) -> list[dict]:
    """Return a list of reservation summaries for the given date range."""
    results: list[dict] = []
    for offset in range(days):
        current = start_date + timedelta(days=offset)
        reservations = load_daily_reservations(current)
        if not reservations:
            continue
        date_str = current.strftime("%Y-%m-%d")
        for court_name, court in reservations.root.items():
            for time_str, slot in court.timeslots.items():
                if not slot.owner_id and not slot.room_name and not slot.players_id:
                    continue
                results.append(
                    {
                        "id": f"{date_str}|{court_name}|{time_str}",
                        "date": date_str,
                        "time": time_str,
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
                        "reservation_name": slot.reservation_name,
                        "activity_label": slot.court_type,
                    }
                )
    return results


# Example usage and testing
if __name__ == "__main__":
    print("🧪 Testing utilities...\n")
    
    courts_config = {
        "Court A": (CourtType.BASKETBALL, 4),
        "Court B": (CourtType.TENNIS, 4),
        "Court C": (CourtType.VOLLEYBALL, 6),
    }
    
    # Define timeslots
    timeslots_config = ["09:00", "11:00", "14:00", "16:00", "18:00"]
    
    # Initialize next 10 days
    print("📅 Initializing reservation files for next 10 days...")
    created = initialize_reservations_for_next_10_days(courts_config, timeslots_config)
    print(f"✅ Created {created} new reservation files\n")
    
    # Test adding a player with custom court type
    print("👤 Testing add player...")
    today = datetime.now()
    result = add_player_to_timeslot(
        today,
        "Court A",
        "09:00",
        "1218347",
        user_name="Huy",
        timeslot_type="private",
        room_name="Practice Session",
        duration_min=90,
        reservation_name="Practice Session",
        court_type_label="5v5 Basketball",
    )
    print(f"   {result['message']}")
    if result.get("access_code"):
        print(f"   Invite code: {result['access_code']}")
    
    # Clean up old files
    print("\n🧹 Cleaning up old reservation files...")
    deleted = cleanup_old_reservations()
    print(f"✅ Deleted {deleted} old files")
