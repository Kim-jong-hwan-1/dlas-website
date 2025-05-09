from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.user import User
from passlib.hash import bcrypt

async def create_user(db: AsyncSession, email: str, password: str, is_admin: bool = False):
    hashed_password = bcrypt.hash(password)
    user = User(email=email, hashed_password=hashed_password, is_admin=is_admin)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()
