from fastapi import FastAPI
from database import engine, Base
from routes.auth_routes import router as auth_router
from routes.community_routes import router as community_router
from routes.admin_routes import router as admin_router
from routes.upload_routes import router as upload_router
from routes.chat_routes import router as chat_router
from routes.notification_routes import router as notification_router
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

app = FastAPI()

origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 서버 시작할 때 테이블 자동 생성 (비동기)
@app.on_event("startup")
async def on_startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ✅ 라우터 등록
app.include_router(auth_router, prefix="/auth")
app.include_router(community_router, prefix="/community")
app.include_router(admin_router, prefix="/admin")
app.include_router(upload_router)
app.include_router(chat_router)
app.include_router(notification_router)

# ✅ 기본 루트
@app.get("/")
async def root():
    return {"message": "Community Server Running!"}

# ✅ 관리자 페이지 Static 파일 mount
app.mount("/admin-panel", StaticFiles(directory="admin_panel", html=True), name="admin-panel")
