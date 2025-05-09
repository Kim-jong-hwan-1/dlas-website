from pydantic import BaseModel
from datetime import datetime

class EditHistoryOut(BaseModel):
    id: int
    post_id: int
    content_before: str
    content_after: str
    edited_at: datetime

    class Config:
        orm_mode = True
