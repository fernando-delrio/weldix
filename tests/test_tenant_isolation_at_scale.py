"""
Aislamiento multi-tenant A ESCALA — no con 2 talleres, con varios de golpe.

Por qué esto existe además de test_tenant_isolation.py (que ya prueba
aislamiento con 2 tenants): un filtro roto tipo `tenant_id != X` en vez de
`tenant_id == X` puede colar datos de UN tenant ajeno sin que se note con
solo 2 talleres en la base de datos — con 9 talleres ajenos en la mesa,
cualquier fuga se vuelve imposible de no ver. Ver
saas-crud-completeness (saas-claude-toolkit) para la justificación completa.

Este archivo prueba específicamente lo que Fernando pidió no volver a ver
nunca: que los talleres se mezclen. No es una repetición de
test_tenant_isolation.py, es la misma garantía verificada con volumen
real en vez de con el caso mínimo.
"""
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from backend.core.database import Base, get_db
from backend.features.auth import service as auth_service
from backend.features.auth.router import router as auth_router
from backend.features.jobs.router import router as jobs_router

N_TENANTS = 10
JOBS_POR_TENANT = 6


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def many_tenants():
    """
    N talleres reales, cada uno con su admin y JOBS_POR_TENANT OTs reales.
    Devuelve una lista de dicts: [{"token": ..., "tenant": ..., "job_ids": [...]}]

    N_TENANTS=10 en vez de los 20-30 "ideales" del diseño de la skill: el
    hash de contraseña (pbkdf2_sha256) es deliberadamente lento, y este
    test corre en cada push — 10 talleres ya son suficientes para que un
    `!=` en vez de `==` sea imposible de no notar, sin disparar el tiempo
    de la suite.
    """
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    auth_service._login_state.clear()

    app = FastAPI()
    app.include_router(auth_router)
    app.include_router(jobs_router)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = TestingSession()
    try:
        for i in range(N_TENANTS):
            auth_service.create_workspace(
                db=db,
                nombre_taller=f"Taller {i:02d}",
                admin_email=f"admin@taller-{i:02d}.dev",
                admin_password="Admin1234!",
                admin_name=f"Admin {i:02d}",
            )
    finally:
        db.close()

    with TestClient(app) as client:
        talleres = []
        for i in range(N_TENANTS):
            token = client.post(
                "/auth/login",
                json={"email": f"admin@taller-{i:02d}.dev", "password": "Admin1234!"},
            ).json()["access_token"]

            job_ids = []
            for j in range(JOBS_POR_TENANT):
                res = client.post(
                    "/trabajos",
                    json={"titulo": f"OT {j} del taller {i:02d}", "cliente": "Cliente Test"},
                    headers=_auth(token),
                )
                assert res.status_code == 201
                job_ids.append(res.json()["id"])

            talleres.append({"token": token, "index": i, "job_ids": job_ids})

        yield client, talleres

    app.dependency_overrides.clear()
    auth_service._login_state.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


# ─── a) Aislamiento a escala: ni un id ajeno se cuela ──────────────────────


def test_listado_no_filtra_ningun_job_de_los_otros_9_talleres(many_tenants):
    client, talleres = many_tenants
    # Ni el primero ni el último — esas posiciones esconden bugs de límite
    objetivo = talleres[N_TENANTS // 2]

    ids_ajenos = {
        job_id
        for t in talleres
        if t["index"] != objetivo["index"]
        for job_id in t["job_ids"]
    }
    assert len(ids_ajenos) == (N_TENANTS - 1) * JOBS_POR_TENANT  # sanity check del propio test

    response = client.get("/trabajos", headers=_auth(objetivo["token"]))
    assert response.status_code == 200
    ids_recibidos = {j["id"] for j in response.json()}

    # Ni un solo id de otro taller se coló en el listado
    assert ids_recibidos.isdisjoint(ids_ajenos)
    # Y los suyos SÍ están todos — el aislamiento no es "no devuelve nada"
    assert set(objetivo["job_ids"]).issubset(ids_recibidos)


# ─── b) El id "vecino" (autoincrement consecutivo) tampoco se cuela ────────


def test_no_hay_fuga_con_el_taller_vecino_en_ids(many_tenants):
    """
    Con autoincrement, los ids del taller objetivo y el creado justo
    después son los más parecidos en valor — el caso donde un `<=`/`>=`
    mal puesto en vez de `==` se nota menos que con ids muy separados.
    """
    client, talleres = many_tenants
    objetivo = talleres[N_TENANTS // 2]
    vecino = talleres[N_TENANTS // 2 + 1]
    job_vecino_id = vecino["job_ids"][0]

    response = client.get(f"/trabajos/{job_vecino_id}", headers=_auth(objetivo["token"]))

    assert response.status_code == 404


# ─── c) El coste no escala con el tamaño TOTAL del sistema ─────────────────


def test_listado_no_hace_mas_queries_por_tener_9_talleres_mas(many_tenants):
    """
    El bug clásico de multi-tenant: un endpoint que trae de más y filtra
    en Python escala con el total de TODOS los tenants, no con el tuyo.
    Con eager loading correcto (ver jobs/service.py get_all_jobs,
    joinedload del operario), el número de queries es constante:
    1 para los jobs + 1 para el usuario autenticado, no más por tener
    9 talleres ajenos en la misma base de datos.
    """
    client, talleres = many_tenants
    objetivo = talleres[N_TENANTS // 2]

    queries = []
    # El motor está cerrado sobre el fixture; lo obtenemos de una sesión nueva
    # a través del propio override de get_db que usa la app de prueba.
    session_gen = client.app.dependency_overrides[get_db]()
    session = next(session_gen)
    bind = session.get_bind()
    session.close()

    def _contar(*args, **kwargs):
        queries.append(1)

    event.listen(bind, "after_cursor_execute", _contar)
    try:
        response = client.get("/trabajos", headers=_auth(objetivo["token"]))
    finally:
        event.remove(bind, "after_cursor_execute", _contar)

    assert response.status_code == 200
    # Generoso a propósito (login/auth puede sumar alguna query más), pero
    # muy lejos de "una query por job" o "una por taller" — eso sí dispararía
    # el conteo con 10 talleres x 6 jobs.
    assert len(queries) <= 5, f"Se esperaban pocas queries constantes, hubo {len(queries)}"
