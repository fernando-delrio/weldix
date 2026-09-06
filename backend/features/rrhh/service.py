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
    AccidenteLaboral,
    Certificado,
    ConfiguracionLaboral,
    DocumentoJustificante,
    EpiEntrega,
    Festivo,
    PermisoTrabajoEspecial,
    ReconocimientoMedico,
    SolicitudAusencia,
    SolicitudCambioTurno,
    TurnoAsignado,
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


def _validar_operario_del_tenant(db: Session, tenant_id: int | None, operario_id: int) -> None:
    """Guard clause de aislamiento: comprueba que operario_id pertenece al
    mismo tenant que el admin que hace la petición — evita asociar EPIs,
    certificados, reconocimientos o permisos a un operario de otro taller."""
    operario = (
        db.query(User).filter(User.id == operario_id, User.tenant_id == tenant_id).first()
    )
    if not operario:
        raise ValueError(f"Operario {operario_id} no encontrado")


# ─── Configuración laboral ────────────────────────────────────────────────────


def upsert_config(
    db: Session, tenant_id: int | None, data: ConfiguracionLaboralRequest
) -> ConfiguracionLaboral:
    """Crea o actualiza la configuración laboral de un operario de SU taller."""
    _validar_operario_del_tenant(db, tenant_id, data.operario_id)

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
        config = ConfiguracionLaboral(tenant_id=tenant_id, **data.model_dump())
        db.add(config)

    db.commit()
    db.refresh(config)
    return config


# ─── Saldo de vacaciones ──────────────────────────────────────────────────────


def get_saldo_vacaciones(
    db: Session, tenant_id: int | None, operario_id: int, year: int
) -> SaldoVacacionesResponse:
    """
    Calcula el saldo de vacaciones de un operario para el año dado.
    Solo cuenta días de tipo 'vacaciones'.

    Guard clause de aislamiento (mismo patrón que jobs/fichaje): el
    operario debe pertenecer al mismo tenant que quien consulta. Evita que
    un admin vea el saldo de vacaciones de un operario de otro taller.
    """
    operario = (
        db.query(User)
        .filter(User.id == operario_id, User.tenant_id == tenant_id)
        .first()
    )
    if not operario:
        raise ValueError(f"Operario {operario_id} no encontrado")

    config = _get_config_operario(db, operario_id)

    # Días aprobados este año
    aprobadas = (
        db.query(func.sum(SolicitudAusencia.dias_solicitados))
        .filter(
            SolicitudAusencia.tenant_id == tenant_id,
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
            SolicitudAusencia.tenant_id == tenant_id,
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
    db: Session, operario_id: int, tenant_id: int | None, data: CrearSolicitudRequest
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
        saldo = get_saldo_vacaciones(db, tenant_id, operario_id, data.fecha_inicio.year)
        if dias > saldo.dias_disponibles:
            raise ValueError(
                f"No tienes suficientes días de vacaciones. "
                f"Solicitas {dias} días pero solo tienes {saldo.dias_disponibles} disponibles."
            )

    solicitud = SolicitudAusencia(
        tenant_id=tenant_id,
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
    tenant_id: int | None,
    estado: str | None = None,
    tipo: str | None = None,
    operario_id: int | None = None,
) -> list[SolicitudAusencia]:
    """Admin: todas las solicitudes de SU taller, con filtros opcionales."""
    q = db.query(SolicitudAusencia).filter(SolicitudAusencia.tenant_id == tenant_id)
    if estado:
        q = q.filter(SolicitudAusencia.estado == estado)
    if tipo:
        q = q.filter(SolicitudAusencia.tipo == tipo)
    if operario_id:
        q = q.filter(SolicitudAusencia.operario_id == operario_id)
    return q.order_by(SolicitudAusencia.created_at.desc()).all()


def revisar_solicitud(
    db: Session,
    tenant_id: int | None,
    solicitud_id: int,
    admin_id: int,
    data: RevisarSolicitudRequest,
) -> SolicitudAusencia:
    """Admin aprueba o rechaza una solicitud pendiente de SU taller.

    Guard clause de aislamiento: filtra por tenant_id además de por id —
    evita que un admin revise la solicitud de un operario de otro taller.
    """
    solicitud = (
        db.query(SolicitudAusencia)
        .filter(
            SolicitudAusencia.id == solicitud_id,
            SolicitudAusencia.tenant_id == tenant_id,
        )
        .first()
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
    db: Session, tenant_id: int | None, year: int, month: int, current_user_id: int
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

    # Ausencias aprobadas de todo el equipo (visibles para todos, solo del propio taller)
    ausencias_equipo = (
        db.query(SolicitudAusencia)
        .filter(
            SolicitudAusencia.tenant_id == tenant_id,
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
            SolicitudAusencia.tenant_id == tenant_id,
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


def get_informe_mensual(
    db: Session, tenant_id: int | None, year: int, month: int
) -> InformeMensualResponse:
    """
    Admin: resumen del mes para todo el equipo DE SU TALLER.
    - Días de ausencia aprobados y pendientes por operario
    - Horas fichadas en el mes

    Guard clause de aislamiento: los operarios y sus ausencias/fichajes se
    filtran por tenant_id — evita que el informe mensual de un admin
    mezcle operarios de otros talleres.
    """
    primer_dia = date(year, month, 1)
    ultimo_dia = date(year, month, calendar.monthrange(year, month)[1])

    operarios = (
        db.query(User)
        .filter(User.role == "operario", User.tenant_id == tenant_id)
        .all()
    )
    informe_operarios = []

    for op in operarios:
        # Ausencias aprobadas en el mes
        aprobadas = (
            db.query(SolicitudAusencia)
            .filter(
                SolicitudAusencia.tenant_id == tenant_id,
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
                SolicitudAusencia.tenant_id == tenant_id,
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
                Fichaje.tenant_id == tenant_id,
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


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — EPIs
# ══════════════════════════════════════════════════════════════════════════════


def get_epis(db: Session, tenant_id: int | None, operario_id: int | None = None) -> list:
    query = db.query(EpiEntrega).filter(EpiEntrega.tenant_id == tenant_id)
    if operario_id:
        query = query.filter(EpiEntrega.operario_id == operario_id)
    return query.order_by(EpiEntrega.fecha_entrega.desc()).all()


def get_epis_proximos_caducar(db: Session, tenant_id: int | None, dias: int = 30) -> list:
    from datetime import timedelta
    limite = date.today() + timedelta(days=dias)
    return (
        db.query(EpiEntrega)
        .filter(
            EpiEntrega.tenant_id == tenant_id,
            EpiEntrega.estado == "activo",
            EpiEntrega.fecha_caducidad.isnot(None),
            EpiEntrega.fecha_caducidad <= limite,
        )
        .order_by(EpiEntrega.fecha_caducidad.asc())
        .all()
    )


def crear_epi(db: Session, tenant_id: int | None, registrado_por_id: int, data) -> EpiEntrega:
    _validar_operario_del_tenant(db, tenant_id, data.operario_id)
    epi = EpiEntrega(
        tenant_id=tenant_id,
        operario_id=data.operario_id,
        registrado_por_id=registrado_por_id,
        tipo_epi=data.tipo_epi,
        descripcion=data.descripcion,
        talla=data.talla,
        cantidad=data.cantidad,
        fecha_entrega=data.fecha_entrega,
        fecha_caducidad=data.fecha_caducidad,
        estado="activo",
    )
    db.add(epi)
    db.commit()
    db.refresh(epi)
    return epi


def eliminar_epi(db: Session, tenant_id: int | None, epi_id: int) -> None:
    epi = (
        db.query(EpiEntrega)
        .filter(EpiEntrega.id == epi_id, EpiEntrega.tenant_id == tenant_id)
        .first()
    )
    if not epi:
        raise ValueError("EPI no encontrado")
    db.delete(epi)
    db.commit()


def actualizar_estado_epi(
    db: Session, tenant_id: int | None, epi_id: int, nuevo_estado: str
) -> EpiEntrega:
    epi = (
        db.query(EpiEntrega)
        .filter(EpiEntrega.id == epi_id, EpiEntrega.tenant_id == tenant_id)
        .first()
    )
    if not epi:
        raise ValueError("EPI no encontrado")
    if nuevo_estado not in {"activo", "repuesto", "baja"}:
        raise ValueError("Estado no válido")
    epi.estado = nuevo_estado
    db.commit()
    db.refresh(epi)
    return epi


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — Certificados
# ══════════════════════════════════════════════════════════════════════════════


def get_certificados(db: Session, tenant_id: int | None, operario_id: int | None = None) -> list:
    query = db.query(Certificado).filter(Certificado.tenant_id == tenant_id)
    if operario_id:
        query = query.filter(Certificado.operario_id == operario_id)
    return query.order_by(Certificado.fecha_caducidad.asc().nullslast()).all()


def get_certificados_proximos_caducar(db: Session, tenant_id: int | None, dias: int = 60) -> list:
    from datetime import timedelta
    limite = date.today() + timedelta(days=dias)
    return (
        db.query(Certificado)
        .filter(
            Certificado.tenant_id == tenant_id,
            Certificado.estado == "vigente",
            Certificado.fecha_caducidad.isnot(None),
            Certificado.fecha_caducidad <= limite,
        )
        .order_by(Certificado.fecha_caducidad.asc())
        .all()
    )


def crear_certificado(
    db: Session, tenant_id: int | None, registrado_por_id: int,
    data, archivo_ruta: str | None = None, archivo_nombre: str | None = None,
) -> Certificado:
    _validar_operario_del_tenant(db, tenant_id, data.operario_id)
    cert = Certificado(
        tenant_id=tenant_id,
        operario_id=data.operario_id,
        registrado_por_id=registrado_por_id,
        tipo=data.tipo,
        descripcion=data.descripcion,
        entidad_certificadora=data.entidad_certificadora,
        fecha_emision=data.fecha_emision,
        fecha_caducidad=data.fecha_caducidad,
        estado="vigente",
        archivo_ruta=archivo_ruta,
        archivo_nombre=archivo_nombre,
    )
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return cert


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — Reconocimientos médicos
# ══════════════════════════════════════════════════════════════════════════════


def get_reconocimientos(db: Session, tenant_id: int | None, operario_id: int | None = None) -> list:
    query = db.query(ReconocimientoMedico).filter(ReconocimientoMedico.tenant_id == tenant_id)
    if operario_id:
        query = query.filter(ReconocimientoMedico.operario_id == operario_id)
    return query.order_by(ReconocimientoMedico.fecha_realizado.desc()).all()


def crear_reconocimiento(
    db: Session, tenant_id: int | None, registrado_por_id: int,
    data, archivo_ruta: str | None = None, archivo_nombre: str | None = None,
) -> ReconocimientoMedico:
    _validar_operario_del_tenant(db, tenant_id, data.operario_id)
    rec = ReconocimientoMedico(
        tenant_id=tenant_id,
        operario_id=data.operario_id,
        registrado_por_id=registrado_por_id,
        fecha_realizado=data.fecha_realizado,
        fecha_proximo=data.fecha_proximo,
        resultado=data.resultado,
        restricciones=data.restricciones,
        observaciones=data.observaciones,
        archivo_ruta=archivo_ruta,
        archivo_nombre=archivo_nombre,
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    return rec


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — Cálculo de horas extra, nocturnas y festivas
# ══════════════════════════════════════════════════════════════════════════════


def get_resumen_horas(db: Session, tenant_id: int | None, operario_id: int, mes: str):
    """
    Calcula horas ordinarias, extra, nocturnas y festivas de un operario
    en el mes indicado (formato 'YYYY-MM').

    Horas extra   = horas trabajadas - horas_jornada configuradas
    Horas nocturnas = tramos trabajados entre 22:00 y 06:00
    Horas festivas  = jornadas que caen en día festivo nacional
    """
    year_str, month_str = mes.split("-")
    anio = int(year_str)
    mes_num = int(month_str)

    fichajes = (
        db.query(Fichaje)
        .filter(
            Fichaje.tenant_id == tenant_id,
            Fichaje.operario_id == operario_id,
            Fichaje.fin.isnot(None),
            extract("year", Fichaje.inicio) == anio,
            extract("month", Fichaje.inicio) == mes_num,
        )
        .all()
    )

    config = (
        db.query(ConfiguracionLaboral)
        .filter(ConfiguracionLaboral.operario_id == operario_id)
        .first()
    )
    horas_jornada = config.horas_jornada if config else 8.0

    festivos_del_mes = {
        f.fecha
        for f in db.query(Festivo)
        .filter(Festivo.year == anio)
        .all()
    }

    # Filtrado por tenant_id: si operario_id pertenece a otro taller, operario
    # queda None y el resumen muestra "—" en vez de filtrar el nombre real de
    # un empleado ajeno (las horas ya salen en 0 porque Fichaje sí está scoped).
    operario = (
        db.query(User).filter(User.id == operario_id, User.tenant_id == tenant_id).first()
    )

    horas_total = 0.0
    horas_nocturnas = 0.0
    horas_festivas = 0.0
    horas_por_dia: dict[date, float] = {}

    for fichaje in fichajes:
        if not fichaje.horas:
            continue
        horas_total += fichaje.horas

        dia = fichaje.inicio.date()
        horas_por_dia[dia] = horas_por_dia.get(dia, 0.0) + fichaje.horas

        # Calcular tramos nocturnos (22:00–06:00)
        inicio_dt = fichaje.inicio
        fin_dt = fichaje.fin
        if inicio_dt.tzinfo is None:
            inicio_dt = inicio_dt.replace(tzinfo=timezone.utc)
            fin_dt = fin_dt.replace(tzinfo=timezone.utc)

        horas_nocturnas += _calcular_horas_nocturnas(inicio_dt, fin_dt)

        if dia in festivos_del_mes:
            horas_festivas += fichaje.horas

    # Horas ordinarias por día = min(horas_trabajadas_ese_dia, horas_jornada)
    horas_ordinarias = sum(min(horas, horas_jornada) for horas in horas_por_dia.values())
    horas_extra = max(0.0, horas_total - horas_ordinarias)

    return {
        "operario_id": operario_id,
        "operario_nombre": operario.full_name if operario else "—",
        "mes": mes,
        "horas_ordinarias": round(horas_ordinarias, 2),
        "horas_extra": round(horas_extra, 2),
        "horas_nocturnas": round(horas_nocturnas, 2),
        "horas_festivas": round(horas_festivas, 2),
        "horas_total": round(horas_total, 2),
        "fichajes_count": len(fichajes),
    }


def _calcular_horas_nocturnas(inicio, fin) -> float:
    """Suma los minutos trabajados en tramo nocturno (22:00–06:00) y devuelve horas."""
    from datetime import timedelta
    NOCTURNO_INICIO = 22
    NOCTURNO_FIN = 6

    total_minutos = 0
    cursor = inicio
    while cursor < fin:
        hora = cursor.hour
        es_nocturno = hora >= NOCTURNO_INICIO or hora < NOCTURNO_FIN
        siguiente = cursor + timedelta(minutes=1)
        if siguiente > fin:
            siguiente = fin
        if es_nocturno:
            total_minutos += (siguiente - cursor).seconds // 60
        cursor = siguiente
        if cursor >= fin:
            break

    return total_minutos / 60.0


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-2 — Turnos
# ══════════════════════════════════════════════════════════════════════════════


def get_turnos_semana(
    db: Session,
    tenant_id: int | None,
    fecha_inicio: date,
    fecha_fin: date,
    operario_id: int | None = None,
) -> list:
    q = db.query(TurnoAsignado).filter(
        TurnoAsignado.tenant_id == tenant_id,
        TurnoAsignado.fecha >= fecha_inicio,
        TurnoAsignado.fecha <= fecha_fin,
    )
    if operario_id:
        q = q.filter(TurnoAsignado.operario_id == operario_id)
    return q.order_by(TurnoAsignado.fecha.asc(), TurnoAsignado.operario_id.asc()).all()


def crear_turno_bulk(db: Session, tenant_id: int | None, creado_por_id: int, turnos_data: list) -> list:
    # Una sola query para validar todos los operario_id del lote contra el
    # tenant, en vez de N queries — evita crear/actualizar turnos con un
    # operario de otro taller (IDOR de escritura).
    operario_ids = {t.operario_id for t in turnos_data}
    validos = {
        u.id for u in db.query(User.id).filter(User.id.in_(operario_ids), User.tenant_id == tenant_id).all()
    }
    invalidos = operario_ids - validos
    if invalidos:
        raise ValueError(f"Operario(s) no encontrado(s) en este taller: {sorted(invalidos)}")

    creados = []
    for turno_data in turnos_data:
        # Si ya existe un turno para ese operario y fecha, lo actualiza
        existente = (
            db.query(TurnoAsignado)
            .filter(
                TurnoAsignado.tenant_id == tenant_id,
                TurnoAsignado.operario_id == turno_data.operario_id,
                TurnoAsignado.fecha == turno_data.fecha,
            )
            .first()
        )
        if existente:
            existente.turno = turno_data.turno
            existente.nota = turno_data.nota
            creados.append(existente)
        else:
            nuevo = TurnoAsignado(
                tenant_id=tenant_id,
                operario_id=turno_data.operario_id,
                creado_por_id=creado_por_id,
                fecha=turno_data.fecha,
                turno=turno_data.turno,
                nota=turno_data.nota,
            )
            db.add(nuevo)
            creados.append(nuevo)
    db.commit()
    for turno in creados:
        db.refresh(turno)
    return creados


def eliminar_turno(db: Session, turno_id: int, tenant_id: int | None) -> None:
    turno = (
        db.query(TurnoAsignado)
        .filter(TurnoAsignado.id == turno_id, TurnoAsignado.tenant_id == tenant_id)
        .first()
    )
    if not turno:
        raise ValueError("Turno no encontrado")
    db.delete(turno)
    db.commit()


def solicitar_cambio_turno(db: Session, tenant_id: int | None, solicitante_id: int, data) -> SolicitudCambioTurno:
    # Los tres ids del body son de otros recursos (receptor, turno cedido,
    # turno recibido) — sin validarlos contra el tenant, un operario podía
    # apuntar a un turno de otro taller. Al aprobarse, revisar_cambio_turno
    # intercambia operario_id entre estos dos turnos, así que sin esta
    # validación aquí sería una escritura cruzada de tenant, no solo lectura.
    _validar_operario_del_tenant(db, tenant_id, data.receptor_id)

    turno_cedido = (
        db.query(TurnoAsignado)
        .filter(
            TurnoAsignado.id == data.turno_cedido_id,
            TurnoAsignado.tenant_id == tenant_id,
            TurnoAsignado.operario_id == solicitante_id,
        )
        .first()
    )
    if not turno_cedido:
        raise ValueError("El turno que cedes no existe o no es tuyo")

    turno_recibido = (
        db.query(TurnoAsignado)
        .filter(
            TurnoAsignado.id == data.turno_recibido_id,
            TurnoAsignado.tenant_id == tenant_id,
            TurnoAsignado.operario_id == data.receptor_id,
        )
        .first()
    )
    if not turno_recibido:
        raise ValueError("El turno solicitado no existe o no pertenece al receptor")

    solicitud = SolicitudCambioTurno(
        tenant_id=tenant_id,
        solicitante_id=solicitante_id,
        receptor_id=data.receptor_id,
        turno_cedido_id=data.turno_cedido_id,
        turno_recibido_id=data.turno_recibido_id,
        motivo=data.motivo,
        estado="pendiente",
    )
    db.add(solicitud)
    db.commit()
    db.refresh(solicitud)
    return solicitud


def get_solicitudes_cambio_turno(db: Session, tenant_id: int | None) -> list:
    return (
        db.query(SolicitudCambioTurno)
        .filter(SolicitudCambioTurno.tenant_id == tenant_id)
        .order_by(SolicitudCambioTurno.created_at.desc())
        .all()
    )


def revisar_cambio_turno(
    db: Session, tenant_id: int | None, solicitud_id: int, aprobado_por_id: int, data
) -> SolicitudCambioTurno:
    solicitud = (
        db.query(SolicitudCambioTurno)
        .filter(
            SolicitudCambioTurno.id == solicitud_id,
            SolicitudCambioTurno.tenant_id == tenant_id,
        )
        .first()
    )
    if not solicitud:
        raise ValueError("Solicitud no encontrada")
    if solicitud.estado != "pendiente":
        raise ValueError("Esta solicitud ya ha sido revisada")

    solicitud.estado = data.estado
    solicitud.aprobado_por_id = aprobado_por_id
    solicitud.aprobado_en = datetime.now(timezone.utc)
    solicitud.comentario_admin = data.comentario_admin

    # Si se aprueba, intercambiar los turnos reales
    if data.estado == "aprobada":
        turno_a = solicitud.turno_cedido
        turno_b = solicitud.turno_recibido
        if turno_a and turno_b:
            turno_a.operario_id, turno_b.operario_id = turno_b.operario_id, turno_a.operario_id

    db.commit()
    db.refresh(solicitud)
    return solicitud


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-3 — Accidentes laborales
# ══════════════════════════════════════════════════════════════════════════════


def get_accidentes(db: Session, tenant_id: int | None) -> list:
    return (
        db.query(AccidenteLaboral)
        .filter(AccidenteLaboral.tenant_id == tenant_id)
        .order_by(AccidenteLaboral.fecha_hora.desc())
        .all()
    )


def crear_accidente(db: Session, tenant_id: int | None, reportado_por_id: int, data) -> AccidenteLaboral:
    _validar_operario_del_tenant(db, tenant_id, data.afectado_id)
    accidente = AccidenteLaboral(
        tenant_id=tenant_id,
        afectado_id=data.afectado_id,
        reportado_por_id=reportado_por_id,
        fecha_hora=data.fecha_hora,
        tipo=data.tipo,
        lugar=data.lugar,
        descripcion=data.descripcion,
        causa_raiz=data.causa_raiz,
        dias_baja=data.dias_baja,
        requiere_hospitalizacion=data.requiere_hospitalizacion,
        estado="abierto",
    )
    db.add(accidente)
    db.commit()
    db.refresh(accidente)
    return accidente


def actualizar_accidente(db: Session, accidente_id: int, tenant_id: int | None, data) -> AccidenteLaboral:
    accidente = (
        db.query(AccidenteLaboral)
        .filter(AccidenteLaboral.id == accidente_id, AccidenteLaboral.tenant_id == tenant_id)
        .first()
    )
    if not accidente:
        raise ValueError("Accidente no encontrado")

    if data.estado is not None:
        estados_validos = {"abierto", "en_investigacion", "cerrado"}
        if data.estado not in estados_validos:
            raise ValueError(f"Estado debe ser uno de: {estados_validos}")
        accidente.estado = data.estado
    if data.causa_raiz is not None:
        accidente.causa_raiz = data.causa_raiz
    if data.medidas_correctoras is not None:
        accidente.medidas_correctoras = data.medidas_correctoras
    if data.dias_baja is not None:
        accidente.dias_baja = data.dias_baja
    if data.fecha_cierre is not None:
        accidente.fecha_cierre = data.fecha_cierre

    db.commit()
    db.refresh(accidente)
    return accidente


def calcular_indices_siniestralidad(db: Session, tenant_id: int | None, year: int) -> dict:
    """
    Calcula los índices de siniestralidad estándar del año indicado.
    IF = (accidentes × 10^6) / horas trabajadas
    IG = (días baja × 10^3) / horas trabajadas
    II = (accidentes × 10^3) / trabajadores
    """
    accidentes = (
        db.query(AccidenteLaboral)
        .filter(
            AccidenteLaboral.tenant_id == tenant_id,
            AccidenteLaboral.tipo == "accidente",
            extract("year", AccidenteLaboral.fecha_hora) == year,
        )
        .all()
    )
    incidentes = (
        db.query(AccidenteLaboral)
        .filter(
            AccidenteLaboral.tenant_id == tenant_id,
            AccidenteLaboral.tipo == "incidente",
            extract("year", AccidenteLaboral.fecha_hora) == year,
        )
        .count()
    )
    casi_accidentes = (
        db.query(AccidenteLaboral)
        .filter(
            AccidenteLaboral.tenant_id == tenant_id,
            AccidenteLaboral.tipo == "casi_accidente",
            extract("year", AccidenteLaboral.fecha_hora) == year,
        )
        .count()
    )

    total_accidentes = len(accidentes)
    total_dias_baja = sum(acc.dias_baja or 0 for acc in accidentes)

    horas_result = (
        db.query(func.sum(Fichaje.horas))
        .filter(
            Fichaje.tenant_id == tenant_id,
            Fichaje.horas.isnot(None),
            extract("year", Fichaje.inicio) == year,
        )
        .scalar()
    )
    horas_trabajadas = float(horas_result or 0)

    num_trabajadores = (
        db.query(User)
        .filter(User.tenant_id == tenant_id, User.role == "operario")
        .count()
    )

    indice_frecuencia = round((total_accidentes * 1_000_000) / horas_trabajadas, 2) if horas_trabajadas else 0.0
    indice_gravedad = round((total_dias_baja * 1_000) / horas_trabajadas, 2) if horas_trabajadas else 0.0
    indice_incidencia = round((total_accidentes * 1_000) / num_trabajadores, 2) if num_trabajadores else 0.0

    return {
        "year": year,
        "horas_trabajadas": round(horas_trabajadas, 2),
        "total_accidentes": total_accidentes,
        "total_incidentes": incidentes,
        "total_casi_accidentes": casi_accidentes,
        "total_dias_baja": total_dias_baja,
        "indice_frecuencia": indice_frecuencia,
        "indice_gravedad": indice_gravedad,
        "indice_incidencia": indice_incidencia,
    }


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-3 — Permisos de trabajo especiales
# ══════════════════════════════════════════════════════════════════════════════


def get_permisos_trabajo(db: Session, tenant_id: int | None, operario_id: int | None = None) -> list:
    query = db.query(PermisoTrabajoEspecial).filter(PermisoTrabajoEspecial.tenant_id == tenant_id)
    if operario_id:
        query = query.filter(PermisoTrabajoEspecial.operario_id == operario_id)
    return query.order_by(PermisoTrabajoEspecial.fecha_caducidad.asc().nullslast()).all()


def crear_permiso_trabajo(
    db: Session, tenant_id: int | None, autorizado_por_id: int,
    data, archivo_ruta: str | None = None, archivo_nombre: str | None = None,
) -> PermisoTrabajoEspecial:
    _validar_operario_del_tenant(db, tenant_id, data.operario_id)
    permiso = PermisoTrabajoEspecial(
        tenant_id=tenant_id,
        operario_id=data.operario_id,
        autorizado_por_id=autorizado_por_id,
        tipo=data.tipo,
        descripcion_trabajo=data.descripcion_trabajo,
        fecha_emision=data.fecha_emision,
        fecha_caducidad=data.fecha_caducidad,
        estado="activo",
        archivo_ruta=archivo_ruta,
        archivo_nombre=archivo_nombre,
    )
    db.add(permiso)
    db.commit()
    db.refresh(permiso)
    return permiso
