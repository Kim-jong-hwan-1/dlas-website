from fastapi import APIRouter, HTTPException, Body, Depends
import httpx
from datetime import timedelta, datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from models import User
from sqlalchemy.orm.attributes import flag_modified
from database import get_db

router = APIRouter()

@router.post("/confirm")
async def confirm_payment(
    paymentKey: str = Body(...),
    orderId: str = Body(...),
    amount: int = Body(...),
    userEmail: str = Body(...),
    type: str = Body(...),  # "module", "family", or "permanent"
    module: str = Body(None),  # 모듈 이름
    period: str = Body(None),  # "1WEEK", "1MONTH", "1YEAR", "LIFETIME"
    db: AsyncSession = Depends(get_db),
):
    # TossPayments API 요청
    secret_key = "live_gsk_Z1aOwX7K8mOKMqgDdqnPVyQxzvNP"
    import base64
    encoded_key = base64.b64encode((secret_key + ":").encode("utf-8")).decode("utf-8")
    basic_auth = f"Basic {encoded_key}"

    try:
        print("🔐 Toss confirm 요청:", {
            "orderId": orderId,
            "amount": amount,
            "paymentKey": paymentKey,
            "type": type,
            "module": module,
            "period": period,
            "userEmail": userEmail
        })

        async with httpx.AsyncClient() as client:
            toss_res = await client.post(
                "https://api.tosspayments.com/v1/payments/confirm",
                headers={
                    "Authorization": basic_auth,
                    "Content-Type": "application/json"
                },
                json={
                    "orderId": orderId,
                    "amount": amount,
                    "paymentKey": paymentKey
                }
            )
            toss_data = toss_res.json()
            print("🔔 Toss 응답:", toss_data)

            if toss_res.status_code != 200:
                raise HTTPException(status_code=400, detail=toss_data)

        # 유저 조회
        result = await db.execute(select(User).where(User.email == userEmail))
        user = result.scalars().first()

        if not user:
            print("❌ 유저 없음:", userEmail)
            raise HTTPException(status_code=404, detail="User not found")

        # 모듈 ID 매핑
        MODULE_NAME_TO_ID = {
            "3_transfer_jig_maker": "1",
            "e_transfer_jig_maker": "4",
            "exo_abutment_editor": "3",
            "stl_classifier": "2",
            "stl_to_html": "5",
            "stl_to_image": "6",
        }

        # 기간별 라이센스 계산
        if type == "family":
            # 패밀리 라이선스: 모든 모듈 영구 부여
            forever_date = "9999-12-31"
            user.module_licenses = {str(i): forever_date for i in range(1, 10)}
            user.is_verified = True
            print("✅ 패밀리 라이선스 부여 완료:", userEmail)
        elif type == "permanent":
            # 퍼머넌트 라이선스: 모든 모듈 영구 부여
            forever_date = "9999-12-31"
            user.module_licenses = {str(i): forever_date for i in range(1, 10)}
            user.is_verified = True
            print("✅ 퍼머넌트 라이선스 부여 완료:", userEmail)
        elif type == "module" and module and period:
            # 모듈 라이선스: 특정 모듈에 기간별 부여
            module_id = MODULE_NAME_TO_ID.get(module)
            if not module_id:
                raise HTTPException(status_code=400, detail=f"Unknown module: {module}")

            # 기존 라이선스 가져오기
            if not user.module_licenses:
                user.module_licenses = {}

            # 만료일 계산
            if period == "LIFETIME":
                expire_date = "9999-12-31"
            else:
                days_map = {"1WEEK": 9, "1MONTH": 33, "1YEAR": 395}  # 1년 = 13개월 = 약 395일
                days = days_map.get(period, 9)
                expire_date = (datetime.utcnow() + timedelta(days=days)).strftime("%Y-%m-%d")

            # 라이선스 업데이트
            user.module_licenses[module_id] = expire_date
            user.is_verified = True
            print(f"✅ 모듈 라이선스 부여 완료: {userEmail} - {module} (ID: {module_id}) ({period}) - 만료일: {expire_date}")
        else:
            raise HTTPException(status_code=400, detail="Invalid payment type or missing parameters")

        flag_modified(user, "module_licenses")
        await db.commit()

        return {
            "status": "ok",
            "toss": toss_data,
            "granted_modules": user.module_licenses
        }

    except HTTPException:
        raise
    except Exception as e:
        print("❌ 서버 내부 오류:", str(e))
        raise HTTPException(status_code=500, detail=str(e))
