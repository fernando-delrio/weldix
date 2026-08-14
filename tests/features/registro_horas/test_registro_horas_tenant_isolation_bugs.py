"""
Regresión de las fugas de aislamiento multi-tenant que existían en
backend/features/registro_horas/ y que ya se han corregido (ver
ERRORES_APRENDIDOS.md para el detalle de cada fix).

Cada test aquí reproduce EXACTAMENTE el escenario del bug original y ahora
verifica el comportamiento correcto en verde. Si alguno de estos tests
volviera a fallar, significaría que alguien reintrodujo la fuga de
aislamiento correspondiente. Sigue el mismo patrón que
tests/features/rrhh/test_rrhh_tenant_isolation_bugs.py.

Bugs corregidos (backend/features/registro_horas/):

1. `finalizar_registro` (service.py): NUNCA fue explotable — no se tocó.
   `registro.operario_id != operario_id` ya bloqueaba el cruce entre
   talleres porque los ids de usuario son globales y únicos en toda la
   tabla `users`. Se documenta aquí como regresión de seguridad, no como
   fix.

2. `get_resumen_horas_ot` (service.py) y `horas_ot` (router.py): ahora
   `get_resumen_horas_ot` recibe `tenant_id` y valida que la OT pertenezca
   a ese tenant antes de calcular nada — si no, lanza `JobNotFoundError`
   (subclase de `ValueError`) que el router mapea a 404. Antes, cualquier
   usuario autenticado de OTRO taller podía leer el resumen de horas de
   una OT ajena solo conociendo su job_id.

3. `iniciar_registro` (service.py): ahora recibe `tenant_id` y valida que
   el `job_id` recibido exista y pertenezca a ese tenant antes de crear el
   registro — mismo `JobNotFoundError` → 404. Antes, un operario de otro
   taller podía abrir un registro de horas sobre una OT ajena.
"""


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _iniciar_jornada(ctx, token: str) -> None:
    ctx["client"].post("/fichajes/iniciar", headers=_auth(token))


def _iniciar_registro(ctx, token: str, job_id: int):
    return ctx["client"].post(
        "/registro-horas/iniciar", json={"job_id": job_id}, headers=_auth(token)
    )


# ─── 1 — finalizar: bloqueado por construcción (ids globales) ───────────────


def test_finalizar_registro_de_otro_tenant_es_bloqueado(registro_horas_client):
    """El admin del Taller B no puede cerrar el registro del operario A
    porque su propio id (el del admin B, tomado del JWT) nunca coincide con
    `operario_id` del registro de A."""
    # ARRANGE — operario A abre un registro de horas en su propia OT
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_a"])
    registro_a = _iniciar_registro(ctx, ctx["token_op_a"], ctx["job_a_id"]).json()

    # ACT — el admin del Taller B intenta finalizarlo conociendo su id
    response = ctx["client"].post(
        f"/registro-horas/{registro_a['id']}/finalizar",
        headers=_auth(ctx["token_admin_b"]),
    )

    # ASSERT
    assert response.status_code == 403

    # Confirma el efecto de lado: el registro de A sigue abierto
    activo_a = ctx["client"].get(
        "/registro-horas/activo", headers=_auth(ctx["token_op_a"])
    ).json()
    assert activo_a is not None
    assert activo_a["fin"] is None


# ─── 2 — GET /trabajos/{job_id}/horas ya no cruza tenants ──────────────────


def test_horas_ot_de_otro_tenant_devuelve_404(registro_horas_client):
    # ARRANGE — el Taller A registra horas reales en su propia OT
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_a"])
    registro_a = _iniciar_registro(ctx, ctx["token_op_a"], ctx["job_a_id"]).json()
    ctx["client"].post(
        f"/registro-horas/{registro_a['id']}/finalizar",
        headers=_auth(ctx["token_op_a"]),
    )

    # ACT — el operario del Taller B pide el resumen de horas de la OT de A
    response = ctx["client"].get(
        f"/trabajos/{ctx['job_a_id']}/horas", headers=_auth(ctx["token_op_b"])
    )

    # ASSERT
    assert response.status_code == 404


def test_horas_ot_propia_sigue_visible_para_el_tenant_dueno(registro_horas_client):
    """Regresión positiva: el fix de aislamiento no rompe el acceso legítimo
    del propio taller a su resumen de horas."""
    # ARRANGE
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_a"])
    registro_a = _iniciar_registro(ctx, ctx["token_op_a"], ctx["job_a_id"]).json()
    ctx["client"].post(
        f"/registro-horas/{registro_a['id']}/finalizar",
        headers=_auth(ctx["token_op_a"]),
    )

    # ACT
    response = ctx["client"].get(
        f"/trabajos/{ctx['job_a_id']}/horas", headers=_auth(ctx["token_admin_a"])
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["job_id"] == ctx["job_a_id"]


# ─── 3 — iniciar registro sobre job de otro tenant ya no es posible ────────


def test_iniciar_registro_en_job_de_otro_tenant_devuelve_404(registro_horas_client):
    # ARRANGE — operario del Taller B, con jornada abierta, apunta al job de A
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_b"])

    # ACT
    response = _iniciar_registro(ctx, ctx["token_op_b"], ctx["job_a_id"])

    # ASSERT
    assert response.status_code == 404

    # Confirma el efecto de lado: no se creó ningún registro para B
    activo_b = ctx["client"].get(
        "/registro-horas/activo", headers=_auth(ctx["token_op_b"])
    ).json()
    assert activo_b is None


def test_iniciar_registro_en_job_propio_sigue_funcionando(registro_horas_client):
    """Regresión positiva: el fix no rompe el flujo legítimo del propio
    taller al iniciar un registro sobre su propia OT."""
    # ARRANGE
    ctx = registro_horas_client
    _iniciar_jornada(ctx, ctx["token_op_a"])

    # ACT
    response = _iniciar_registro(ctx, ctx["token_op_a"], ctx["job_a_id"])

    # ASSERT
    assert response.status_code == 201
    assert response.json()["job_id"] == ctx["job_a_id"]
