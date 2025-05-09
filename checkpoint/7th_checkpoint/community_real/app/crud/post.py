from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.post import Post
from app.models.edit_history import EditHistory
from app.schemas.post import PostCreate

async def create_post(db: AsyncSession, post: PostCreate, author_id: int):
    db_post = Post(**post.dict(), author_id=author_id)
    db.add(db_post)
    await db.commit()
    await db.refresh(db_post)
    return db_post

async def get_posts(db: AsyncSession, skip: int = 0, limit: int = 20, keyword: str = "", category_id: int = None):
    query = select(Post)
    if keyword:
        query = query.where(Post.title.ilike(f"%{keyword}%"))
    if category_id:
        query = query.where(Post.category_id == category_id)
    result = await db.execute(query.offset(skip).limit(limit))
    return result.scalars().all()

async def get_post(db: AsyncSession, post_id: int):
    result = await db.execute(select(Post).where(Post.id == post_id))
    return result.scalar_one_or_none()

async def update_post(db: AsyncSession, db_post: Post, new_content: str):
    history = EditHistory(post_id=db_post.id, content_before=db_post.content, content_after=new_content)
    db.add(history)
    db_post.content = new_content
    await db.commit()
    await db.refresh(db_post)
    return db_post
