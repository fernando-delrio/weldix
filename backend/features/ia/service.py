from mistralai import Mistral

from backend.core.config import settings

_SYSTEM_PROMPT = """Eres Weldix AI, el asistente técnico de un taller de soldadura y calderería industrial.
Tu función es ayudar a soldadores, caldereros y técnicos con:
- Técnicas de soldadura (MIG, TIG, electrodo, soldadura en posición, etc.)
- Materiales: acero al carbono, acero inoxidable, aluminio, cobre, etc.
- Interpretación de planos técnicos y especificaciones de soldadura (WPS, PQR)
- Normas y certificaciones: ISO 9606, EN 287, AWS D1.1
- Seguridad en el taller: EPI, gases, ventilación, riesgos eléctricos
- Gestión de órdenes de trabajo y seguimiento de producción
Responde siempre en español, de forma clara y directa. Si la pregunta no es técnica ni relacionada con el taller, indícalo brevemente y ofrece redirigir la consulta."""


def consultar(mensaje: str, historial: list[dict] | None = None) -> str:
    if not settings.mistral_api_key:
        raise ValueError("MISTRAL_API_KEY no configurada")

    client = Mistral(api_key=settings.mistral_api_key)

    messages = [{"role": "system", "content": _SYSTEM_PROMPT}]
    if historial:
        messages.extend(historial)
    messages.append({"role": "user", "content": mensaje})

    response = client.chat.complete(
        model="mistral-small-latest",
        messages=messages,
    )

    return response.choices[0].message.content
