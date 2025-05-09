from fastapi import FastAPI
from app.routes import posts, comments, auth, admin, upload
from app.websocket import notifications, chat
from fastapi.middleware.cors import CORSMiddleware

# ✅ 추가 (DB 연결 import)
from app.database import engine, Base

app = FastAPI()

# ✅ 서버 시작할 때 테이블 자동 생성
@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# CORS 허용
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router)
app.include_router(posts.router)
app.include_router(comments.router)
app.include_router(admin.router)
app.include_router(upload.router)

# WebSocket
app.include_router(notifications.router)
app.include_router(chat.router)
