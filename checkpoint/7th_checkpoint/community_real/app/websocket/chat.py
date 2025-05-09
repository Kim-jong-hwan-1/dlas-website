from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

class ChatManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

chat_manager = ChatManager()

@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await chat_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await chat_manager.broadcast(data)
    except WebSocketDisconnect:
        chat_manager.disconnect(websocket)
