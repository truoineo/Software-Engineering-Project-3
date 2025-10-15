from pydantic import BaseModel
from typing import Dict

class Court(BaseModel):
    type: str
    capacity: int

class Courts(BaseModel):
    __root__: Dict[str, Court]  # court_name -> Court
