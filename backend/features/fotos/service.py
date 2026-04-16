import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session

from .model import Foto

# Directorio donde se guardan los archivos físicos
MEDIA_DIR = Path("media/fotos")
ETIQUETAS_VALIDAS = {"antes", "durante", "despues"}


def _extension_permitida(filename: str) -> bool:
    return filename.lower().rsplit(".", 1)[-1] in {"jpg", "jpeg", "png", "webp", "gif"}


async def guardar_foto(
    db: Session,
    job_id: int,
    uploader_id: int | None,
    file: UploadFile,
    etiqueta: str = "durante",
) -> Foto:
    """
    Guarda el archivo físico en /media/fotos/ y crea el registro en la base de datos.
    Genera un nombre único con uuid para evitar colisiones.
    """
    if not _extension_permitida(file.filename or ""):
        raise ValueError("Solo se permiten imágenes (jpg, jpeg, png, webp, gif)")

    etiqueta = etiqueta if etiqueta in ETIQUETAS_VALIDAS else "durante"

    # Nombre único: uuid + extensión original
    extension = (file.filename or "foto.jpg").rsplit(".", 1)[-1].lower()
    filename = f"{uuid.uuid4().hex}.{extension}"

    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    dest = MEDIA_DIR / filename

    # Lectura en chunks para no saturar memoria con archivos grandes
    with dest.open("wb") as buf:
        while chunk := await file.read(1024 * 1024):  # 1 MB chunks
            buf.write(chunk)

    foto = Foto(
        job_id=job_id,
        uploader_id=uploader_id,
        filename=filename,
        filepath=str(dest),
        etiqueta=etiqueta,
    )
    db.add(foto)
    db.commit()
    db.refresh(foto)
    return foto


def get_fotos_para_trabajo(db: Session, job_id: int) -> list[Foto]:
    return (
        db.query(Foto)
        .filter(Foto.job_id == job_id)
        .order_by(Foto.created_at.asc())
        .all()
    )


def delete_foto(db: Session, foto_id: int, user_id: int, user_role: str) -> None:
    """Borra el registro y el archivo físico. Solo el uploader o un admin puede borrar."""
    foto = db.query(Foto).filter(Foto.id == foto_id).first()
    if not foto:
        raise ValueError(f"Foto {foto_id} no encontrada")
    if user_role != "admin" and foto.uploader_id != user_id:
        raise PermissionError("No puedes borrar una foto que no subiste tú")

    # Borrar archivo físico si existe
    archivo = Path(foto.filepath)
    if archivo.exists():
        archivo.unlink()

    db.delete(foto)
    db.commit()
