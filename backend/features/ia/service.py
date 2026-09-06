from mistralai import Mistral

from backend.core.config import settings

# Sin timeout, una llamada colgada a Mistral bloquea el hilo que la atiende
# indefinidamente. /ia/consulta es un endpoint síncrono que retiene su conexión
# de BD mientras espera, así que colgarse no afecta solo a ese usuario: retira
# una conexión del pool y un hilo del threadpool hasta que Mistral responda.
# Con timeout, ambos vuelven sí o sí. 30s es de sobra para mistral-small.
_MISTRAL_TIMEOUT_MS = 30_000

_SYSTEM_PROMPT = """Eres Weldix AI, el asistente técnico y de gestión de un taller de soldadura y calderería industrial.
Trabajas integrado en la aplicación Weldix. Adapta tus respuestas al rol del usuario (Administrador u Operario),
que se indica en su perfil, y usa siempre los datos reales del taller que se te facilitan más abajo.

En Weldix, las órdenes de trabajo (OT) pasan por estos estados: pendiente → en_proceso → control → listo → entregado.

Puedes ayudar con DOS grandes áreas:

1) TÉCNICA de soldadura y calderería:
- Técnicas: MIG/MAG, TIG, electrodo, soldadura en posición (1G-6G), soldadura orbital
- Materiales: acero al carbono (S235, S275, S355), inoxidable (304, 316L), aluminio, cobre, Duplex
- Parámetros: intensidad, tensión, velocidad, gas de protección, electrodo/hilo adecuado
- Defectos: porosidad, fisuras, inclusiones, mordeduras — causas y correcciones
- Planos y simbología ISO 2553 / AWS A2.4, WPS/PQR, normas ISO 9606, EN 287, AWS D1.1, EN 1090
- Seguridad: EPI, gases, ventilación, riesgos eléctricos, ATEX
- Calderería: trazado, corte por plasma/oxicorte, doblado, rolado, ensamblaje

2) GESTIÓN del taller dentro de Weldix (usa los datos reales de las secciones de contexto):
- Órdenes de trabajo (OT): estado, avance, operario asignado, cómo interpretarlas
- Stock de materiales: existencias, mínimos y qué está por debajo del mínimo
- Equipos / GMAO: estado de la maquinaria y qué equipos tienen el mantenimiento vencido
- Fichaje / jornada: si hay jornada abierta, horas trabajadas, jornadas del equipo
- Nóminas: cuántas hay disponibles y cómo se descargan (el operario descarga las suyas; el admin las sube)
- RRHH: vacaciones disponibles, solicitudes de ausencia, permisos retribuidos (matrimonio, nacimiento,
  fallecimiento familiar), bajas médicas, jornada y turnos.
  Para vacaciones: el convenio general reconoce 22 días laborables anuales como mínimo. Los días laborables
  son de lunes a viernes, excluyendo festivos nacionales, autonómicos y locales.

Responde siempre en español, de forma clara, directa y práctica. Cuando des parámetros técnicos, sé específico
con valores concretos. Cuando la respuesta dependa de los datos del taller, básate en las secciones de contexto
y cita cifras concretas (ej. qué equipo está vencido, cuántas horas lleva esta semana, qué material está bajo).

REGLA — FUERA DE ÁMBITO:
Solo si la pregunta NO tiene relación con el taller ni con Weldix (soldadura, calderería, materiales, OTs,
stock, equipos/mantenimiento, fichaje, nóminas, RRHH, seguridad, normativa o gestión de producción),
responde ÚNICAMENTE con:
"Solo puedo ayudarte con temas del taller: soldadura, materiales, OTs, stock, equipos, fichaje, nóminas o RRHH."
No añadas nada más. No expliques por qué. No ofrezcas alternativas fuera del taller."""


def _format_stock(stock_items: list) -> str:
    if not stock_items:
        return "Sin datos de stock disponibles."
    lines = []
    for m in stock_items:
        alerta = " ⚠ STOCK BAJO" if m.quantity < m.minimum else ""
        lines.append(
            f"- {m.name}: {m.quantity} {m.unit} (mínimo requerido: {m.minimum}){alerta}"
        )
    return "\n".join(lines)


def _format_jobs(jobs: list) -> str:
    if not jobs:
        return "No hay trabajos registrados en el sistema."

    counts: dict[str, int] = {}
    for j in jobs:
        counts[j.estado] = counts.get(j.estado, 0) + 1

    order = ["pendiente", "en_proceso", "control", "listo", "entregado"]
    labels = {
        "pendiente": "Pendiente",
        "en_proceso": "En proceso",
        "control": "Control",
        "listo": "Listo",
        "entregado": "Entregado",
    }
    summary = ", ".join(
        f"{labels.get(s, s)}: {counts[s]}" for s in order if s in counts
    )

    lines = [f"Resumen: {summary}"]
    active = [j for j in jobs if j.estado in ("pendiente", "en_proceso", "control")]
    if active:
        lines.append("Detalle de trabajos activos:")
        for j in active:
            operario = j.operario.full_name if j.operario else "Sin asignar"
            lines.append(
                f"  - {j.code or 'Sin código'} | {j.titulo} | {labels.get(j.estado, j.estado)} | Operario: {operario}"
            )
    return "\n".join(lines)


def consultar(
    mensaje: str,
    historial: list[dict] | None = None,
    stock_items: list | None = None,
    jobs_items: list | None = None,
    contexto_trabajo: str | None = None,
    user_context: str | None = None,
    contexto_seccion: str | None = None,
    equipos_context: str | None = None,
    fichaje_context: str | None = None,
    nominas_context: str | None = None,
) -> str:
    if not settings.mistral_api_key:
        raise ValueError("MISTRAL_API_KEY no configurada")

    # Construir system prompt enriquecido con contexto dinámico
    system_content = _SYSTEM_PROMPT

    # Perfil del usuario + datos RRHH personales
    if user_context:
        system_content += f"\n\n## Perfil del usuario que consulta:\n{user_context}"

    if jobs_items is not None:
        system_content += f"\n\n## Estado actual de los trabajos del taller:\n{_format_jobs(jobs_items)}"

    if stock_items is not None:
        system_content += (
            f"\n\n## Stock actual del taller:\n{_format_stock(stock_items)}"
        )

    if equipos_context:
        system_content += (
            f"\n\n## Equipos y estado de mantenimiento (GMAO):\n{equipos_context}"
        )

    if fichaje_context:
        system_content += f"\n\n## Fichaje / jornada:\n{fichaje_context}"

    if nominas_context:
        system_content += f"\n\n## Nóminas:\n{nominas_context}"

    # Contexto de la sección que está viendo el usuario (legacy: trabajo activo)
    seccion_ctx = contexto_seccion or contexto_trabajo
    if seccion_ctx:
        system_content += (
            f"\n\n## Contexto de la sección activa del usuario:\n{seccion_ctx}"
        )

    client = Mistral(api_key=settings.mistral_api_key)

    messages = [{"role": "system", "content": system_content}]
    if historial:
        messages.extend(historial)
    messages.append({"role": "user", "content": mensaje})

    response = client.chat.complete(
        model="mistral-small-latest",
        messages=messages,
        timeout_ms=_MISTRAL_TIMEOUT_MS,
    )

    return response.choices[0].message.content


# ── Chat público del landing (venta) — SIN datos de ningún taller ─────────────

_LANDING_PROMPT = """Eres el asistente comercial de Weldix en su web. Hablas con un dueño de taller
que se está informando ANTES de contratar. Tono: cercano, honesto, directo y sin humo. Responde en
español, corto (2-4 frases máximo), y solo sobre Weldix.

QUÉ ES WELDIX:
Software de gestión integral para talleres de soldadura, calderería y metal. No es solo fichaje:
gestiona el taller entero. Módulos: órdenes de trabajo (OT), control horario y fichaje, modo kiosko
(tablet en la entrada, se ficha con PIN), stock con lectura de albaranes por IA, portal para que el
cliente siga su trabajo, mantenimiento de máquinas (GMAO), RRHH completo (vacaciones, turnos, EPIs,
certificados, ausencias), nóminas, asistente de IA técnico de soldadura, fotos y QR por trabajo,
dashboard con métricas y avisos en tiempo real.

DATOS CLAVE:
- Precio: 49 €/mes de base + 17 € por operario. Sin permanencia.
- Prueba: 15 días gratis y SIN tarjeta. Te registras y ya estás dentro (unos 2 minutos).
- No hay que instalar nada: funciona en navegador y se instala como app (PWA) en tablet/móvil. Aguanta cortes de conexión.
- Cumple el registro horario legal (RDL 8/2019) con exportación en CSV para Inspección de Trabajo.
- Cada taller es un espacio 100% aislado. Cumple RGPD.
- Diferencia con software de fichaje (Sesame, Jornada…): esos solo fichan; Weldix además gestiona OTs, stock, mantenimiento, portal cliente y una IA que entiende de soldadura.

REGLAS:
- Si no sabes un dato concreto o te preguntan algo muy específico de su caso, NO te lo inventes.
- Si piden una demo, hablar con una persona, o tienen dudas muy concretas, invítales a escribir a hola@weldix.es.
- Si preguntan algo que no tiene que ver con Weldix, redirige con amabilidad al producto.
- No prometas funciones que no están en la lista de módulos de arriba."""


def consultar_landing(mensaje: str, historial: list[dict] | None = None) -> str:
    """Chat de venta del landing. Público, sin auth y sin datos de ningún taller."""
    if not settings.mistral_api_key:
        raise ValueError("MISTRAL_API_KEY no configurada")

    client = Mistral(api_key=settings.mistral_api_key)
    messages = [{"role": "system", "content": _LANDING_PROMPT}]
    if historial:
        messages.extend(historial)
    messages.append({"role": "user", "content": mensaje})

    response = client.chat.complete(
        model="mistral-small-latest",
        messages=messages,
        timeout_ms=_MISTRAL_TIMEOUT_MS,
    )
    return response.choices[0].message.content
