from sqlalchemy.orm import Session

from backend.features.equipos.model import Equipo
from backend.features.jobs.model import Job
from backend.features.stock.model import Material


def clear_demo_data(db: Session, tenant_id: int) -> dict:
    deleted_jobs = (
        db.query(Job)
        .filter(Job.tenant_id == tenant_id, Job.is_demo.is_(True))
        .delete(synchronize_session=False)
    )
    deleted_stock = (
        db.query(Material)
        .filter(Material.tenant_id == tenant_id, Material.is_demo.is_(True))
        .delete(synchronize_session=False)
    )
    deleted_equipos = (
        db.query(Equipo)
        .filter(Equipo.tenant_id == tenant_id, Equipo.is_demo.is_(True))
        .delete(synchronize_session=False)
    )
    db.commit()
    return {
        "deleted": {
            "jobs": deleted_jobs,
            "stock": deleted_stock,
            "equipos": deleted_equipos,
        }
    }
