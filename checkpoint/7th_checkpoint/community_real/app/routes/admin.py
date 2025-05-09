from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.crud import user as user_crud
from app.crud import post as post_crud
from app.crud import comment as comment_crud
from app.deps import get_current_admin
from app.schemas.category import CategoryCreate, CategoryOut
from app.crud import category as category_crud
from typing import List

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
async def dashboard(db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    users = await user_crud.get_all_users(db)
    posts = await post_crud.get_all_posts(db)
    comments = await comment_crud.get_all_comments(db)
    return {"users": len(users), "posts": len(posts), "comments": len(comments)}

@router.post("/categories", response_model=CategoryOut)
async def create_category(category: CategoryCreate, db: AsyncSession = Depends(get_db), admin=Depends(get_current_admin)):
    return await category_crud.create_category(db, category)

@router.get("/categories", response_model=List[CategoryOut])
async def get_categories(db: AsyncSession = Depends(get_db)):
    return await category_crud.get_categories(db)
