"""
WebSocket de notificaciones en tiempo real.

Autenticación: JWT en query param ?token=<jwt>
  (el handshake WebSocket no puede llevar el header Authorization).

Protocolo cliente ↔ servidor:
  - Conexión: server envía {"type":"snapshot","alerts":[...]}
  - Cada 30 s el cliente envía "ping" → server recalcula y responde con nuevo snapshot.
  - Desconexión limpia: server elimina la conexión del manager.
"""
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.core.security import decode_token
from backend.core.ws_manager import ws_manager
from backend.features.auth.model import User

from .service import get_current_alerts

router = APIRouter(tags=["alertas"])


def _user_from_token(token: str, db: Session) -> User | None:
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None


@router.websocket("/ws/notificaciones")
async def ws_notificaciones(
    ws: WebSocket,
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    user = _user_from_token(token, db)
    if not user or not user.tenant_id:
        await ws.close(code=4001)
        return

    tenant_id = user.tenant_id
    await ws_manager.connect(ws, tenant_id)

    try:
        # Snapshot inicial al conectar
        await ws.send_json({"type": "snapshot", "alerts": get_current_alerts(db, tenant_id)})

        # Responder a cada heartbeat con snapshot fresco
        while True:
            await ws.receive_text()
            await ws.send_json({"type": "snapshot", "alerts": get_current_alerts(db, tenant_id)})
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, tenant_id)
