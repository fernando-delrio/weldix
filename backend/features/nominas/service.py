import uuid
from pathlib import Path

from fastapi import UploadFile
from sqlalchemy.orm import Session, joinedload

from .model import Nomina

MEDIA_DIR = Path("media/nominas")
MAX_PDF_BYTES = 10 * 1024 * 1024  # 10 MB
TIPOS_PERMITIDOS = {"application/pdf"}
READ_CHUNK = 1024 * 1024


def _es_pdf_por_magic(header: bytes) -> bool:
    return header[:4] == b"%PDF"


async def subir_nomina(
    db: Session,
    tenant_id: int | None,
    operario_id: int,
    uploaded_by_id: int,
    year: int,
    month: int,
    file: UploadFile,
) -> Nomina:
    """
    Guarda el PDF en disco y crea o reemplaza el registro de nómina.
    Si ya existe una nómina para ese operario/año/mes, elimina el archivo antiguo
    y sube el nuevo (el admin corrige una nómina errónea).
    """
    if month < 1 or month > 12:
        raise ValueError("El mes debe estar entre 1 y 12")
    if year < 2000 or year > 2100:
        raise ValueError("Año fuera de rango")

    if file.content_type not in TIPOS_PERMITIDOS:
        raise ValueError("Solo se permiten archivos PDF")

    first_chunk = await file.read(READ_CHUNK)
    if not _es_pdf_por_magic(first_chunk):
        raise ValueError("El archivo no es un PDF válido")

    # Guardar en disco
    MEDIA_DIR.mkdir(parents=True, exist_ok=True)
    filename_unico = f"{uuid.uuid4().hex}.pdf"
    dest = MEDIA_DIR / filename_unico

    bytes_written = len(first_chunk)
    if bytes_written > MAX_PDF_BYTES:
        raise ValueError("El PDF supera el límite de 10 MB")

    try:
        with dest.open("wb") as buf:
            buf.write(first_chunk)
            while chunk := await file.read(READ_CHUNK):
                bytes_written += len(chunk)
                if bytes_written > MAX_PDF_BYTES:
                    raise ValueError("El PDF supera el límite de 10 MB")
                buf.write(chunk)
    except Exception:
        if dest.exists():
            dest.unlink()
        raise

    # Reemplazar si ya existía nómina para ese mes/año/operario
    existing = (
        db.query(Nomina)
        .filter(
            Nomina.tenant_id == tenant_id,
            Nomina.operario_id == operario_id,
            Nomina.year == year,
            Nomina.month == month,
        )
        .first()
    )
    if existing:
        old_path = Path(existing.filepath)
        if old_path.exists():
            old_path.unlink()
        db.delete(existing)
        db.flush()

    nomina = Nomina(
        tenant_id=tenant_id,
        operario_id=operario_id,
        uploaded_by_id=uploaded_by_id,
        year=year,
        month=month,
        filename=file.filename or f"nomina_{year}_{month:02d}.pdf",
        filepath=str(dest),
    )
    db.add(nomina)
    db.commit()
    db.refresh(nomina)

    # Cargar la relación operario para el schema
    db.refresh(nomina)
    nomina.operario  # trigger lazy load
    return nomina


def list_nominas_admin(
    db: Session,
    tenant_id: int | None,
    operario_id: int | None = None,
    year: int | None = None,
) -> list[Nomina]:
    """Admin: lista todas las nóminas del tenant con filtros opcionales."""
    q = (
        db.query(Nomina)
        .options(joinedload(Nomina.operario))
        .filter(Nomina.tenant_id == tenant_id)
    )
    if operario_id is not None:
        q = q.filter(Nomina.operario_id == operario_id)
    if year is not None:
        q = q.filter(Nomina.year == year)
    return q.order_by(Nomina.year.desc(), Nomina.month.desc()).all()


def list_nominas_operario(
    db: Session,
    tenant_id: int | None,
    operario_id: int,
    year: int | None = None,
) -> list[Nomina]:
    """Operario: sus propias nóminas, opcionalmente filtradas por año."""
    q = (
        db.query(Nomina)
        .options(joinedload(Nomina.operario))
        .filter(Nomina.tenant_id == tenant_id, Nomina.operario_id == operario_id)
    )
    if year is not None:
        q = q.filter(Nomina.year == year)
    return q.order_by(Nomina.year.desc(), Nomina.month.desc()).all()


def get_nomina_by_id(
    db: Session,
    nomina_id: int,
    tenant_id: int | None,
) -> Nomina:
    q = (
        db.query(Nomina)
        .options(joinedload(Nomina.operario))
        .filter(Nomina.id == nomina_id)
    )
    if tenant_id is not None:
        q = q.filter(Nomina.tenant_id == tenant_id)
    nomina = q.first()
    if not nomina:
        raise ValueError(f"Nómina {nomina_id} no encontrada")
    return nomina


def delete_nomina(db: Session, nomina_id: int, tenant_id: int | None) -> None:
    """Admin: elimina la nómina y su archivo físico."""
    nomina = get_nomina_by_id(db, nomina_id, tenant_id)
    archivo = Path(nomina.filepath)
    if archivo.exists():
        archivo.unlink()
    db.delete(nomina)
    db.commit()
