from mistralai import Mistral

from backend.core.config import settings

_SYSTEM_PROMPT = """Eres Weldix AI, el asistente técnico de un taller de soldadura y calderería industrial.
Trabajas integrado en la aplicación Weldix, un sistema de gestión de órdenes de trabajo (OT).
En Weldix, los trabajos tienen estos estados: pendiente → en_proceso → control → listo → entregado.

Tu función es ayudar a soldadores, caldereros y técnicos con:
- Técnicas de soldadura: MIG/MAG, TIG, electrodo, soldadura en posición (1G-6G), soldadura orbital
- Materiales: acero al carbono (S235, S275, S355), acero inoxidable (304, 316L), aluminio, cobre, Duplex
- Parámetros de soldadura: intensidad, tensión, velocidad, gas de protección, electrodo/hilo adecuado
- Defectos de soldadura: porosidad, fisuras, inclusiones, mordeduras — causas y correcciones
- Interpretación de planos técnicos, simbología de soldadura ISO 2553 / AWS A2.4
- Especificaciones de procedimiento (WPS) y cualificación de procedimiento (PQR)
- Normas y certificaciones: ISO 9606, EN 287, AWS D1.1, EN 1090
- Seguridad en el taller: EPI obligatorios, gases de protección, ventilación, riesgos eléctricos, ATEX
- Calderería: trazado, corte por plasma/oxicorte, doblado, rolado, ensamblaje
- Gestión de órdenes de trabajo: cómo avanzar estados, registrar materiales, interpretar una OT

Responde siempre en español, de forma clara, directa y práctica. Cuando des parámetros técnicos,
sé específico con valores concretos.

REGLA ESTRICTA — FUERA DE ÁMBITO:
Si la pregunta NO está relacionada con soldadura, calderería, materiales metálicos, órdenes de trabajo,
seguridad en el taller, normativa de soldadura o gestión de producción industrial, responde ÚNICAMENTE con:
"Solo puedo ayudarte con consultas técnicas del taller: soldadura, materiales, OTs o seguridad."
No añadas nada más. No expliques por qué. No ofrezcas alternativas fuera del taller."""


def _format_stock(stock_items: list) -> str:
    if not stock_items:
        return "Sin datos de stock disponibles."
    lines = []
    for m in stock_items:
        alerta = " ⚠ STOCK BAJO" if m.quantity < m.minimum else ""
        lines.append(f"- {m.name}: {m.quantity} {m.unit} (mínimo requerido: {m.minimum}){alerta}")
    return "\n".join(lines)


def _format_jobs(jobs: list) -> str:
    if not jobs:
        return "No hay trabajos registrados en el sistema."

    counts: dict[str, int] = {}
    for j in jobs:
        counts[j.estado] = counts.get(j.estado, 0) + 1

    order  = ["pendiente", "en_proceso", "control", "listo", "entregado"]
    labels = {"pendiente": "Pendiente", "en_proceso": "En proceso", "control": "Control", "listo": "Listo", "entregado": "Entregado"}
    summary = ", ".join(f"{labels.get(s, s)}: {counts[s]}" for s in order if s in counts)

    lines = [f"Resumen: {summary}"]
    active = [j for j in jobs if j.estado in ("pendiente", "en_proceso", "control")]
    if active:
        lines.append("Detalle de trabajos activos:")
        for j in active:
            operario = j.operario.full_name if j.operario else "Sin asignar"
            lines.append(f"  - {j.code or 'Sin código'} | {j.titulo} | {labels.get(j.estado, j.estado)} | Operario: {operario}")
    return "\n".join(lines)


def consultar(
    mensaje: str,
    historial: list[dict] | None = None,
    stock_items: list | None = None,
    jobs_items: list | None = None,
    contexto_trabajo: str | None = None,
) -> str:
    if not settings.mistral_api_key:
        raise ValueError("MISTRAL_API_KEY no configurada")

    # Construir system prompt enriquecido con contexto dinámico
    system_content = _SYSTEM_PROMPT

    if jobs_items is not None:
        system_content += f"\n\n## Estado actual de los trabajos del taller:\n{_format_jobs(jobs_items)}"

    if stock_items is not None:
        system_content += f"\n\n## Stock actual del taller:\n{_format_stock(stock_items)}"

    if contexto_trabajo:
        system_content += f"\n\n## Trabajo activo del operario que consulta:\n{contexto_trabajo}"

    client = Mistral(api_key=settings.mistral_api_key)

    messages = [{"role": "system", "content": system_content}]
    if historial:
        messages.extend(historial)
    messages.append({"role": "user", "content": mensaje})

    response = client.chat.complete(
        model="mistral-small-latest",
        messages=messages,
    )

    return response.choices[0].message.content
