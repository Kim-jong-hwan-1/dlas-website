from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from database import get_db
from models.notification import Notification
from routes.auth_routes import get_current_user
from models.user import User

router = APIRouter()

# 알림 조회
@router.get("/notifications")
async def get_notifications(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.user_email == current_user.email))
    notifications = result.scalars().all()
    return notifications

# 알림 읽음 처리
@router.post("/notifications/{notification_id}/read")
async def read_notification(notification_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Notification).where(Notification.id == notification_id, Notification.user_email == current_user.email))
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    return {"message": "Notification marked as read"}
