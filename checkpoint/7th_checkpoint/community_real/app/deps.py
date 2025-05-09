# app/deps.py
from fastapi import Depends, HTTPException, status
from fastapi_jwt_auth import AuthJWT

async def get_current_user(Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
        user_id = Authorize.get_jwt_subject()
        return {"id": int(user_id)}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

async def get_current_admin(Authorize: AuthJWT = Depends()):
    try:
        Authorize.jwt_required()
        user_id = Authorize.get_jwt_subject()
        # 여기서 관리자 검증 추가할 수 있음
        return {"id": int(user_id)}
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
