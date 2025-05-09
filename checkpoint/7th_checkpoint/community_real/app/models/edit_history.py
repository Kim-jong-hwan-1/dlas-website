from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import datetime

class EditHistory(Base):
    __tablename__ = 'edit_histories'

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey('posts.id'))
    content_before = Column(Text, nullable=False)
    content_after = Column(Text, nullable=False)
    edited_at = Column(DateTime, default=datetime.datetime.utcnow)

    post = relationship('Post', back_populates='edit_histories')
