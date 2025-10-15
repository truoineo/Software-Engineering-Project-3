import json, os
from datetime import datetime, timedelta
from pathlib import Path
from models.user import Users, User
from models.reservation import DailyReservations, CourtReservation

STORAGE_DIR = Path("backend/storage")

'''
===================================================================================
            All functions below are using Pydantic Models which is in models/.
            These models are used for data validation and settings management.
===================================================================================
'''

def load_users() -> Users:
    """Load users from JSON file."""
    path = STORAGE_DIR / "users.json"
    if not path.exists():
        with open(path, 'w') as f:
            json.dump({}, f) # Create empty JSON file if not exists
    with open(path, 'r') as f:
        return Users.parse_obj(json.load(f)) # Load and parse JSON data into Users model


def save_users(users: Users):
    with open(STORAGE_DIR / "users.json", 'w') as f:
        json.dump(users.dict(), f, indent=2) # Save Users model data to JSON file with indentation
         
    
def get_reservation_path(date: str) -> Path:
    """Get the file path for reservations of a specific date."""
    return STORAGE_DIR / f"reservations_{date}.json"

def load_daily_reservations(date: str) -> DailyReservations:
    """Load daily reservations from JSON file for a specific date."""
    path = get_reservation_path(date)
    if not path.exists():
        with open(path, 'w') as f:
            json.dump({}, f) # Create empty JSON file if not exists
    with open(path, 'r') as f:
        return DailyReservations.parse_obj(json.load(f)) # Load and parse JSON data into DailyReservations model

def save_daily_reservations(date: str, reservations: DailyReservations):
    """Save daily reservations to JSON file for a specific date."""
    path = get_reservation_path(date)
    with open(path, 'w') as f:
        json.dump(reservations.dict(), f, indent=2)
    
'''
===================================================================================
            Huy I need you to check the function below.
            This function is to create a reservation for a user.
            But I am not sure if it is correct.
===================================================================================
'''
 
def create_reservation(date: str, court_name: str, timeslot: str, student_id: str):
    reservations = load_daily_reservations(date)
    courts = reservations.__root__
    if court_name not in courts:
        raise ValueError("Court not found.")
    
    court = courts[court_name]
    if timeslot not in court.timeslots:
        court.timeslots[timeslot] = {"players": [], "status": "available"}
    
    slot = court.timeslots[timeslot]
    if len(slot.players) >= court.capacity:
        raise ValueError("Timeslot is full.")
    
    slot.players.append(student_id)
    if len(slot.players) == court.capacity:
        slot.status = "full"
    
    save_daily_reservations(date, reservations)
    return f"Reservation created for {student_id} on {court_name} at {timeslot}"

'''
===================================================================================
            This is a function to clean up old reservation files. 
            Based on the note different storage file for each day, up to 10 days, 
            automatically delete after 10 days.
===================================================================================
'''

def cleanup_old_reservations(days_to_keep: int = 10):
    today = datetime.now().date()
    for file in STORAGE_DIR.glob("reservations_*.json"):
        date_str = file.stem.replace("reservations_", "")
        try:
            file_date = datetime.strptime(date_str, "%Y-%m-%d").date()
            if (today - file_date).days > days_to_keep:
                os.remove(file)
                print(f"Deleted old file: {file.name}")
        except ValueError:
            continue

