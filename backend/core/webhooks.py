"""
Capa de integración con n8n via webhooks HTTP.

Patrón: fire-and-forget con fallo silencioso.
El backend nunca se bloquea ni rompe por un problema en n8n.

Cada evento dispara un POST a: {N8N_WEBHOOK_URL}/{event_name}
n8n recibe el JSON y ejecuta el workflow correspondiente
(email al cliente, WhatsApp, Google Sheets, Slack, etc.)
"""

import httpx

from backend.core.config import settings

_TIMEOUT = 3.0  # segundos máximos de espera a n8n


def fire_webhook(event: str, payload: dict) -> None:
    """
    Dispara un evento a n8n. Si n8n no está levantado o falla, no pasa nada.
    Nunca lanza excepción — es intencionadamente silencioso.
    """
    if not settings.n8n_webhook_url:
        return

    url = f"{settings.n8n_webhook_url.rstrip('/')}/{event}"
    try:
        httpx.post(url, json={"event": event, **payload}, timeout=_TIMEOUT)
    except Exception:
        pass
