from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from backend.features.auth.model import Tenant, User


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _tenant_status(tenant: Tenant) -> str:
    """Calcula el estado operativo del tenant para mostrar en el panel."""
    if tenant.subscription_status in ("active", "trialing"):
        return "paying"
    if tenant.trial_expires_at is None:
        return "active"
    trial_dt = tenant.trial_expires_at
    if trial_dt.tzinfo is None:
        trial_dt = trial_dt.replace(tzinfo=timezone.utc)
    return "trial" if _now() <= trial_dt else "expired"


def get_global_metrics(db: Session) -> dict:
    total = db.query(func.count(Tenant.id)).scalar()

    tenants = db.query(Tenant).all()
    counts = {"paying": 0, "trial": 0, "expired": 0, "active": 0}
    for t in tenants:
        counts[_tenant_status(t)] += 1

    total_users = db.query(func.count(User.id)).filter(User.tenant_id.isnot(None)).scalar()

    return {
        "total_workspaces": total,
        "paying": counts["paying"],
        "trial": counts["trial"],
        "expired": counts["expired"],
        "total_users": total_users,
    }


def list_workspaces(db: Session) -> list[dict]:
    tenants = db.query(Tenant).order_by(Tenant.created_at.desc()).all()

    result = []
    for t in tenants:
        user_count = (
            db.query(func.count(User.id)).filter(User.tenant_id == t.id).scalar()
        )
        trial_dt = t.trial_expires_at
        if trial_dt and trial_dt.tzinfo is None:
            trial_dt = trial_dt.replace(tzinfo=timezone.utc)

        days_left = None
        if trial_dt and _tenant_status(t) == "trial":
            days_left = max(0, (trial_dt - _now()).days)

        result.append(
            {
                "id": t.id,
                "nombre": t.nombre,
                "slug": t.slug,
                "plan": t.plan,
                "status": _tenant_status(t),
                "subscription_status": t.subscription_status,
                "trial_expires_at": trial_dt.isoformat() if trial_dt else None,
                "trial_days_left": days_left,
                "stripe_customer_id": t.stripe_customer_id,
                "user_count": user_count,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
        )
    return result
