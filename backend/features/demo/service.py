from typing import Any

from sqlalchemy.orm import Session

from backend.features.equipos.model import Equipo
from backend.features.jobs.model import Job
from backend.features.stock.model import Material

_DEMO_JOBS: list[dict[str, Any]] = [
    {
        "code": "ORD-DEMO-001",
        "titulo": "Estructura metalica (demo)",
        "cliente": "Cliente Ejemplo",
        "estado": "en_proceso",
        "progreso": 40,
    },
    {
        "code": "ORD-DEMO-002",
        "titulo": "Barandilla inox (demo)",
        "cliente": "Reformas Ejemplo",
        "estado": "pendiente",
        "progreso": 0,
    },
    {
        "code": "ORD-DEMO-003",
        "titulo": "Deposito 2000L (demo)",
        "cliente": "Agro Ejemplo",
        "estado": "listo",
        "progreso": 100,
    },
]

_DEMO_STOCK: list[dict[str, Any]] = [
    {
        "name": "Varilla soldadura 3.2mm (demo)",
        "quantity": 20,
        "minimum": 50,
        "unit": "ud",
    },
    {
        "name": "Chapa acero 3mm (demo)",
        "quantity": 15,
        "minimum": 10,
        "unit": "kg",
    },
]

_DEMO_EQUIPOS: list[dict[str, Any]] = [
    {
        "nombre": "Soldadora MIG (demo)",
        "tipo": "Soldadora",
        "estado": "operativo",
        "intervalo_dias": 90,
    },
]


def seed_workspace_demo_data(db: Session, tenant_id: int) -> None:
    for data in _DEMO_JOBS:
        db.add(Job(tenant_id=tenant_id, is_demo=True, **data))
    for data in _DEMO_STOCK:
        db.add(Material(tenant_id=tenant_id, is_demo=True, **data))
    for data in _DEMO_EQUIPOS:
        db.add(Equipo(tenant_id=tenant_id, is_demo=True, **data))
