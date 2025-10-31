from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User, License
from email_service import email_service
from datetime import datetime, timedelta
from crud import log_license_action
import uuid

router = APIRouter()

# 메모리 기반 인증 코드 저장 (프로덕션에서는 Redis 사용 권장)
verification_codes = {}

class EmailSendRequest(BaseModel):
    email: EmailStr
    userID: str
    couponCode: str | None = None  # 쿠폰 코드 추가

class EmailVerifyRequest(BaseModel):
    email: EmailStr
    code: str
    userID: str
    couponCode: str | None = None

# 쿠폰 검증 함수
def validate_coupon(coupon_code: str) -> int:
    """쿠폰 코드 검증 및 라이센스 일수 반환"""
    if coupon_code.lower().strip() == "2804dlas":
        return 10  # 10일 라이센스
    return 3  # 기본 3일 라이센스

@router.post("/send-verification")
async def send_verification_code(request: EmailSendRequest, db: AsyncSession = Depends(get_db)):
    """이메일 인증번호 발송"""
    try:
        # Gmail 도메인 차단
        if request.email.lower().endswith("@gmail.com"):
            raise HTTPException(
                status_code=400,
                detail="Gmail은 사용할 수 없습니다. 다른 이메일을 사용해주세요."
            )

        # 쿠폰 검증하여 라이센스 일수 결정
        license_days = validate_coupon(request.couponCode) if request.couponCode else 3

        # 인증번호 생성
        code = email_service.generate_verification_code()

        # 이메일 발송 (라이센스 일수 포함)
        success = await email_service.send_verification_code(request.email, code, license_days)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="이메일 발송에 실패했습니다. 잠시 후 다시 시도해주세요."
            )

        # 인증번호 저장 (3분 유효)
        verification_codes[request.email] = {
            "code": code,
            "userID": request.userID,
            "expires_at": datetime.utcnow() + timedelta(minutes=3)
        }

        print(f"[DEBUG] Saved verification code: email={request.email}, code={code}, userID={request.userID}")

        return {
            "success": True,
            "message": "인증번호가 이메일로 발송되었습니다."
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in send_verification_code: {e}")
        raise HTTPException(
            status_code=500,
            detail="서버 오류가 발생했습니다."
        )

@router.post("/verify-code")
async def verify_code(request: EmailVerifyRequest, db: AsyncSession = Depends(get_db)):
    """인증번호 확인 및 라이센스 발급"""
    try:
        print(f"[DEBUG] Verify attempt: email={request.email}, code={request.code}, userID={request.userID}")
        print(f"[DEBUG] Available codes: {list(verification_codes.keys())}")

        # 인증번호 확인
        stored_data = verification_codes.get(request.email)

        if not stored_data:
            print(f"[DEBUG] No stored data found for email: {request.email}")
            raise HTTPException(
                status_code=400,
                detail="인증번호가 만료되었거나 존재하지 않습니다."
            )

        print(f"[DEBUG] Stored data: code={stored_data['code']}, userID={stored_data['userID']}")

        # 만료 시간 확인
        if datetime.utcnow() > stored_data["expires_at"]:
            print(f"[DEBUG] Code expired")
            del verification_codes[request.email]
            raise HTTPException(
                status_code=400,
                detail="인증번호가 만료되었습니다. 다시 요청해주세요."
            )

        # 코드 일치 확인 (양쪽 trim)
        stored_code = str(stored_data["code"]).strip()
        received_code = str(request.code).strip()

        if stored_code != received_code:
            print(f"[DEBUG] Code mismatch: stored='{stored_code}' (len={len(stored_code)}), received='{received_code}' (len={len(received_code)})")
            print(f"[DEBUG] Stored bytes: {stored_code.encode()}")
            print(f"[DEBUG] Received bytes: {received_code.encode()}")
            raise HTTPException(
                status_code=400,
                detail="인증번호가 일치하지 않습니다."
            )

        print(f"[DEBUG] Code matched!")

        # userID 일치 확인
        if stored_data["userID"] != request.userID:
            raise HTTPException(
                status_code=400,
                detail="사용자 정보가 일치하지 않습니다."
            )

        # 쿠폰 코드 검증
        license_days = validate_coupon(request.couponCode) if request.couponCode else 3

        # 사용자 조회 (userID로)
        result = await db.execute(select(User).where(User.id == int(request.userID)))
        user = result.scalars().first()

        if not user:
            raise HTTPException(
                status_code=404,
                detail="사용자를 찾을 수 없습니다."
            )

        # 이미 라이센스가 있는지 확인
        result = await db.execute(
            select(License).where(
                License.user_id == user.id,
                License.is_active == True
            )
        )
        existing_license = result.scalars().first()

        if existing_license:
            # 인증 완료로 처리 (이미 라이센스가 있음)
            del verification_codes[request.email]
            return {
                "success": True,
                "message": "이미 라이센스가 발급되어 있습니다.",
                "license": {
                    "duration": license_days,
                    "license_key": existing_license.license_key,
                    "expiration_date": existing_license.expiration_date.isoformat()
                }
            }

        # 새 라이센스 발급
        license_key = str(uuid.uuid4())
        expiration_date = datetime.utcnow() + timedelta(days=license_days)

        new_license = License(
            user_id=user.id,
            license_key=license_key,
            max_sessions=3,
            is_active=True,
            expiration_date=expiration_date
        )

        db.add(new_license)
        await db.commit()
        await db.refresh(new_license)

        # 로그 기록
        await log_license_action(db, user.id, new_license.id, "created_via_email_verification")

        # 인증번호 삭제
        del verification_codes[request.email]

        return {
            "success": True,
            "message": f"본인인증이 완료되었습니다! {license_days}일 무료 라이센스가 발급되었습니다.",
            "license": {
                "duration": license_days,
                "license_key": new_license.license_key,
                "expiration_date": new_license.expiration_date.isoformat()
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in verify_code: {e}")
        raise HTTPException(
            status_code=500,
            detail="서버 오류가 발생했습니다."
        )
