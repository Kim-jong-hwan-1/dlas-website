from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_db
from models.user import User
from pydantic import BaseModel
from passlib.context import CryptContext
import jwt
import os
from fastapi.security import OAuth2PasswordBearer

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_secret_key")

class LoginRequest(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == request.email))
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not pwd_context.verify(request.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect password")

    payload = {"sub": user.email}
    token = jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

    return {"access_token": token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalars().first()
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        return user
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_admin(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    user = await get_current_user(token, db)
    admin_email = os.getenv("ADMIN_EMAIL")
    if user.email != admin_email:
        raise HTTPException(status_code=403, detail="Admin only")
    return user
