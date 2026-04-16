import os
import shutil
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import get_current_user, require_role
from backend.features.auth.model import User

from . import service
from .schemas import (
    TIPOS_AUSENCIA,
    TIPOS_REQUIEREN_JUSTIFICANTE,
    ConfiguracionLaboralRequest,
    ConfiguracionLaboralResponse,
    CrearSolicitudRequest,
    EventoCalendarioResponse,
    FestivoResponse,
    InformeMensualResponse,
    RevisarSolicitudRequest,
    SaldoVacacionesResponse,
    SolicitudAusenciaResponse,
)

router = APIRouter(prefix="/rrhh", tags=["rrhh"])

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
    _: User = Depends(require_role("admin")),
):
    """Admin: crea o actualiza la configuración laboral de un operario."""
    config = service.upsert_config(db, body)
    return config


# ─── Saldo de vacaciones ──────────────────────────────────────────────────────


@router.get("/saldo/mio", response_model=SaldoVacacionesResponse)
def mi_saldo(
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario consulta su propio saldo de vacaciones."""
    return service.get_saldo_vacaciones(db, current_user.id, year)


@router.get("/saldo/{operario_id}", response_model=SaldoVacacionesResponse)
def saldo_operario(
    operario_id: int,
    year: int = Query(default=date.today().year),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Admin: saldo de vacaciones de un operario concreto."""
    return service.get_saldo_vacaciones(db, operario_id, year)


# ─── Solicitudes — operario ───────────────────────────────────────────────────


@router.post("/solicitudes", response_model=SolicitudAusenciaResponse, status_code=201)
def crear_solicitud(
    body: CrearSolicitudRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """El operario crea una solicitud de ausencia."""
    try:
        solicitud = service.crear_solicitud(db, current_user.id, body)
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
    _: User = Depends(require_role("admin")),
):
    """Admin: todas las solicitudes con filtros opcionales."""
    solicitudes = service.get_todas_solicitudes(db, estado, tipo, operario_id)
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
    """Admin: aprueba o rechaza una solicitud pendiente."""
    try:
        solicitud = service.revisar_solicitud(db, solicitud_id, current_user.id, body)
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
    """Eventos del mes: festivos nacionales + ausencias del equipo."""
    return service.get_calendario(db, year, month, current_user.id)


# ─── Informe mensual — admin ──────────────────────────────────────────────────


@router.get("/informe", response_model=InformeMensualResponse)
def informe_mensual(
    year: int = Query(default=date.today().year),
    month: int = Query(default=date.today().month, ge=1, le=12),
    db: Session = Depends(get_db),
    _: User = Depends(require_role("admin")),
):
    """Admin: resumen mensual del equipo — ausencias + horas fichadas."""
    return service.get_informe_mensual(db, year, month)
