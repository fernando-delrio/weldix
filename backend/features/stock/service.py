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


def _format_attribute_label(key: str) -> str:
    """El admin escribe la clave libremente (ej. 'longitud_mm'). La mostramos
    como texto legible ('Longitud mm') en vez del snake_case tal cual —
    antes salía 'longitud_mm=20', con pinta de print de depuración."""
    return key.replace("_", " ").capitalize()


def _build_display_name(category: str, specs: dict) -> str:
    parts = [category.capitalize()]
    for k, v in specs.items():
        parts.append(f"{_format_attribute_label(k)}: {v}")
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


def restock_material(
    db: Session, material_id: int, cantidad: float, tenant_id: int | None = None
) -> Material:
    material = get_material_by_id(db, material_id, tenant_id)
    material.quantity = material.quantity + cantidad
    db.commit()
    db.refresh(material)
    return material


def delete_material(
    db: Session, material_id: int, tenant_id: int | None = None
) -> None:
    material = get_material_by_id(db, material_id, tenant_id)
    db.delete(material)
    db.commit()


def parse_albaran_with_ia(
    db: Session, texto: str, tenant_id: int | None = None
) -> list[dict]:
    import json

    from mistralai import Mistral

    from backend.core.config import settings

    if not settings.mistral_api_key:
        raise ValueError("MISTRAL_API_KEY no configurada")

    materials = get_all_materials(db, tenant_id=tenant_id)
    if not materials:
        return []

    catalog = "\n".join(
        f"  ID {m.id}: {m.display_name or m.name} [unidad: {m.unit}]"
        for m in materials
    )

    prompt = f"""Analiza el siguiente albarán y extrae los materiales recibidos.

CATÁLOGO DE MATERIALES DEL TALLER:
{catalog}

TEXTO DEL ALBARÁN:
{texto}

TAREA:
- Identifica cada línea de producto en el albarán.
- Para cada una, busca el material del catálogo que mejor coincida por nombre, tipo o medida.
- Extrae la cantidad recibida. Si la unidad es diferente pero la conversión es obvia, conviértela.
- Solo incluye materiales que aparezcan claramente en el albarán.
- Indica la confianza: "alta" (coincidencia muy clara), "media" (probable), "baja" (dudoso).

RESPONDE ÚNICAMENTE con JSON puro, sin markdown, sin explicación:
[
  {{"material_id": <id_catalogo>, "name": "<nombre del catalogo>", "cantidad": <numero>, "linea_albaran": "<texto original de esa linea>", "confianza": "<alta|media|baja>"}}
]

Si no hay ninguna coincidencia, responde: []"""

    client = Mistral(api_key=settings.mistral_api_key)
    response = client.chat.complete(
        model="mistral-small-latest",
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.choices[0].message.content.strip()

    # Strip markdown fences if the model wraps the JSON
    if "```" in content:
        for part in content.split("```"):
            stripped = part.strip()
            if stripped.startswith("json"):
                stripped = stripped[4:].strip()
            if stripped.startswith("[") or stripped.startswith("{"):
                content = stripped
                break

    try:
        result = json.loads(content)
    except (json.JSONDecodeError, TypeError):
        raise ValueError("La IA no devolvió un formato reconocible. Inténtalo de nuevo.")

    valid_ids = {m.id for m in materials}
    return [
        r
        for r in result
        if isinstance(r, dict)
        and r.get("material_id") in valid_ids
        and float(r.get("cantidad", 0)) > 0
    ]


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
