from fastapi import APIRouter, Depends, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.post import PostCreate, PostOut
from app.crud import post as post_crud
from app.deps import get_current_user
from typing import List
import shutil
import os

router = APIRouter(prefix="/posts", tags=["Posts"])

UPLOAD_DIR = "static/uploaded_images"

@router.post("/", response_model=PostOut)
async def create_post(post: PostCreate, db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    return await post_crud.create_post(db, post, author_id=user['id'])

@router.get("/", response_model=List[PostOut])
async def get_posts(skip: int = 0, limit: int = 20, keyword: str = "", category_id: int = None, db: AsyncSession = Depends(get_db)):
    return await post_crud.get_posts(db, skip, limit, keyword, category_id)
