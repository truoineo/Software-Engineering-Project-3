from pydantic import BaseModel

class TimeSlot(BaseModel):
    players: list[str] = []
    status: str = "available"
