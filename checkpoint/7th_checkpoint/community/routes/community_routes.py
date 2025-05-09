from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from database import get_db
from models.post import Post
from models.reported_post import ReportedPost
from models.reported_comment import ReportedComment
from models.comment import Comment
from models.notification import Notification
from models.user import User
from schemas import PostCreate, PostUpdate, CommentCreate, VoteRequest
from routes.auth_routes import get_current_user, get_current_admin
import os

router = APIRouter()

# 게시글 작성
@router.post("/posts")
async def create_post(post: PostCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    new_post = Post(
        title=post.title,
        content=post.content,
        category=post.category,
        author_email=current_user.email
    )
    db.add(new_post)
    await db.commit()
    await db.refresh(new_post)
    return new_post

# 게시글 조회 + 검색 + 카테고리 필터
@router.get("/posts")
async def get_posts(search: str = Query(None), category: str = Query(None), sort: str = Query('latest'), db: AsyncSession = Depends(get_db)):
    query = select(Post)
    if search:
        query = query.where(or_(Post.title.ilike(f"%{search}%"), Post.content.ilike(f"%{search}%")))
    if category:
        query = query.where(Post.category == category)

    
    if sort == "latest":
        query = query.order_by(Post.created_at.desc())
    elif sort == "upvotes":
        query = query.order_by(Post.upvotes.desc())
    elif sort == "views":
        query = query.order_by(Post.views.desc())

    result = await db.execute(query)
    
    posts = result.scalars().all()
    return posts

# 게시글 수정
@router.put("/posts/{post_id}")
async def update_post(post_id: int, post_update: PostUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalars().first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    if post.author_email != current_user.email:
        raise HTTPException(status_code=403, detail="Not authorized")

    post.title = post_update.title
    post.content = post_update.content
    post.category = post_update.category
    await db.commit()
    return post

# 게시글 삭제 (관리자만)
@router.delete("/posts/{post_id}")
async def delete_post(post_id: int, db: AsyncSession = Depends(get_db), admin_user: User = Depends(get_current_admin)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalars().first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    await db.delete(post)
    await db.commit()
    return {"message": "Post deleted"}

# 댓글 작성

# 댓글 작성
@router.post("/posts/{post_id}/comments")
async def create_comment(post_id: int, comment: CommentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalars().first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    new_comment = Comment(
        content=comment.content,
        author_email=current_user.email,
        post_id=post.id
    )
    db.add(new_comment)
    await db.flush()

    if post.author_email != current_user.email:
        notification = Notification(
            user_email=post.author_email,
            message=f"{current_user.email} commented on your post."
        )
        db.add(notification)

    await db.commit()
    await db.refresh(new_comment)
    return new_comment
# 추천/비추천
@router.post("/posts/{post_id}/vote")
async def vote_post(post_id: int, vote: VoteRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalars().first()

    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    if vote.vote_type == "up":
        post.upvotes += 1
    elif vote.vote_type == "down":
        post.downvotes += 1
    else:
        raise HTTPException(status_code=400, detail="Invalid vote type")

    await db.commit()
    return {"message": "Voted successfully"}


# 게시글 조회수 +1
@router.get("/posts/{post_id}")
async def read_post(post_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.views += 1
    await db.commit()
    return post

# 게시글 신고
@router.post("/posts/{post_id}/report")
async def report_post(post_id: int, reason: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Post).where(Post.id == post_id))
    post = result.scalars().first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    report = ReportedPost(post_id=post_id, reporter_email=current_user.email, reason=reason)
    db.add(report)
    await db.commit()
    return {"message": "Post reported successfully"}

# 댓글 신고
@router.post("/comments/{comment_id}/report")
async def report_comment(comment_id: int, reason: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Comment).where(Comment.id == comment_id))
    comment = result.scalars().first()
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")

    report = ReportedComment(comment_id=comment_id, reporter_email=current_user.email, reason=reason)
    db.add(report)
    await db.commit()
    return {"message": "Comment reported successfully"}
