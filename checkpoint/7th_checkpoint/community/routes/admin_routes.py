from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models.reported_post import ReportedPost
from models.reported_comment import ReportedComment
from routes.auth_routes import get_current_admin

router = APIRouter()

@router.get("/reports/posts")
async def get_reported_posts(db: AsyncSession = Depends(get_db), admin_user=Depends(get_current_admin)):
    result = await db.execute(select(ReportedPost))
    reports = result.scalars().all()
    return reports

@router.get("/reports/comments")
async def get_reported_comments(db: AsyncSession = Depends(get_db), admin_user=Depends(get_current_admin)):
    result = await db.execute(select(ReportedComment))
    reports = result.scalars().all()
    return reports
