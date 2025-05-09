from database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime

class ReportedPost(Base):
    __tablename__ = "reported_posts"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"), nullable=False)
    reporter_email = Column(String(255), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
