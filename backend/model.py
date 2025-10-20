from pydantic import BaseModel, Field, RootModel
from typing import Dict, List
from datetime import datetime

# --- User model ---
class User(BaseModel):
    name: str


# --- Users root model ---
class Users(RootModel[Dict[str, User]]):
    """Mapping of student_id -> User"""
    pass # End Users

# --- TimeSlot model ---
class TimeSlot(BaseModel):
    time: datetime                    # e.g., "2025-10-13T09:00:00"
    players_id: List[str] = [] # List of student IDs who have reserved this timeslot
    status: str = "available"          # "available" or "full"


# --- CourtReservations model ---
class CourtReservations(BaseModel):
    type: str                          # e.g., "Basketball" or "Tennis"
    capacity: int                      # maximum players allowed
    timeslots: Dict[str, TimeSlot]     # ISO timestamp -> TimeSlot


# --- DailyReservations model ---
class DailyReservations(RootModel[Dict[str, CourtReservations]]):
    """Mapping of court_name -> CourtReservation"""
    pass

'''
# ---------------- SCHEMA TEST ----------------
if __name__ == "__main__":
    print("\n=== User Schema ===")
    print(User.model_json_schema())

    print("\n=== TimeSlot Schema ===")
    print(TimeSlot.model_json_schema())

    print("\n=== CourtReservation Schema ===")
    print(CourtReservations.model_json_schema())

    print("\n=== DailyReservations Schema ===")
    print(DailyReservations.model_json_schema())
'''

'''
# --- User model ---
class User(BaseModel):
    name: str
    
class Users(BaseModel):
    __root__: Dict[str, User]  # student_id -> User
'''