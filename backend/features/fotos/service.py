import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from backend.core.config import settings
from backend.features.jobs.service import get_job_by_id

from .model import Foto

MEDIA_DIR = Path("media/fotos")
ETIQUETAS_VALIDAS = {"antes", "durante", "despues"}
READ_CHUNK_BYTES = 1024 * 1024


def _extension_permitida(filename: str) -> bool:
    return filename.lower().rsplit(".", 1)[-1] in {"jpg", "jpeg", "png", "webp", "gif"}


def _detect_image_type(header: bytes) -> tuple[str, str] | None:
    if header.startswith(b"\xff\xd8\xff"):
        return "jpg", "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png", "image/png"
    if header.startswith(b"GIF87a") or header.startswith(b"GIF89a"):
        return "gif", "image/gif"
    if len(header) >= 12 and header.startswith(b"RIFF") and header[8:12] == b"WEBP":
        return "webp", "image/webp"
    return None


async def guardar_foto(
    db: Session,
    job_id: int,
    uploader_id: int | None,
    tenant_id: int | None,
    file: UploadFile,
    etiqueta: str = "durante",
) -> Foto:
    """
    Guarda el archivo fisico y crea el registro asociado al tenant del trabajo.
    """
    if not _extension_permitida(file.filename or ""):
        raise ValueError("Solo se permiten imagenes (jpg, jpeg, png, webp, gif)")

    job = get_job_by_id(db, job_id, tenant_id)
    etiqueta = etiqueta if etiqueta in ETIQUETAS_VALIDAS else "durante"

    first_chunk = await file.read(READ_CHUNK_BYTES)
    detected = _detect_image_type(first_chunk)
    if not detected:
        raise ValueError("El archivo no es una imagen valida")

    extension, detected_mime = detected
    if file.content_type and file.content_type != detected_mime:
        raise ValueError("El tipo MIME declarado no coincide con la imagen")

    filename = f"{uuid.uuid4().hex}.{extension}"
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    dest = MEDIA_DIR / filename

    bytes_written = 0
    try:
        with dest.open("wb") as buf:
            if first_chunk:
                bytes_written += len(first_chunk)
                if bytes_written > settings.max_upload_mb * 1024 * 1024:
                    raise ValueError(
                        f"La imagen supera el limite de {settings.max_upload_mb} MB"
                    )
                buf.write(first_chunk)

            while chunk := await file.read(READ_CHUNK_BYTES):
                bytes_written += len(chunk)
                if bytes_written > settings.max_upload_mb * 1024 * 1024:
                    raise ValueError(
                        f"La imagen supera el limite de {settings.max_upload_mb} MB"
                    )
                buf.write(chunk)
    except Exception:
        if dest.exists():
            dest.unlink()
        raise

    foto = Foto(
        tenant_id=job.tenant_id,
        job_id=job.id,
        uploader_id=uploader_id,
        filename=filename,
        filepath=str(dest),
        etiqueta=etiqueta,
    )
    db.add(foto)
    db.commit()
    db.refresh(foto)
    return foto


def get_fotos_para_trabajo(
    db: Session, job_id: int, tenant_id: int | None = None
) -> list[Foto]:
    get_job_by_id(db, job_id, tenant_id)
    q = db.query(Foto).filter(Foto.job_id == job_id)
    if tenant_id is not None:
        q = q.filter(Foto.tenant_id == tenant_id)
    return q.order_by(Foto.created_at.asc()).all()


def get_foto_by_id(db: Session, foto_id: int, tenant_id: int | None = None) -> Foto:
    q = db.query(Foto).filter(Foto.id == foto_id)
    if tenant_id is not None:
        q = q.filter(Foto.tenant_id == tenant_id)
    foto = q.first()
    if not foto:
        raise ValueError(f"Foto {foto_id} no encontrada")
    return foto


def delete_foto(
    db: Session,
    foto_id: int,
    user_id: int,
    user_role: str,
    tenant_id: int | None = None,
) -> None:
    """Borra el registro y el archivo fisico. Solo el uploader o un admin puede borrar."""
    foto = get_foto_by_id(db, foto_id, tenant_id)
    if user_role != "admin" and foto.uploader_id != user_id:
        raise PermissionError("No puedes borrar una foto que no subiste tu")

    archivo = Path(foto.filepath)
    if archivo.exists():
        archivo.unlink()

    db.delete(foto)
    db.commit()
