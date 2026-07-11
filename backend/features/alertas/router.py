"""
WebSocket de notificaciones en tiempo real.

Autenticación: JWT en query param ?token=<jwt>
  (el handshake WebSocket no puede llevar el header Authorization).

Protocolo cliente ↔ servidor:
  - Conexión: server envía {"type":"snapshot","alerts":[...]}
  - Cada 30 s el cliente envía "ping" → server recalcula y responde con nuevo snapshot.
  - Desconexión limpia: server elimina la conexión del manager.
"""
from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect

from backend.core.database import SessionLocal
from backend.core.security import decode_token
from backend.core.ws_manager import ws_manager
from backend.features.auth.model import User

from .service import get_current_alerts

router = APIRouter(tags=["alertas"])


def _tenant_id_from_token(token: str) -> int | None:
    """
    Resuelve el tenant del usuario abriendo una sesión CORTA que se cierra
    de inmediato. Nunca se retiene una conexión del pool durante la vida
    del WebSocket: con muchos clientes conectados eso agotaría el pool y
    tumbaría todas las peticiones HTTP.
    """
    db = SessionLocal()
    try:
        payload = decode_token(token)
        user_id = int(payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        return user.tenant_id if user else None
    except Exception:
        return None
    finally:
        db.close()


def _alerts_snapshot(tenant_id: int) -> dict:
    """Calcula el snapshot de alertas con una sesión efímera por llamada."""
    db = SessionLocal()
    try:
        return {"type": "snapshot", "alerts": get_current_alerts(db, tenant_id)}
    finally:
        db.close()


@router.websocket("/ws/notificaciones")
async def ws_notificaciones(
    ws: WebSocket,
    token: str = Query(...),
):
    tenant_id = _tenant_id_from_token(token)
    if not tenant_id:
        await ws.close(code=4001)
        return

    await ws_manager.connect(ws, tenant_id)

    try:
        # Snapshot inicial al conectar
        await ws.send_json(_alerts_snapshot(tenant_id))

        # Responder a cada heartbeat con snapshot fresco
        while True:
            await ws.receive_text()
            await ws.send_json(_alerts_snapshot(tenant_id))
    except WebSocketDisconnect:
        ws_manager.disconnect(ws, tenant_id)
    finally:
        ws_manager.disconnect(ws, tenant_id)
