"""
Seed de escenario para grabar la DEMO EN VÍDEO del asistente IA.

Crea un taller "Estructuras Metálicas del Norte" con datos pensados para que las
4 preguntas de la demo salgan redondas:
- Jefe (admin) y operaria Laura, con 20 días de vacaciones disponibles.
- Un material por debajo del mínimo → "¿qué materiales están bajo mínimo?".
- Órdenes de trabajo (2 en proceso, una de Laura) → "¿cuántas OTs hay en proceso?".
- Un equipo con el mantenimiento vencido → "¿algún equipo con la revisión vencida?".

Idempotente: si el taller ya existe, no hace nada (puedes ejecutarlo sin miedo).

Ejecutar desde la raíz del proyecto:
    python -m backend.scripts.seed_demo_video
"""
from datetime import date, datetime, timedelta, timezone

import backend.core.bootstrap  # noqa: F401 — registra todos los modelos en Base.metadata
from backend.core.database import Base, SessionLocal, engine
from backend.core.security import hash_password
from backend.features.auth.model import Tenant, User
from backend.features.auth.service import generate_unique_pin
from backend.features.equipos.model import Equipo
from backend.features.jobs.model import Job
from backend.features.rrhh.model import ConfiguracionLaboral, SolicitudAusencia
from backend.features.rrhh.service import get_saldo_vacaciones
from backend.features.stock.model import Material

TALLER = "Estructuras Metálicas del Norte"


def run() -> None:
    # Asegura que las tablas existen (idempotente).
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        if db.query(Tenant).filter(Tenant.nombre == TALLER).first():
            print(f"El taller '{TALLER}' ya existe. Nada que sembrar.")
            return

        year = date.today().year

        tenant = Tenant(
            nombre=TALLER,
            slug="estructuras-norte",
            plan="trial",
            trial_expires_at=datetime.now(timezone.utc) + timedelta(days=365),
        )
        db.add(tenant)
        db.flush()

        jefe = User(
            tenant_id=tenant.id,
            email="jefe@estructurasnorte.com",
            full_name="Carlos (Jefe de taller)",
            role="admin",
            password_hash=hash_password("jefe1234"),
            pin=generate_unique_pin(db, tenant.id),
            onboarding_done=True,
        )
        laura = User(
            tenant_id=tenant.id,
            email="laura@estructurasnorte.com",
            full_name="Laura Canton",
            role="operario",
            worker_number=1,
            password_hash=hash_password("laura1234"),
            pin=generate_unique_pin(db, tenant.id),
            onboarding_done=True,
        )
        db.add_all([jefe, laura])
        db.flush()

        # Config laboral de Laura → 22 días de vacaciones al año.
        db.add(
            ConfiguracionLaboral(
                tenant_id=tenant.id,
                operario_id=laura.id,
                dias_vacaciones_anuales=22,
                horas_jornada=8.0,
                dias_laborables="LMXJV",
                turno="manana",
            )
        )

        # 2 días de vacaciones ya aprobados → quedan 20 disponibles (demo).
        db.add(
            SolicitudAusencia(
                tenant_id=tenant.id,
                operario_id=laura.id,
                tipo="vacaciones",
                fecha_inicio=date(year, 3, 10),
                fecha_fin=date(year, 3, 11),
                dias_solicitados=2,
                estado="aprobada",
            )
        )

        # Stock: el electrodo está BAJO MÍNIMO (5 < 20), el resto ok.
        db.add_all(
            [
                Material(tenant_id=tenant.id, name="Electrodo básico 3.2mm", quantity=5, minimum=20, unit="kg"),
                Material(tenant_id=tenant.id, name="Chapa acero S275 3mm", quantity=120, minimum=40, unit="kg"),
                Material(tenant_id=tenant.id, name="Disco de corte 230mm", quantity=30, minimum=25, unit="ud"),
            ]
        )

        # Órdenes de trabajo: 2 en proceso (una de Laura), 1 pendiente.
        db.add_all(
            [
                Job(tenant_id=tenant.id, code="ORD-2026-001", titulo="Barandilla inox planta 2", cliente="Construcciones Vega", estado="en_proceso", progreso=45, operario_id=laura.id),
                Job(tenant_id=tenant.id, code="ORD-2026-002", titulo="Estructura nave 400 m2", cliente="Agrícola del Bierzo", estado="en_proceso", progreso=20),
                Job(tenant_id=tenant.id, code="ORD-2026-003", titulo="Portón corredero", cliente="Naves García", estado="pendiente", progreso=0),
            ]
        )

        # Equipo con el mantenimiento VENCIDO (hace 120 días, intervalo 90).
        db.add(
            Equipo(
                tenant_id=tenant.id,
                nombre="Soldadora MIG Kemppi",
                tipo="Soldadora",
                estado="operativo",
                intervalo_dias=90,
                ultimo_mantenimiento=date.today() - timedelta(days=120),
            )
        )

        db.commit()

        saldo = get_saldo_vacaciones(db, tenant.id, laura.id, year)
        # Prints en ASCII: la consola de Windows (cp1252) no encodea simbolos como el check.
        print("[OK] Taller de demo creado:", TALLER)
        print("  Jefe :  jefe@estructurasnorte.com  /  jefe1234")
        print("  Laura:  laura@estructurasnorte.com /  laura1234")
        print(f"  Vacaciones de Laura: {saldo.dias_disponibles} disponibles de {saldo.dias_totales}")
        print("  Stock bajo minimo: Electrodo basico 3.2mm (5/20)")
        print("  OTs en proceso: 2 (ORD-2026-001 de Laura, ORD-2026-002)")
        print("  Equipo con mantenimiento vencido: Soldadora MIG Kemppi")
    finally:
        db.close()


if __name__ == "__main__":
    run()
