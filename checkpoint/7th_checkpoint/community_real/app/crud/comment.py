from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.comment import Comment
from app.schemas.comment import CommentCreate

async def create_comment(db: AsyncSession, comment: CommentCreate, author_id: int):
    db_comment = Comment(**comment.dict(), author_id=author_id)
    db.add(db_comment)
    await db.commit()
    await db.refresh(db_comment)
    return db_comment

async def get_comments(db: AsyncSession, post_id: int):
    result = await db.execute(select(Comment).where(Comment.post_id == post_id))
    return result.scalars().all()
