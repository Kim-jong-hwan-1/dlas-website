from pydantic import BaseModel
from typing import Optional

class PostCreate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None

class PostUpdate(BaseModel):
    title: str
    content: str
    category: Optional[str] = None

class CommentCreate(BaseModel):
    content: str

class VoteRequest(BaseModel):
    vote_type: str  # 'up' 또는 'down'
