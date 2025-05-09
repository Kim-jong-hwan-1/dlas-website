from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserLogin, UserOut
from app.crud import user as user_crud
from fastapi_jwt_auth import AuthJWT
from passlib.hash import bcrypt

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login")
async def login(user: UserLogin, db: AsyncSession = Depends(get_db), Authorize: AuthJWT = Depends()):
    db_user = await user_crud.get_user_by_email(db, user.email)
    if not db_user or not bcrypt.verify(user.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    access_token = Authorize.create_access_token(subject=str(db_user.id))
    return {"access_token": access_token}
