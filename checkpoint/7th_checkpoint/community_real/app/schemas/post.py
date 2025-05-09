from pydantic import BaseModel
from datetime import datetime

class PostBase(BaseModel):
    title: str
    content: str
    category_id: int

class PostCreate(PostBase):
    pass

class PostOut(PostBase):
    id: int
    author_id: int
    created_at: datetime

    class Config:
        orm_mode = True
