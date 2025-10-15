from pydantic import BaseModel
from typing import Dict

class User(BaseModel):
    name: str

class Users(BaseModel):
    __root__: Dict[str, User]  # student_id -> User
