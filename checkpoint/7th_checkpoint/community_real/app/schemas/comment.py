from pydantic import BaseModel
from datetime import datetime

class CommentBase(BaseModel):
    content: str
    post_id: int

class CommentCreate(CommentBase):
    pass

class CommentOut(CommentBase):
    id: int
    author_id: int
    created_at: datetime

    class Config:
        orm_mode = True
