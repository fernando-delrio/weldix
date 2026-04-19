from sqlalchemy.orm import Session

from .model import Material
from .schemas import (
    ConsumeMaterialRequest,
    CreateMaterialRequest,
    UpdateMaterialRequest,
)


def get_all_materials(db: Session, tenant_id: int | None = None) -> list[Material]:
    q = db.query(Material)
    if tenant_id is not None:
        q = q.filter(Material.tenant_id == tenant_id)
    return q.order_by(Material.name).all()


def get_material_by_id(
    db: Session, material_id: int, tenant_id: int | None = None
) -> Material:
    q = db.query(Material).filter(Material.id == material_id)
    if tenant_id is not None:
        q = q.filter(Material.tenant_id == tenant_id)
    material = q.first()
    if not material:
        raise ValueError(f"Material {material_id} no encontrado")
    return material


def create_material(
    db: Session, data: CreateMaterialRequest, tenant_id: int | None = None
) -> Material:
    material = Material(
        tenant_id=tenant_id,
        name=data.name,
        quantity=data.quantity,
        minimum=data.minimum,
        unit=data.unit,
    )
    db.add(material)
    db.commit()
    db.refresh(material)
    return material


def update_material(
    db: Session,
    material_id: int,
    data: UpdateMaterialRequest,
    tenant_id: int | None = None,
) -> Material:
    material = get_material_by_id(db, material_id, tenant_id)
    if data.name is not None:
        material.name = data.name
    if data.quantity is not None:
        material.quantity = data.quantity
    if data.minimum is not None:
        material.minimum = data.minimum
    if data.unit is not None:
        material.unit = data.unit
    db.commit()
    db.refresh(material)
    return material


def consume_material(
    db: Session, material_id: int, consumed: float, tenant_id: int | None = None
) -> Material:
    material = get_material_by_id(db, material_id, tenant_id)
    if consumed > material.quantity:
        raise ValueError("No hay suficiente stock disponible")
    material.quantity = max(0.0, material.quantity - consumed)
    db.commit()
    db.refresh(material)
    return material


def delete_material(
    db: Session, material_id: int, tenant_id: int | None = None
) -> None:
    material = get_material_by_id(db, material_id, tenant_id)
    db.delete(material)
    db.commit()
