from database import Base
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from datetime import datetime

class ReportedComment(Base):
    __tablename__ = "reported_comments"

    id = Column(Integer, primary_key=True, index=True)
    comment_id = Column(Integer, ForeignKey("comments.id"), nullable=False)
    reporter_email = Column(String(255), nullable=False)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
