from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware  # ✅ CORS 추가
from database import Base, engine
from routes import router

# DB 테이블 생성
Base.metadata.create_all(bind=engine)

# FastAPI 앱 생성
app = FastAPI()

# ✅ CORS 설정 추가
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 모든 도메인 허용 (또는 ["http://localhost:3000"] 이런 식으로 제한 가능)
    allow_credentials=True,
    allow_methods=["*"],  # 모든 HTTP 메서드 허용 (POST, GET, OPTIONS 등)
    allow_headers=["*"],  # 모든 헤더 허용
)

# 라우터 등록
app.include_router(router)
