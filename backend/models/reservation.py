from pydantic import BaseModel # for data validation and settings management
from typing import Dict # for dictionary types
from .timeslot import TimeSlot # import TimeSlot model

# Reservation model for a specific court 
class CourtReservation(BaseModel):
    type: str # "tennis", "basketball"
    capacity: int # maximum players allowed
    timeslots: Dict[str, TimeSlot]  # ISO timestamp -> TimeSlot
# DailyReservations model for all courts in a day 
class DailyReservations(BaseModel):
    __root__: Dict[str, CourtReservation]  # court_name -> CourtReservation
