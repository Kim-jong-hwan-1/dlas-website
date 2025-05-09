from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from routes.auth_routes import get_current_user
from fastapi import Cookie, Query
import jwt
import os

router = APIRouter()

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your_secret_key")

active_connections = {}

async def get_email_from_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        email = payload.get("sub")
        return email
    except jwt.PyJWTError:
        return None

@router.websocket("/ws/chat/{receiver_email}")
async def websocket_endpoint(websocket: WebSocket, receiver_email: str, token: str = Query(...)):
    await websocket.accept()
    sender_email = await get_email_from_token(token)
    if not sender_email:
        await websocket.close(code=1008)
        return

    key = (sender_email, receiver_email)
    active_connections[key] = websocket

    try:
        while True:
            data = await websocket.receive_text()
            reverse_key = (receiver_email, sender_email)
            if reverse_key in active_connections:
                await active_connections[reverse_key].send_text(f"{sender_email}: {data}")
    except WebSocketDisconnect:
        del active_connections[key]
