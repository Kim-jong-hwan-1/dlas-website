# app/database.py

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# .env에서 DATABASE_URL 가져오기
DATABASE_URL = os.getenv("DATABASE_URL")

# 비동기 엔진 생성
engine = create_async_engine(DATABASE_URL, echo=True)

# 비동기 세션 설정
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

# Base 클래스 생성
Base = declarative_base()

# DB 세션 가져오는 의존성
async def get_db():
    async with SessionLocal() as session:
        yield session
