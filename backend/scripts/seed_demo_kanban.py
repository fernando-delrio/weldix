"""
Rellena el tablero Kanban de la demo con OTs en todas las columnas.

El seed principal (seed_demo_video) deja el tablero con pocas tarjetas
(pendiente 1, en_proceso 2). Para las capturas del README interesa ver el
flujo completo, así que este script añade OTs en 'control', 'listo' y
'entregado' — sin tocar las que ya existen.

Idempotente: si ORD-2026-004 ya existe, no hace nada.

Ejecutar desde la raíz del proyecto:
    python -m backend.scripts.seed_demo_kanban
"""
import backend.core.bootstrap  # noqa: F401 — registra todos los modelos en Base.metadata
from backend.core.database import SessionLocal
from backend.features.auth.model import Tenant, User
from backend.features.jobs.model import Job

TALLER = "Estructuras Metálicas del Norte"

# (code, titulo, cliente, estado, progreso, asignar_a_laura)
_EXTRA_JOBS = [
    ("ORD-2026-004", "Escalera metálica exterior", "Promociones Sil", "en_proceso", 60, True),
    ("ORD-2026-005", "Depósito acero 5000 L", "Lácteos del Órbigo", "control", 90, False),
    ("ORD-2026-006", "Verja perimetral 80 m", "Ayto. de Ponferrada", "control", 85, True),
    ("ORD-2026-007", "Marquesina aparcamiento", "Hotel Bierzo Plaza", "listo", 100, False),
    ("ORD-2026-008", "Pasarela peatonal", "Construcciones Vega", "listo", 100, True),
    ("ORD-2026-009", "Tolva de acero inox", "Harinas del Norte", "entregado", 100, False),
]


def run() -> None:
    db = SessionLocal()
    try:
        tenant = db.query(Tenant).filter(Tenant.nombre == TALLER).first()
        if not tenant:
            print(f"No existe el taller '{TALLER}'. Ejecuta antes seed_demo_video.")
            return

        if db.query(Job).filter(Job.tenant_id == tenant.id, Job.code == "ORD-2026-004").first():
            print("Las OTs extra ya existen. Nada que sembrar.")
            return

        laura = (
            db.query(User)
            .filter(User.tenant_id == tenant.id, User.email == "laura@estructurasnorte.com")
            .first()
        )
        laura_id = laura.id if laura else None

        jobs = [
            Job(
                tenant_id=tenant.id,
                code=code,
                titulo=titulo,
                cliente=cliente,
                estado=estado,
                progreso=progreso,
                operario_id=laura_id if asignar else None,
                is_demo=True,
            )
            for code, titulo, cliente, estado, progreso, asignar in _EXTRA_JOBS
        ]
        db.add_all(jobs)
        db.commit()

        print("[OK] Anadidas 6 OTs para llenar el tablero:")
        print("  en_proceso: ORD-2026-004 (Laura)")
        print("  control:    ORD-2026-005, ORD-2026-006 (Laura)")
        print("  listo:      ORD-2026-007, ORD-2026-008 (Laura)")
        print("  entregado:  ORD-2026-009")
    finally:
        db.close()


if __name__ == "__main__":
    run()
