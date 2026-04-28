from sqlalchemy.orm import Session

from backend.core.webhooks import fire_webhook

from .model import Material
from .schemas import (
    ConsumeMaterialRequest,
    CreateMaterialRequest,
    GenerarVariantesRequest,
    GenerarVariantesResponse,
    StockItemResponse,
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


def _build_display_name(category: str, specs: dict) -> str:
    parts = [category.capitalize()]
    for k, v in specs.items():
        parts.append(f"{k}={v}")
    return " · ".join(parts)


def create_material(
    db: Session, data: CreateMaterialRequest, tenant_id: int | None = None
) -> Material:
    material = Material(
        tenant_id=tenant_id,
        name=data.name,
        category=data.category,
        display_name=data.display_name,
        specs=data.specs,
        supplier_code=data.supplier_code,
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
    if data.category is not None:
        material.category = data.category
    if data.display_name is not None:
        material.display_name = data.display_name
    if data.specs is not None:
        material.specs = data.specs
    if data.supplier_code is not None:
        material.supplier_code = data.supplier_code
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

    if material.minimum and material.quantity < material.minimum:
        fire_webhook(
            "stock_bajo",
            {
                "material_id": material.id,
                "name": material.name,
                "quantity": material.quantity,
                "minimum": material.minimum,
                "unit": material.unit,
                "tenant_id": material.tenant_id,
            },
        )

    return material


def delete_material(
    db: Session, material_id: int, tenant_id: int | None = None
) -> None:
    material = get_material_by_id(db, material_id, tenant_id)
    db.delete(material)
    db.commit()


def generar_variantes(
    db: Session, data: GenerarVariantesRequest, tenant_id: int | None = None
) -> GenerarVariantesResponse:
    combinaciones = data.calcular_combinaciones()
    creadas: list[Material] = []
    omitidas = 0

    for specs in combinaciones:
        display_name = _build_display_name(data.category, specs)

        # Saltar si ya existe un material con ese display_name en el tenant
        existe = (
            db.query(Material)
            .filter(
                Material.tenant_id == tenant_id,
                Material.display_name == display_name,
            )
            .first()
        )
        if existe:
            omitidas += 1
            continue

        material = Material(
            tenant_id=tenant_id,
            name=display_name,
            category=data.category,
            display_name=display_name,
            specs=specs,
            quantity=0.0,
            minimum=data.minimum,
            unit=data.unit,
        )
        db.add(material)
        creadas.append(material)

    db.commit()
    for m in creadas:
        db.refresh(m)

    return GenerarVariantesResponse(
        creadas=len(creadas),
        omitidas=omitidas,
        materiales=[StockItemResponse.from_orm_material(m) for m in creadas],
    )
