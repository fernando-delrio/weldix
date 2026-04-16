"""
Servicio de RRHH — lógica de negocio para:
- Solicitudes de ausencia (crear, revisar, cancelar)
- Saldo de vacaciones por operario
- Festivos nacionales (desde nager.at, cacheados en BD)
- Calendario mensual de ausencias + festivos
- Informe mensual del equipo
"""

import calendar
from datetime import date, datetime, timezone

import httpx
from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from backend.core.cache import ttl_cache
from backend.features.auth.model import User
from backend.features.fichaje.model import Fichaje

from .model import (
    ConfiguracionLaboral,
    DocumentoJustificante,
    Festivo,
    SolicitudAusencia,
)
from .schemas import (
    TIPOS_REQUIEREN_JUSTIFICANTE,
    ConfiguracionLaboralRequest,
    CrearSolicitudRequest,
    EventoCalendarioResponse,
    InformeMensualOperario,
    InformeMensualResponse,
    RevisarSolicitudRequest,
    SaldoVacacionesResponse,
)

# URL de la API de festivos — gratuita, sin autenticación
_NAGER_URL = "https://date.nager.at/api/v3/PublicHolidays/{year}/ES"

# Mapeo de letras a números de día (0=lunes en Python)
_DIA_MAP = {"L": 0, "M": 1, "X": 2, "J": 3, "V": 4, "S": 5, "D": 6}


# ─── Helpers internos ────────────────────────────────────────────────────────


def _dias_laborables_entre(
    inicio: date, fin: date, dias_laborables: str = "LMXJV"
) -> int:
    """
    Cuenta los días laborables entre dos fechas (ambas incluidas).
    'LMXJV' = lunes a viernes. 'LMXJVS' incluye sábado.
    """
    laborables = {_DIA_MAP[c] for c in dias_laborables if c in _DIA_MAP}
    total = 0
    current = inicio
    while current <= fin:
        if current.weekday() in laborables:
            total += 1
        current = date.fromordinal(current.toordinal() + 1)
    return total


def _get_config_operario(db: Session, operario_id: int) -> ConfiguracionLaboral:
    """Devuelve la config del operario o un objeto con valores por defecto."""
    config = (
        db.query(ConfiguracionLaboral)
        .filter(ConfiguracionLaboral.operario_id == operario_id)
        .first()
    )
    if config:
        return config
    # Valores por defecto del convenio si no tiene config asignada
    return ConfiguracionLaboral(
        operario_id=operario_id,
        dias_vacaciones_anuales=22,
        horas_jornada=8.0,
        dias_laborables="LMXJV",
        turno="manana",
    )


# ─── Festivos ─────────────────────────────────────────────────────────────────


def _fetch_festivos_api(year: int) -> list[dict]:
    """Llama a nager.at y devuelve los festivos nacionales de España."""
    try:
        resp = httpx.get(_NAGER_URL.format(year=year), timeout=5.0)
        resp.raise_for_status()
        return resp.json()
    except Exception:
        return []


def get_festivos(db: Session, year: int) -> list[Festivo]:
    """
    Devuelve los festivos del año. Si no están en BD, los descarga de nager.at
    y los guarda. Si la API falla, devuelve lo que haya en BD (puede ser vacío).
    """
    existentes = db.query(Festivo).filter(Festivo.year == year).all()
    if existentes:
        return existentes

    datos = _fetch_festivos_api(year)
    festivos = []
    for d in datos:
        # Solo festivos globales (nacionales), no autonómicos
        if not d.get("global", True):
            continue
        f = Festivo(
            fecha=date.fromisoformat(d["date"]),
            nombre=d.get("localName", d["name"]),
            nombre_local=d.get("localName"),
            year=year,
            es_global=d.get("global", True),
        )
        db.add(f)
        festivos.append(f)

    if festivos:
        db.commit()
        for f in festivos:
            db.refresh(f)

    return festivos


# ─── Configuración laboral ────────────────────────────────────────────────────


def upsert_config(
    db: Session, data: ConfiguracionLaboralRequest
) -> ConfiguracionLaboral:
    """Crea o actualiza la configuración laboral de un operario."""
    config = (
        db.query(ConfiguracionLaboral)
        .filter(ConfiguracionLaboral.operario_id == data.operario_id)
        .first()
    )
    if config:
        config.dias_vacaciones_anuales = data.dias_vacaciones_anuales
        config.horas_jornada = data.horas_jornada
        config.dias_laborables = data.dias_laborables
        config.turno = data.turno
    else:
        config = ConfiguracionLaboral(**data.model_dump())
        db.add(config)

    db.commit()
    db.refresh(config)
    return config


# ─── Saldo de vacaciones ──────────────────────────────────────────────────────


def get_saldo_vacaciones(
    db: Session, operario_id: int, year: int
) -> SaldoVacacionesResponse:
    """
    Calcula el saldo de vacaciones de un operario para el año dado.
    Solo cuenta días de tipo 'vacaciones'.
    """
    config = _get_config_operario(db, operario_id)
    operario = db.query(User).filter(User.id == operario_id).first()

    # Días aprobados este año
    aprobadas = (
        db.query(func.sum(SolicitudAusencia.dias_solicitados))
        .filter(
            SolicitudAusencia.operario_id == operario_id,
            SolicitudAusencia.tipo == "vacaciones",
            SolicitudAusencia.estado == "aprobada",
            extract("year", SolicitudAusencia.fecha_inicio) == year,
        )
        .scalar()
        or 0
    )

    # Días pendientes de aprobación este año
    pendientes = (
        db.query(func.sum(SolicitudAusencia.dias_solicitados))
        .filter(
            SolicitudAusencia.operario_id == operario_id,
            SolicitudAusencia.tipo == "vacaciones",
            SolicitudAusencia.estado == "pendiente",
            extract("year", SolicitudAusencia.fecha_inicio) == year,
        )
        .scalar()
        or 0
    )

    disponibles = config.dias_vacaciones_anuales - aprobadas - pendientes

    return SaldoVacacionesResponse(
        operario_id=operario_id,
        operario_nombre=operario.full_name if operario else str(operario_id),
        year=year,
        dias_totales=config.dias_vacaciones_anuales,
        dias_aprobados=aprobadas,
        dias_pendientes=pendientes,
        dias_disponibles=max(0, disponibles),
    )


# ─── Solicitudes de ausencia ──────────────────────────────────────────────────


def crear_solicitud(
    db: Session, operario_id: int, data: CrearSolicitudRequest
) -> SolicitudAusencia:
    """
    Crea una solicitud de ausencia con validaciones de negocio:
    - No se pueden pedir fechas pasadas
    - No se puede solapar con otra solicitud activa del mismo operario
    - Para vacaciones: no superar el saldo disponible
    """
    config = _get_config_operario(db, operario_id)
    dias = _dias_laborables_entre(
        data.fecha_inicio, data.fecha_fin, config.dias_laborables
    )

    if dias <= 0:
        raise ValueError(
            "El período seleccionado no contiene días laborables según tu jornada."
        )

    # Guard: no pedir fechas en el pasado (excepto baja médica que puede ser retroactiva)
    if data.tipo != "baja_medica" and data.fecha_inicio < date.today():
        raise ValueError("No puedes solicitar ausencias en fechas pasadas.")

    # Guard: solapamiento con solicitudes activas
    solapamiento = (
        db.query(SolicitudAusencia)
        .filter(
            SolicitudAusencia.operario_id == operario_id,
            SolicitudAusencia.estado.in_(["pendiente", "aprobada"]),
            SolicitudAusencia.fecha_inicio <= data.fecha_fin,
            SolicitudAusencia.fecha_fin >= data.fecha_inicio,
        )
        .first()
    )
    if solapamiento:
        raise ValueError(
            f"Ya tienes una solicitud ({solapamiento.tipo}) en esas fechas "
            f"con estado '{solapamiento.estado}'."
        )

    # Guard: saldo de vacaciones
    if data.tipo == "vacaciones":
        saldo = get_saldo_vacaciones(db, operario_id, data.fecha_inicio.year)
        if dias > saldo.dias_disponibles:
            raise ValueError(
                f"No tienes suficientes días de vacaciones. "
                f"Solicitas {dias} días pero solo tienes {saldo.dias_disponibles} disponibles."
            )

    solicitud = SolicitudAusencia(
        operario_id=operario_id,
        tipo=data.tipo,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        dias_solicitados=dias,
        estado="pendiente",
        motivo=data.motivo,
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return solicitud


def get_solicitudes_operario(db: Session, operario_id: int) -> list[SolicitudAusencia]:
    """Todas las solicitudes de un operario, más reciente primero."""
    return (
        db.query(SolicitudAusencia)
        .filter(SolicitudAusencia.operario_id == operario_id)
        .order_by(SolicitudAusencia.created_at.desc())
        .all()
    )


def get_todas_solicitudes(
    db: Session,
    estado: str | None = None,
    tipo: str | None = None,
    operario_id: int | None = None,
) -> list[SolicitudAusencia]:
    """Admin: todas las solicitudes con filtros opcionales."""
    q = db.query(SolicitudAusencia)
    if estado:
        q = q.filter(SolicitudAusencia.estado == estado)
    if tipo:
        q = q.filter(SolicitudAusencia.tipo == tipo)
    if operario_id:
        q = q.filter(SolicitudAusencia.operario_id == operario_id)
    return q.order_by(SolicitudAusencia.created_at.desc()).all()


def revisar_solicitud(
    db: Session,
    solicitud_id: int,
    admin_id: int,
    data: RevisarSolicitudRequest,
) -> SolicitudAusencia:
    """Admin aprueba o rechaza una solicitud pendiente."""
    solicitud = (
        db.query(SolicitudAusencia).filter(SolicitudAusencia.id == solicitud_id).first()
    )
    if not solicitud:
        raise ValueError(f"Solicitud {solicitud_id} no encontrada")
    if solicitud.estado != "pendiente":
        raise ValueError(
            f"Solo se pueden revisar solicitudes pendientes. "
            f"Esta está en estado '{solicitud.estado}'."
        )

    solicitud.estado = data.estado
    solicitud.comentario_admin = data.comentario_admin
    solicitud.revisado_por_id = admin_id
    solicitud.revisado_en = datetime.now(timezone.utc)
    db.commit()
    db.refresh(solicitud)
    return solicitud


def cancelar_solicitud(
    db: Session, solicitud_id: int, operario_id: int
) -> SolicitudAusencia:
    """El operario cancela una solicitud pendiente propia."""
    solicitud = (
        db.query(SolicitudAusencia).filter(SolicitudAusencia.id == solicitud_id).first()
    )
    if not solicitud:
        raise ValueError(f"Solicitud {solicitud_id} no encontrada")
    if solicitud.operario_id != operario_id:
        raise PermissionError("No puedes cancelar la solicitud de otro operario")
    if solicitud.estado != "pendiente":
        raise ValueError(
            f"Solo puedes cancelar solicitudes pendientes. "
            f"Esta ya está '{solicitud.estado}'."
        )

    solicitud.estado = "cancelada"
    db.commit()
    db.refresh(solicitud)
    return solicitud


def adjuntar_justificante(
    db: Session,
    solicitud_id: int,
    operario_id: int,
    nombre_archivo: str,
    ruta: str,
    content_type: str,
) -> DocumentoJustificante:
    """Adjunta un archivo a una solicitud. El archivo ya debe estar guardado en /media/."""
    solicitud = (
        db.query(SolicitudAusencia).filter(SolicitudAusencia.id == solicitud_id).first()
    )
    if not solicitud:
        raise ValueError(f"Solicitud {solicitud_id} no encontrada")
    if solicitud.operario_id != operario_id:
        raise PermissionError(
            "No puedes adjuntar documentos a la solicitud de otro operario"
        )

    doc = DocumentoJustificante(
        solicitud_id=solicitud_id,
        nombre_archivo=nombre_archivo,
        ruta=ruta,
        content_type=content_type,
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


# ─── Calendario ───────────────────────────────────────────────────────────────


def get_calendario(
    db: Session, year: int, month: int, current_user_id: int
) -> list[EventoCalendarioResponse]:
    """
    Devuelve los eventos del mes: festivos + ausencias aprobadas.
    Las ausencias del propio usuario incluyen también las pendientes.
    """
    primer_dia = date(year, month, 1)
    ultimo_dia = date(year, month, calendar.monthrange(year, month)[1])

    eventos: list[EventoCalendarioResponse] = []

    # Festivos del mes
    festivos = (
        db.query(Festivo)
        .filter(
            Festivo.year == year,
            Festivo.fecha >= primer_dia,
            Festivo.fecha <= ultimo_dia,
        )
        .all()
    )
    for f in festivos:
        eventos.append(
            EventoCalendarioResponse(
                tipo="festivo",
                fecha_inicio=f.fecha,
                fecha_fin=f.fecha,
                titulo=f.nombre,
                es_propio=False,
            )
        )

    # Ausencias aprobadas de todo el equipo (visibles para todos)
    ausencias_equipo = (
        db.query(SolicitudAusencia)
        .filter(
            SolicitudAusencia.estado == "aprobada",
            SolicitudAusencia.fecha_inicio <= ultimo_dia,
            SolicitudAusencia.fecha_fin >= primer_dia,
        )
        .all()
    )

    # Ausencias pendientes del propio usuario
    ausencias_propias_pendientes = (
        db.query(SolicitudAusencia)
        .filter(
            SolicitudAusencia.operario_id == current_user_id,
            SolicitudAusencia.estado == "pendiente",
            SolicitudAusencia.fecha_inicio <= ultimo_dia,
            SolicitudAusencia.fecha_fin >= primer_dia,
        )
        .all()
    )

    for aus in ausencias_equipo + ausencias_propias_pendientes:
        es_propio = aus.operario_id == current_user_id
        # Privacidad: las bajas médicas de compañeros no muestran el motivo
        titulo = aus.tipo if not es_propio and aus.tipo == "baja_medica" else aus.tipo
        operario_nombre = aus.operario.full_name if aus.operario else None

        eventos.append(
            EventoCalendarioResponse(
                tipo="ausencia",
                fecha_inicio=aus.fecha_inicio,
                fecha_fin=aus.fecha_fin,
                titulo=titulo,
                subtitulo=aus.motivo if es_propio else None,
                estado=aus.estado,
                operario_id=aus.operario_id,
                operario_nombre=operario_nombre,
                es_propio=es_propio,
            )
        )

    return sorted(eventos, key=lambda e: e.fecha_inicio)


# ─── Informe mensual ──────────────────────────────────────────────────────────


def get_informe_mensual(db: Session, year: int, month: int) -> InformeMensualResponse:
    """
    Admin: resumen del mes para todo el equipo.
    - Días de ausencia aprobados y pendientes por operario
    - Horas fichadas en el mes
    """
    primer_dia = date(year, month, 1)
    ultimo_dia = date(year, month, calendar.monthrange(year, month)[1])

    operarios = db.query(User).filter(User.role == "operario").all()
    informe_operarios = []

    for op in operarios:
        # Ausencias aprobadas en el mes
        aprobadas = (
            db.query(SolicitudAusencia)
            .filter(
                SolicitudAusencia.operario_id == op.id,
                SolicitudAusencia.estado == "aprobada",
                SolicitudAusencia.fecha_inicio <= ultimo_dia,
                SolicitudAusencia.fecha_fin >= primer_dia,
            )
            .all()
        )
        dias_aprobados = sum(a.dias_solicitados for a in aprobadas)

        # Ausencias pendientes en el mes
        pendientes = (
            db.query(SolicitudAusencia)
            .filter(
                SolicitudAusencia.operario_id == op.id,
                SolicitudAusencia.estado == "pendiente",
                SolicitudAusencia.fecha_inicio <= ultimo_dia,
                SolicitudAusencia.fecha_fin >= primer_dia,
            )
            .all()
        )
        dias_pendientes = sum(p.dias_solicitados for p in pendientes)

        # Horas fichadas en el mes
        horas = (
            db.query(func.sum(Fichaje.horas))
            .filter(
                Fichaje.operario_id == op.id,
                Fichaje.horas.isnot(None),
                func.date(Fichaje.inicio) >= primer_dia,
                func.date(Fichaje.inicio) <= ultimo_dia,
            )
            .scalar()
            or 0.0
        )

        from .schemas import SolicitudAusenciaResponse

        informe_operarios.append(
            InformeMensualOperario(
                operario_id=op.id,
                operario_nombre=op.full_name,
                dias_ausencia_aprobados=dias_aprobados,
                dias_ausencia_pendientes=dias_pendientes,
                horas_fichadas=round(horas, 2),
                ausencias=[
                    SolicitudAusenciaResponse.from_orm(a)
                    for a in aprobadas + pendientes
                ],
            )
        )

    return InformeMensualResponse(
        year=year,
        month=month,
        total_operarios=len(operarios),
        operarios=informe_operarios,
    )
