from fastapi import FastAPI, Depends
from fastapi.openapi.utils import get_openapi
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, license
from routes.admin_routes import router as admin_router
from routes import payment_routes
from routes import email_routes 

from models import Base
from database import engine
import uvicorn

app = FastAPI()

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.dlas.io",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ JWT 인증을 위한 OAuth2 설정
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

# ✅ Swagger에 JWT 인증 적용
def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title="License Management API",
        version="1.0.0",
        description="API for managing licenses with JWT authentication",
        routes=app.routes,
    )
    security_scheme = {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
    }
    openapi_schema["components"]["securitySchemes"] = {"BearerAuth": security_scheme}
    for path in openapi_schema["paths"].values():
        for method in path.values():
            method["security"] = [{"BearerAuth": []}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

# ✅ 라우터 등록
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(license.router, prefix="/license", tags=["License"])
app.include_router(admin_router, prefix="/admin", tags=["Admin"])
app.include_router(payment_routes.router, prefix="/payments/toss", tags=["Payment"])
app.include_router(email_routes.router, prefix="/email", tags=["Email"])  # ✅ 이메일 인증 라우터

# ✅ DB 테이블 생성
@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ✅ 기본 경로
@app.get("/")
def read_root():
    return {"message": "License Server is running!"}

# ✅ 보호된 경로 (테스트용)
@app.get("/protected")
async def protected_route(token: str = Depends(oauth2_scheme)):
    return {"message": "This is a protected route", "token": token}

# ✅ 로컬 실행
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)


from routes.webhook_routes import router as webhook_router

app.include_router(webhook_router, tags=["Webhook"]) 