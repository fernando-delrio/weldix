import os
import shutil
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import (
    get_current_user,
    require_active_trial,
    require_role,
)
from backend.features.auth.model import User

from . import service
from .model import AccidenteLaboral
from .schemas import (
    TIPOS_AUSENCIA,
    TIPOS_CERTIFICADO,
    TIPOS_EPI,
    TIPOS_PERMISO_ESPECIAL,
    TIPOS_REQUIEREN_JUSTIFICANTE,
    AccidenteRequest,
    ActualizarAccidenteRequest,
    AccidenteLaboralResponse,
    CertificadoRequest,
    CertificadoResponse,
    ConfiguracionLaboralRequest,
    ConfiguracionLaboralResponse,
    CrearSolicitudRequest,
    EpiEntregaRequest,
    EpiEntregaResponse,
    EventoCalendarioResponse,
    FestivoResponse,
    IndicesSiniestralidad,
    InformeMensualResponse,
    PermisoTrabajoRequest,
    PermisoTrabajoResponse,
    ReconocimientoMedicoResponse,
    ReconocimientoRequest,
    ResumenHorasResponse,
    RevisarCambioTurnoRequest,
    RevisarSolicitudRequest,
    SaldoVacacionesResponse,
    SolicitudAusenciaResponse,
    SolicitudCambioTurnoRequest,
    SolicitudCambioTurnoResponse,
    TurnoAsignadoResponse,
    TurnosBulkRequest,
)

router = APIRouter(
    prefix="/rrhh",
    tags=["rrhh"],
    dependencies=[Depends(require_active_trial)],
)

# Carpeta donde se guardan los justificantes
MEDIA_DIR = "media/justificantes"


# ─── Tipos de ausencia (lookup para el frontend) ─────────────────────────────


@router.get("/tipos-ausencia")
def get_tipos_ausencia():
    """Devuelve los tipos de ausencia disponibles con sus etiquetas."""
    return [
        {
            "valor": k,
            "label": v,
            "requiere_justificante": k in TIPOS_REQUIEREN_JUSTIFICANTE,
        }
        for k, v in TIPOS_AUSENCIA.items()
    ]


# ─── Festivos ─────────────────────────────────────────────────────────────────


@router.get("/festivos", response_model=list[FestivoResponse])
def get_festivos(
    year: int = Query(default=date.today().year, ge=2020, le=2030),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Festivos nacionales de España para el año indicado."""
    festivos = service.get_festivos(db, year)
    return festivos


# ─── Configuración laboral ────────────────────────────────────────────────────


@router.post("/config", response_model=ConfiguracionLaboralResponse)
def upsert_config(
    body: ConfiguracionLaboralRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: crea o actualiza la configuración laboral de un operario de su taller."""
    try:
        config = service.upsert_config(db, current_user.tenant_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return config


# ─── Saldo de vacaciones ──────────────────────────────────────────────────────


@router.get("/saldo/mio", response_model=SaldoVacacionesResponse)
def mi_saldo(
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario consulta su propio saldo de vacaciones."""
    return service.get_saldo_vacaciones(db, current_user.tenant_id, current_user.id, year)


@router.get("/saldo/{operario_id}", response_model=SaldoVacacionesResponse)
def saldo_operario(
    operario_id: int,
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: saldo de vacaciones de un operario de su propio taller."""
    try:
        return service.get_saldo_vacaciones(db, current_user.tenant_id, operario_id, year)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ─── Solicitudes — operario ───────────────────────────────────────────────────


@router.post("/solicitudes", response_model=SolicitudAusenciaResponse, status_code=201)
def crear_solicitud(
    body: CrearSolicitudRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario crea una solicitud de ausencia."""
    try:
        solicitud = service.crear_solicitud(db, current_user.id, current_user.tenant_id, body)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return SolicitudAusenciaResponse.from_orm(solicitud)


@router.get(
    "/solicitudes/mis-solicitudes", response_model=list[SolicitudAusenciaResponse]
)
def mis_solicitudes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario consulta sus solicitudes de ausencia."""
    solicitudes = service.get_solicitudes_operario(db, current_user.id)
    return [SolicitudAusenciaResponse.from_orm(s) for s in solicitudes]


@router.delete("/solicitudes/{solicitud_id}", status_code=204)
def cancelar_solicitud(
    solicitud_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario cancela una solicitud pendiente propia."""
    try:
        service.cancelar_solicitud(db, solicitud_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post(
    "/solicitudes/{solicitud_id}/justificante",
    response_model=SolicitudAusenciaResponse,
)
def subir_justificante(
    solicitud_id: int,
    archivo: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    El operario adjunta un archivo (PDF, imagen) a su solicitud.
    Tipos permitidos: PDF, JPG, PNG.
    Tamaño máximo: 5MB.
    """
    tipos_permitidos = {"application/pdf", "image/jpeg", "image/png", "image/webp"}
    if archivo.content_type not in tipos_permitidos:
        raise HTTPException(
            status_code=400,
            detail="Tipo de archivo no permitido. Solo PDF, JPG o PNG.",
        )

    # Leer el archivo para validar tamaño (5MB máximo)
    contenido = archivo.file.read()
    if len(contenido) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="El archivo no puede superar 5MB.")

    # Guardar en disco con nombre único para evitar colisiones
    os.makedirs(MEDIA_DIR, exist_ok=True)
    ext = archivo.filename.rsplit(".", 1)[-1] if "." in archivo.filename else "bin"
    nombre_unico = f"{uuid.uuid4().hex}.{ext}"
    ruta = os.path.join(MEDIA_DIR, nombre_unico)

    with open(ruta, "wb") as f:
        f.write(contenido)

    try:
        service.adjuntar_justificante(
            db,
            solicitud_id,
            current_user.id,
            nombre_archivo=archivo.filename,
            ruta=ruta,
            content_type=archivo.content_type,
        )
    except (PermissionError, ValueError) as exc:
        # Si falla la BD, borrar el archivo ya guardado
        os.remove(ruta)
        code = 403 if isinstance(exc, PermissionError) else 400
        raise HTTPException(status_code=code, detail=str(exc))

    solicitud = (
        db.query(service.SolicitudAusencia)
        .filter(service.SolicitudAusencia.id == solicitud_id)
        .first()
    )
    return SolicitudAusenciaResponse.from_orm(solicitud)


# ─── Solicitudes — admin ──────────────────────────────────────────────────────


@router.get("/solicitudes", response_model=list[SolicitudAusenciaResponse])
def todas_las_solicitudes(
    estado: str | None = Query(default=None),
    tipo: str | None = Query(default=None),
    operario_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: todas las solicitudes de SU taller, con filtros opcionales."""
    solicitudes = service.get_todas_solicitudes(
        db, current_user.tenant_id, estado, tipo, operario_id
    )
    return [SolicitudAusenciaResponse.from_orm(s) for s in solicitudes]


@router.patch(
    "/solicitudes/{solicitud_id}/revisar", response_model=SolicitudAusenciaResponse
)
def revisar_solicitud(
    solicitud_id: int,
    body: RevisarSolicitudRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: aprueba o rechaza una solicitud pendiente de su taller."""
    try:
        solicitud = service.revisar_solicitud(
            db, current_user.tenant_id, solicitud_id, current_user.id, body
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return SolicitudAusenciaResponse.from_orm(solicitud)


# ─── Calendario ───────────────────────────────────────────────────────────────


@router.get("/calendario", response_model=list[EventoCalendarioResponse])
def get_calendario(
    year: int = Query(default=date.today().year),
    month: int = Query(default=date.today().month, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Eventos del mes: festivos nacionales + ausencias del equipo de su taller."""
    return service.get_calendario(db, current_user.tenant_id, year, month, current_user.id)


# ─── Informe mensual — admin ──────────────────────────────────────────────────


@router.get("/informe", response_model=InformeMensualResponse)
def informe_mensual(
    year: int = Query(default=date.today().year),
    month: int = Query(default=date.today().month, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: resumen mensual del equipo de su taller — ausencias + horas fichadas."""
    return service.get_informe_mensual(db, current_user.tenant_id, year, month)


# ── Lookups ──────────────────────────────────────────────────────────────────

@router.get("/tipos-epi")
def get_tipos_epi(_: User = Depends(get_current_user)):
    return [{"valor": k, "label": v} for k, v in TIPOS_EPI.items()]


@router.get("/tipos-certificado")
def get_tipos_certificado(_: User = Depends(get_current_user)):
    return [{"valor": k, "label": v} for k, v in TIPOS_CERTIFICADO.items()]


@router.get("/tipos-permiso-especial")
def get_tipos_permiso_especial(_: User = Depends(get_current_user)):
    return [{"valor": k, "label": v} for k, v in TIPOS_PERMISO_ESPECIAL.items()]


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — EPIs
# ══════════════════════════════════════════════════════════════════════════════

MEDIA_RRHH = "media/rrhh"


@router.get("/epis", response_model=list[EpiEntregaResponse])
def listar_epis(
    operario_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin ve todos los EPIs del tenant. Operario ve solo los suyos."""
    uid = None if current_user.role == "admin" else current_user.id
    epis = service.get_epis(db, current_user.tenant_id, operario_id or uid)
    return [EpiEntregaResponse.from_orm(epi) for epi in epis]


@router.get("/epis/proximos-caducar", response_model=list[EpiEntregaResponse])
def epis_proximos_caducar(
    dias: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Admin: EPIs que caducan en los próximos N días."""
    epis = service.get_epis_proximos_caducar(db, _.tenant_id, dias)
    return [EpiEntregaResponse.from_orm(epi) for epi in epis]


@router.post("/epis", response_model=EpiEntregaResponse, status_code=201)
def crear_epi(
    body: EpiEntregaRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: registra la entrega de un EPI a un operario."""
    try:
        epi = service.crear_epi(db, current_user.tenant_id, current_user.id, body)
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc))
    return EpiEntregaResponse.from_orm(epi)


@router.patch("/epis/{epi_id}/estado", response_model=EpiEntregaResponse)
def actualizar_estado_epi(
    epi_id: int,
    estado: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: cambia el estado de un EPI (activo → repuesto → baja)."""
    try:
        epi = service.actualizar_estado_epi(db, current_user.tenant_id, epi_id, estado)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return EpiEntregaResponse.from_orm(epi)


@router.delete("/epis/{epi_id}", status_code=204)
def eliminar_epi(
    epi_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: elimina un registro de entrega de EPI (para corregir errores)."""
    try:
        service.eliminar_epi(db, current_user.tenant_id, epi_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — Certificados
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/certificados", response_model=list[CertificadoResponse])
def listar_certificados(
    operario_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = None if current_user.role == "admin" else current_user.id
    certs = service.get_certificados(db, current_user.tenant_id, operario_id or uid)
    return [CertificadoResponse.from_orm(cert) for cert in certs]


@router.get("/certificados/proximos-caducar", response_model=list[CertificadoResponse])
def certificados_proximos_caducar(
    dias: int = Query(default=60, ge=1, le=365),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    certs = service.get_certificados_proximos_caducar(db, current_user.tenant_id, dias)
    return [CertificadoResponse.from_orm(cert) for cert in certs]


@router.post("/certificados", response_model=CertificadoResponse, status_code=201)
def crear_certificado(
    tipo: str = File(default=...),
    operario_id: int = File(default=...),
    fecha_emision: str = File(default=...),
    fecha_caducidad: str | None = File(default=None),
    descripcion: str | None = File(default=None),
    entidad_certificadora: str | None = File(default=None),
    archivo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: sube un certificado (con archivo adjunto opcional)."""
    from datetime import date as date_type
    ruta = None
    nombre = None
    if archivo and archivo.filename:
        contenido = archivo.file.read()
        if len(contenido) > 10 * 1024 * 1024:
            raise HTTPException(400, "El archivo no puede superar 10MB.")
        os.makedirs(MEDIA_RRHH, exist_ok=True)
        ext = archivo.filename.rsplit(".", 1)[-1] if "." in archivo.filename else "bin"
        nombre_unico = f"{uuid.uuid4().hex}.{ext}"
        ruta = os.path.join(MEDIA_RRHH, nombre_unico)
        with open(ruta, "wb") as archivo_destino:
            archivo_destino.write(contenido)
        nombre = archivo.filename

    data = CertificadoRequest(
        operario_id=operario_id,
        tipo=tipo,
        descripcion=descripcion,
        entidad_certificadora=entidad_certificadora,
        fecha_emision=date_type.fromisoformat(fecha_emision),
        fecha_caducidad=date_type.fromisoformat(fecha_caducidad) if fecha_caducidad else None,
    )
    try:
        cert = service.crear_certificado(db, current_user.tenant_id, current_user.id, data, ruta, nombre)
    except ValueError as exc:
        if ruta and os.path.exists(ruta):
            os.remove(ruta)
        raise HTTPException(400, detail=str(exc))
    return CertificadoResponse.from_orm(cert)


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — Reconocimientos médicos
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/reconocimientos", response_model=list[ReconocimientoMedicoResponse])
def listar_reconocimientos(
    operario_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = None if current_user.role == "admin" else current_user.id
    recs = service.get_reconocimientos(db, current_user.tenant_id, operario_id or uid)
    return [ReconocimientoMedicoResponse.from_orm(rec) for rec in recs]


@router.post("/reconocimientos", response_model=ReconocimientoMedicoResponse, status_code=201)
def crear_reconocimiento(
    operario_id: int = File(default=...),
    fecha_realizado: str = File(default=...),
    fecha_proximo: str | None = File(default=None),
    resultado: str = File(default="apto"),
    restricciones: str | None = File(default=None),
    observaciones: str | None = File(default=None),
    archivo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    from datetime import date as date_type
    ruta = None
    nombre = None
    if archivo and archivo.filename:
        contenido = archivo.file.read()
        if len(contenido) > 10 * 1024 * 1024:
            raise HTTPException(400, "El archivo no puede superar 10MB.")
        os.makedirs(MEDIA_RRHH, exist_ok=True)
        ext = archivo.filename.rsplit(".", 1)[-1] if "." in archivo.filename else "bin"
        nombre_unico = f"{uuid.uuid4().hex}.{ext}"
        ruta = os.path.join(MEDIA_RRHH, nombre_unico)
        with open(ruta, "wb") as archivo_destino:
            archivo_destino.write(contenido)
        nombre = archivo.filename

    data = ReconocimientoRequest(
        operario_id=operario_id,
        fecha_realizado=date_type.fromisoformat(fecha_realizado),
        fecha_proximo=date_type.fromisoformat(fecha_proximo) if fecha_proximo else None,
        resultado=resultado,
        restricciones=restricciones,
        observaciones=observaciones,
    )
    try:
        rec = service.crear_reconocimiento(db, current_user.tenant_id, current_user.id, data, ruta, nombre)
    except ValueError as exc:
        if ruta and os.path.exists(ruta):
            os.remove(ruta)
        raise HTTPException(400, detail=str(exc))
    return ReconocimientoMedicoResponse.from_orm(rec)


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-1 — Horas extra
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/horas-extra/{operario_id}", response_model=ResumenHorasResponse)
def resumen_horas(
    operario_id: int,
    mes: str = Query(default=None, description="Formato YYYY-MM. Por defecto mes actual."),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Resumen de horas ordinarias, extra, nocturnas y festivas de un mes."""
    if not mes:
        hoy = date.today()
        mes = f"{hoy.year}-{hoy.month:02d}"
    if current_user.role != "admin" and current_user.id != operario_id:
        raise HTTPException(403, "Solo puedes consultar tus propias horas")
    return service.get_resumen_horas(db, current_user.tenant_id, operario_id, mes)


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-2 — Turnos
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/turnos", response_model=list[TurnoAsignadoResponse])
def listar_turnos(
    fecha_inicio: date = Query(default=None),
    fecha_fin: date = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Admin: todos los turnos del rango. Operario: solo los suyos.
    Por defecto devuelve la semana actual.
    """
    import datetime
    if not fecha_inicio:
        hoy = datetime.date.today()
        fecha_inicio = hoy - datetime.timedelta(days=hoy.weekday())
        fecha_fin = fecha_inicio + datetime.timedelta(days=6)
    elif not fecha_fin:
        fecha_fin = fecha_inicio
    # Operario solo ve sus propios turnos
    operario_id_filtro = None if current_user.role == "admin" else current_user.id
    turnos = service.get_turnos_semana(
        db, current_user.tenant_id, fecha_inicio, fecha_fin,
        operario_id=operario_id_filtro,
    )
    return [TurnoAsignadoResponse.from_orm(turno) for turno in turnos]


@router.post("/turnos/bulk", response_model=list[TurnoAsignadoResponse], status_code=201)
def crear_turnos_bulk(
    body: TurnosBulkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    """Admin: asigna o actualiza varios turnos de una vez (cuadrante semanal)."""
    turnos = service.crear_turno_bulk(db, current_user.tenant_id, current_user.id, body.turnos)
    return [TurnoAsignadoResponse.from_orm(turno) for turno in turnos]


@router.delete("/turnos/{turno_id}", status_code=204)
def eliminar_turno(
    turno_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        service.eliminar_turno(db, turno_id, current_user.tenant_id)
    except ValueError as exc:
        raise HTTPException(404, detail=str(exc))


@router.post("/turnos/solicitar-cambio", response_model=SolicitudCambioTurnoResponse, status_code=201)
def solicitar_cambio_turno(
    body: SolicitudCambioTurnoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Operario solicita un cambio de turno con un compañero."""
    sol = service.solicitar_cambio_turno(db, current_user.tenant_id, current_user.id, body)
    return SolicitudCambioTurnoResponse.from_orm(sol)


@router.get("/turnos/cambios", response_model=list[SolicitudCambioTurnoResponse])
def listar_cambios_turno(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    solicitudes = service.get_solicitudes_cambio_turno(db, current_user.tenant_id)
    return [SolicitudCambioTurnoResponse.from_orm(sol) for sol in solicitudes]


@router.patch("/turnos/cambios/{solicitud_id}/revisar", response_model=SolicitudCambioTurnoResponse)
def revisar_cambio_turno(
    solicitud_id: int,
    body: RevisarCambioTurnoRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        sol = service.revisar_cambio_turno(
            db, current_user.tenant_id, solicitud_id, current_user.id, body
        )
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc))
    return SolicitudCambioTurnoResponse.from_orm(sol)


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-3 — Accidentes laborales
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/accidentes/mios", response_model=list[AccidenteLaboralResponse])
def mis_accidentes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Operario: accidentes/incidentes en los que figura como afectado."""
    from sqlalchemy import extract
    accidentes = (
        db.query(AccidenteLaboral)
        .filter(
            AccidenteLaboral.tenant_id == current_user.tenant_id,
            AccidenteLaboral.afectado_id == current_user.id,
        )
        .order_by(AccidenteLaboral.fecha_hora.desc())
        .all()
    )
    return [AccidenteLaboralResponse.from_orm(acc) for acc in accidentes]


@router.get("/accidentes", response_model=list[AccidenteLaboralResponse])
def listar_accidentes(
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    accidentes = service.get_accidentes(db, _.tenant_id)
    return [AccidenteLaboralResponse.from_orm(acc) for acc in accidentes]


@router.post("/accidentes", response_model=AccidenteLaboralResponse, status_code=201)
def crear_accidente(
    body: AccidenteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Cualquier usuario autenticado puede reportar un accidente/incidente."""
    acc = service.crear_accidente(db, current_user.tenant_id, current_user.id, body)
    return AccidenteLaboralResponse.from_orm(acc)


@router.patch("/accidentes/{accidente_id}", response_model=AccidenteLaboralResponse)
def actualizar_accidente(
    accidente_id: int,
    body: ActualizarAccidenteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        acc = service.actualizar_accidente(db, accidente_id, current_user.tenant_id, body)
    except ValueError as exc:
        raise HTTPException(400, detail=str(exc))
    return AccidenteLaboralResponse.from_orm(acc)


@router.get("/accidentes/indices", response_model=IndicesSiniestralidad)
def indices_siniestralidad(
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return service.calcular_indices_siniestralidad(db, current_user.tenant_id, year)


# ══════════════════════════════════════════════════════════════════════════════
# RRHH-3 — Permisos de trabajo especiales
# ══════════════════════════════════════════════════════════════════════════════


@router.get("/permisos-especiales", response_model=list[PermisoTrabajoResponse])
def listar_permisos_especiales(
    operario_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    uid = None if current_user.role == "admin" else current_user.id
    permisos = service.get_permisos_trabajo(db, current_user.tenant_id, operario_id or uid)
    return [PermisoTrabajoResponse.from_orm(permiso) for permiso in permisos]


@router.post("/permisos-especiales", response_model=PermisoTrabajoResponse, status_code=201)
def crear_permiso_especial(
    operario_id: int = File(default=...),
    tipo: str = File(default=...),
    fecha_emision: str = File(default=...),
    fecha_caducidad: str | None = File(default=None),
    descripcion_trabajo: str | None = File(default=None),
    archivo: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    from datetime import date as date_type
    ruta = None
    nombre = None
    if archivo and archivo.filename:
        contenido = archivo.file.read()
        if len(contenido) > 10 * 1024 * 1024:
            raise HTTPException(400, "El archivo no puede superar 10MB.")
        os.makedirs(MEDIA_RRHH, exist_ok=True)
        ext = archivo.filename.rsplit(".", 1)[-1] if "." in archivo.filename else "bin"
        nombre_unico = f"{uuid.uuid4().hex}.{ext}"
        ruta = os.path.join(MEDIA_RRHH, nombre_unico)
        with open(ruta, "wb") as archivo_destino:
            archivo_destino.write(contenido)
        nombre = archivo.filename

    data = PermisoTrabajoRequest(
        operario_id=operario_id,
        tipo=tipo,
        descripcion_trabajo=descripcion_trabajo,
        fecha_emision=date_type.fromisoformat(fecha_emision),
        fecha_caducidad=date_type.fromisoformat(fecha_caducidad) if fecha_caducidad else None,
    )
    try:
        permiso = service.crear_permiso_trabajo(
            db, current_user.tenant_id, current_user.id, data, ruta, nombre
        )
    except ValueError as exc:
        if ruta and os.path.exists(ruta):
            os.remove(ruta)
        raise HTTPException(400, detail=str(exc))
    return PermisoTrabajoResponse.from_orm(permiso)
