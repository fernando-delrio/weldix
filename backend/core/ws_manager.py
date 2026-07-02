"""
WebSocket connection manager — gestiona conexiones activas por tenant.

Singleton en memoria: correcto para un solo worker de uvicorn (dev + prod pequeña).
Cuando haya múltiples workers, migrar a Redis Pub/Sub como broker de mensajes.
"""
from collections import defaultdict

from fastapi import WebSocket


class _ConnectionManager:
    def __init__(self) -> None:
        self._conns: dict[int, list[WebSocket]] = defaultdict(list)

    async def connect(self, ws: WebSocket, tenant_id: int) -> None:
        await ws.accept()
        self._conns[tenant_id].append(ws)

    def disconnect(self, ws: WebSocket, tenant_id: int) -> None:
        conns = self._conns.get(tenant_id, [])
        if ws in conns:
            conns.remove(ws)

    async def broadcast(self, tenant_id: int, payload: dict) -> None:
        """Envía payload JSON a todos los clientes conectados del tenant."""
        dead: list[WebSocket] = []
        for ws in list(self._conns.get(tenant_id, [])):
            try:
                await ws.send_json(payload)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws, tenant_id)


ws_manager = _ConnectionManager()
