from pydantic import BaseModel, Field, RootModel
from typing import Dict, List, Literal

# --- User model ---
class User(BaseModel):
    name: str


# --- Users root model ---
class Users(RootModel[Dict[str, User]]):
    """Mapping of student_id -> User"""
    pass # End Users


# --- TimeSlot model ---
class TimeSlot(BaseModel):
    """
    Represents a single timeslot for a court.
    Note: The timeslot time is stored as the dictionary key in HH:MM format (e.g., "09:00", "14:30").
    The date is determined by the filename (e.g., reservations_2025-10-21.json).
    """
    players_id: List[str] = Field(default_factory=list)  # List of student IDs who have reserved this timeslot
    status: str = "available"  # "available" or "full"
    type: Literal["private", "public"] = "public"  # Set by first player: "private" or "public"
    reservation_name: str = ""  # Optional name for the reservation (e.g., "Basketball Game", "Practice Session")
    court_type: str = ""  # User-defined court/activity type (e.g., "Basketball", "3v3 Soccer", "Doubles Tennis")


# --- CourtReservations model ---
class CourtReservations(BaseModel):
    capacity: int  # Maximum players allowed
    timeslots: Dict[str, TimeSlot]  # Time string (HH:MM) -> TimeSlot


# --- DailyReservations model ---
class DailyReservations(RootModel[Dict[str, CourtReservations]]):
    """Mapping of court_name -> CourtReservation"""
    pass
