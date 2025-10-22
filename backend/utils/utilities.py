"""
Utility functions for managing daily reservation files
"""

from datetime import datetime, timedelta
from pathlib import Path
import json
import re
from typing import Optional, Literal
import sys

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))
from storage.storage_template import DailyReservations, CourtReservations, TimeSlot, CourtType, Users, User

# Storage directory
STORAGE_DIR = Path(__file__).parent.parent / "storage"
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
        with open(USERS_FILE, 'r') as f:
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
        # Ensure storage directory exists
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        
        with open(USERS_FILE, 'w') as f:
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
    return STORAGE_DIR / get_reservation_filename(date)


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
        with open(filepath, 'r') as f:
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
        # Ensure storage directory exists
        STORAGE_DIR.mkdir(parents=True, exist_ok=True)
        
        with open(filepath, 'w') as f:
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
    if not STORAGE_DIR.exists():
        return 0
    
    today = datetime.now().date()
    deleted_count = 0
    
    # Find all reservation files
    for filepath in STORAGE_DIR.glob("reservations_*.json"):
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
    timeslots: list[str]
) -> int:
    """
    Create reservation files for the next 10 days if they don't exist.
    
    Args:
        courts: Dictionary of court_name -> (court_type, capacity)
                Example: {"Court A": (CourtType.BASKETBALL, 4)}
        timeslots: List of timeslot strings in HH:MM format
                   Example: ["09:00", "11:00", "14:00", "18:00"]
    
    Returns:
        Number of files created
    """
    created_count = 0
    today = datetime.now().date()
    
    for days_ahead in range(10):
        target_date = datetime.combine(today + timedelta(days=days_ahead), datetime.min.time())
        filepath = get_reservation_filepath(target_date)
        
        # Skip if file already exists
        if filepath.exists():
            continue
        
        # Create new daily reservations
        courts_data = {}
        for court_name, (court_type, capacity) in courts.items():
            # Create empty timeslots with default "public" type
            timeslots_data = {
                time: TimeSlot(players_id=[], status="available", type="public")
                for time in timeslots
            }
            
            courts_data[court_name] = CourtReservations(
                type=court_type,
                capacity=capacity,
                timeslots=timeslots_data
            )
        
        reservations = DailyReservations(courts_data)
        
        if save_daily_reservations(target_date, reservations):
            created_count += 1
            print(f"Created reservation file for {target_date.date()}")
    
    return created_count


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
    user_name: str  | None,
    timeslot_type: Literal["private", "public"] = "public"
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
    if slot.type == "private" and len(slot.players_id) > 0:
        return {"success": False, "message": "This is a private timeslot"}
    
    # Set type if this is the first player
    is_first_player = len(slot.players_id) == 0
    if is_first_player:
        slot.type = timeslot_type
    
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
            "current_players": len(slot.players_id),
            "capacity": court.capacity,
            "user_name": user_data.get("name", "Unknown")
        }
        
        if is_first_player:
            result["message"] += f" (Set as {timeslot_type})"
        
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
    
    # Auto-update status
    sync_timeslot_status(slot, court.capacity)
    
    # Save changes
    if save_daily_reservations(date, reservations):
        return {
            "success": True,
            "message": f"Successfully left {court_name} at {timeslot}",
            "status": slot.status,
            "current_players": len(slot.players_id),
            "capacity": court.capacity
        }
    else:
        return {"success": False, "message": "Error saving reservation"}


# Example usage and testing
if __name__ == "__main__":
    print("🧪 Testing utilities...\n")
    
    # Define your courts
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
    
    # Test adding a player
    print("👤 Testing add player...")
    today = datetime.now()
    result = add_player_to_timeslot(today, "Court A", "09:00", "1218347", user_name="Huy", timeslot_type="private")
    print(f"   {result['message']}")
    
    # Clean up old files
    print("\n🧹 Cleaning up old reservation files...")
    deleted = cleanup_old_reservations()
    print(f"✅ Deleted {deleted} old files")
