from sqlalchemy.orm import Session

from .model import Material
from .schemas import CreateMaterialRequest, UpdateMaterialRequest


def get_all_materials(db: Session) -> list[Material]:
    return db.query(Material).order_by(Material.name).all()


def get_material_by_id(db: Session, material_id: int) -> Material:
    material = db.query(Material).filter(Material.id == material_id).first()
    if not material:
        raise ValueError(f"Material {material_id} no encontrado")
    return material


def create_material(db: Session, data: CreateMaterialRequest) -> Material:
    material = Material(
        name=data.name,
        quantity=data.quantity,
        minimum=data.minimum,
        unit=data.unit,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def update_material(db: Session, material_id: int, data: UpdateMaterialRequest) -> Material:
    material = get_material_by_id(db, material_id)
    if data.name     is not None: material.name     = data.name
    if data.quantity is not None: material.quantity = data.quantity
    if data.minimum  is not None: material.minimum  = data.minimum
    if data.unit     is not None: material.unit     = data.unit
    db.commit()
    db.refresh(material)
    return material


def delete_material(db: Session, material_id: int) -> None:
    material = get_material_by_id(db, material_id)
    db.delete(material)
    db.commit()
