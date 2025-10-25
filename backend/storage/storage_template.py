from pydantic import BaseModel, Field, RootModel
from typing import Dict, List, Literal
from enum import Enum

# --- CourtType enum ---
class CourtType(str, Enum):
    """Enum for different court/sport types"""
    BASKETBALL = "Basketball"
    SOCCER = "Soccer"
    FOOTBALL = "Football"
    BASEBALL = "Baseball"
    GOLF = "Golf"
    TENNIS = "Tennis"
    VOLLEYBALL = "Volleyball"


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
    owner_id: str | None = None
    room_name: str | None = None
    duration_min: int | None = None
    access_code: str | None = None


# --- CourtReservations model ---
class CourtReservations(BaseModel):
    type: CourtType  # Court/sport type (Basketball, Soccer, etc.)
    capacity: int  # Maximum players allowed
    timeslots: Dict[str, TimeSlot]  # Time string (HH:MM) -> TimeSlot


# --- DailyReservations model ---
class DailyReservations(RootModel[Dict[str, CourtReservations]]):
    """Mapping of court_name -> CourtReservation"""
    pass
