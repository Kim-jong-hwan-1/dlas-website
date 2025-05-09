from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.comment import CommentCreate, CommentOut
from app.crud import comment as comment_crud
from app.deps import get_current_user
from typing import List

router = APIRouter(prefix="/comments", tags=["Comments"])

@router.post("/", response_model=CommentOut)
async def create_comment(comment: CommentCreate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return await comment_crud.create_comment(db, comment, author_id=user['id'])

@router.get("/{post_id}", response_model=List[CommentOut])
async def get_comments(post_id: int, db: AsyncSession = Depends(get_db)):
    return await comment_crud.get_comments(db, post_id)
