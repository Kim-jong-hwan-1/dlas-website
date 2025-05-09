from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
import datetime

class Post(Base):
    __tablename__ = 'posts'
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    author_id = Column(Integer, ForeignKey('users.id'))
    category_id = Column(Integer, ForeignKey('categories.id'))
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    author = relationship('User', back_populates='posts')
    category = relationship('Category', back_populates='posts')
    comments = relationship('Comment', back_populates='post')
    edit_histories = relationship('EditHistory', back_populates='post')
