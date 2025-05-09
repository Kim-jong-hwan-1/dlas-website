from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from database import Base

class ContactUs(Base):
    __tablename__ = "contact_us"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255))
    email = Column(String(255))
    message = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    ip = Column(String(100))
    country = Column(String(100))