"""
Tests HTTP del router de trabajos (OTs): creación, listado, búsqueda,
transición de estado, actualización parcial, compartir y borrado.

Usa `jobs_client` (admin sin tenant, admin@weldix.dev / Admin1234!) para los
casos CRUD y de autorización básicos, y `workspace_client` (un tenant real)
para los casos que requieren un operario del taller — auto-asignación al
iniciar un trabajo y el candado de "solo tu propio trabajo".

Aislamiento multi-tenant completo vive en test_jobs_isolation.py.
"""


def _auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    return _login(client, "admin@weldix.dev", "Admin1234!").json()["access_token"]


def _create_job(client, token: str, **overrides):
    payload = {"titulo": "Soldadura de bancada", "cliente": "Cliente Test"}
    payload.update(overrides)
    return client.post("/trabajos", json=payload, headers=_auth_header(token))


def _create_operario(client, admin_token: str, email: str, full_name: str = "Operario Test"):
    return client.post(
        "/auth/admin/signup",
        json={
            "email": email,
            "password": "Operario123!",
            "full_name": full_name,
            "role": "operario",
        },
        headers=_auth_header(admin_token),
    )


# ─── Creación — código autogenerado ───────────────────────────────────────────


def test_create_job_generates_code_with_ord_year_format(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT
    response = _create_job(jobs_client, token)

    # ASSERT
    assert response.status_code == 201
    code = response.json()["code"]
    assert code.startswith("ORD-")
    year_part, seq_part = code.removeprefix("ORD-").split("-")
    assert len(year_part) == 4
    assert len(seq_part) == 3


def test_create_job_generates_sequential_codes(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT
    first = _create_job(jobs_client, token).json()
    second = _create_job(jobs_client, token).json()

    # ASSERT
    first_seq = int(first["code"].split("-")[-1])
    second_seq = int(second["code"].split("-")[-1])
    assert second_seq == first_seq + 1


def test_create_job_requires_admin_role(jobs_client):
    # ARRANGE
    admin_token = _admin_token(jobs_client)
    operario_email = "operario1@weldix.dev"
    _create_operario(jobs_client, admin_token, operario_email)
    operario_token = _login(jobs_client, operario_email, "Operario123!").json()["access_token"]

    # ACT
    response = _create_job(jobs_client, operario_token)

    # ASSERT
    assert response.status_code == 403


def test_create_job_without_token_returns_401(jobs_client):
    # ACT — sin header Authorization
    response = jobs_client.post(
        "/trabajos", json={"titulo": "Soldadura", "cliente": "Cliente"}
    )

    # ASSERT
    assert response.status_code == 401


def test_create_job_without_titulo_returns_422(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT — CreateJobRequest exige titulo con min_length=1
    response = jobs_client.post(
        "/trabajos",
        json={"cliente": "Cliente Test"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 422


# ─── Listado ───────────────────────────────────────────────────────────────


def test_list_jobs_as_admin_returns_all_jobs(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    _create_job(jobs_client, token, titulo="Trabajo 1")
    _create_job(jobs_client, token, titulo="Trabajo 2")

    # ACT
    response = jobs_client.get("/trabajos", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()) == 2


def test_list_jobs_as_operario_returns_only_own_jobs(jobs_client):
    # ARRANGE — dos operarios, cada uno con un trabajo asignado
    admin_token = _admin_token(jobs_client)
    op_a = _create_operario(jobs_client, admin_token, "op-a@weldix.dev", "Op A").json()
    op_b = _create_operario(jobs_client, admin_token, "op-b@weldix.dev", "Op B").json()
    _create_job(jobs_client, admin_token, titulo="Para A", operario_id=op_a["id"])
    _create_job(jobs_client, admin_token, titulo="Para B", operario_id=op_b["id"])
    token_a = _login(jobs_client, "op-a@weldix.dev", "Operario123!").json()["access_token"]

    # ACT
    response = jobs_client.get("/trabajos", headers=_auth_header(token_a))

    # ASSERT
    assert response.status_code == 200
    jobs = response.json()
    assert len(jobs) == 1
    assert jobs[0]["titulo"] == "Para A"


# ─── Búsqueda global (Ctrl+K) — /buscar-rapido ────────────────────────────────


def test_search_quick_finds_job_by_partial_title(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    _create_job(jobs_client, token, titulo="Soldadura de bancada industrial")

    # ACT
    response = jobs_client.get(
        "/trabajos/buscar-rapido", params={"q": "bancada"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 200
    results = response.json()
    assert len(results) == 1
    assert "bancada" in results[0]["titulo"]


def test_search_quick_route_does_not_collide_with_job_id_route(jobs_client):
    """
    /trabajos/buscar-rapido debe registrarse ANTES que /trabajos/{job_id} en el
    router. Si el orden estuviera invertido, FastAPI intentaría parsear
    "buscar-rapido" como job_id:int y devolvería 422, no 200.
    """
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT
    response = jobs_client.get(
        "/trabajos/buscar-rapido", params={"q": "cualquier-cosa"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json() == []


def test_search_quick_as_operario_only_returns_own_jobs(jobs_client):
    # ARRANGE
    admin_token = _admin_token(jobs_client)
    op_a = _create_operario(jobs_client, admin_token, "op-a2@weldix.dev", "Op A2").json()
    _create_job(jobs_client, admin_token, titulo="Soldadura visible para todos")
    _create_job(
        jobs_client,
        admin_token,
        titulo="Soldadura de A2",
        operario_id=op_a["id"],
    )
    token_a = _login(jobs_client, "op-a2@weldix.dev", "Operario123!").json()["access_token"]

    # ACT
    response = jobs_client.get(
        "/trabajos/buscar-rapido", params={"q": "Soldadura"}, headers=_auth_header(token_a)
    )

    # ASSERT
    assert response.status_code == 200
    titles = [j["titulo"] for j in response.json()]
    assert titles == ["Soldadura de A2"]


# ─── Búsqueda por código OT — /buscar ─────────────────────────────────────────


def test_search_by_code_finds_exact_match(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    created = _create_job(jobs_client, token).json()

    # ACT
    response = jobs_client.get(
        "/trabajos/buscar", params={"code": created["code"]}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["id"] == created["id"]


def test_search_by_code_returns_404_when_not_found(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT
    response = jobs_client.get(
        "/trabajos/buscar", params={"code": "ORD-2026-999"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 404


def test_search_by_code_returns_404_when_job_already_started(jobs_client):
    """get_job_by_code está pensado para localizar una OT antes de iniciarla
    (kiosko). Si ya está en 'en_proceso', debe fallar como si no existiera."""
    # ARRANGE
    token = _admin_token(jobs_client)
    created = _create_job(jobs_client, token).json()
    jobs_client.patch(
        f"/trabajos/{created['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token),
    )

    # ACT
    response = jobs_client.get(
        "/trabajos/buscar", params={"code": created["code"]}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 404


# ─── Obtener uno — GET /{job_id} ──────────────────────────────────────────────


def test_get_job_by_id_returns_404_when_not_found(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT
    response = jobs_client.get("/trabajos/999999", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 404


def test_get_job_as_operario_not_assigned_to_it_returns_403(jobs_client):
    # ARRANGE
    admin_token = _admin_token(jobs_client)
    op_owner = _create_operario(jobs_client, admin_token, "owner@weldix.dev", "Owner").json()
    _create_operario(jobs_client, admin_token, "outsider@weldix.dev", "Outsider")
    job = _create_job(jobs_client, admin_token, operario_id=op_owner["id"]).json()
    outsider_token = _login(jobs_client, "outsider@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = jobs_client.get(f"/trabajos/{job['id']}", headers=_auth_header(outsider_token))

    # ASSERT
    assert response.status_code == 403


# ─── Cambio de estado — PATCH /{job_id}/estado ────────────────────────────────


def test_start_job_auto_assigns_operario(jobs_client):
    # ARRANGE — trabajo sin operario asignado todavía
    admin_token = _admin_token(jobs_client)
    op = _create_operario(jobs_client, admin_token, "starter@weldix.dev", "Starter").json()
    job = _create_job(jobs_client, admin_token).json()
    op_token = _login(jobs_client, "starter@weldix.dev", "Operario123!").json()["access_token"]

    # ACT
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(op_token),
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert body["estado"] == "en_proceso"
    assert body["operario_id"] == op["id"]


def test_change_estado_by_operario_not_owning_job_returns_403(jobs_client):
    # ARRANGE — job ya asignado a otro operario
    admin_token = _admin_token(jobs_client)
    owner = _create_operario(jobs_client, admin_token, "owner2@weldix.dev", "Owner2").json()
    _create_operario(jobs_client, admin_token, "meddler@weldix.dev", "Meddler")
    job = _create_job(jobs_client, admin_token, operario_id=owner["id"]).json()
    meddler_token = _login(jobs_client, "meddler@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(meddler_token),
    )

    # ASSERT
    assert response.status_code == 403


def test_change_estado_of_nonexistent_job_returns_404(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT
    response = jobs_client.patch(
        "/trabajos/999999/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 404


def test_change_estado_progreso_is_optional_and_keeps_previous_value(jobs_client):
    """Un simple arrastre en el Kanban no manda progreso; no debe resetearse a 0."""
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token, progreso=40).json()

    # ACT — sin `progreso` en el body
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["progreso"] == 40


# ─── Actualización parcial — PATCH /{job_id} ──────────────────────────────────


def test_update_job_partial_changes_only_sent_fields(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token, titulo="Original", cliente="Cliente Original").json()

    # ACT
    response = jobs_client.patch(
        f"/trabajos/{job['id']}",
        json={"titulo": "Nuevo título"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert body["titulo"] == "Nuevo título"
    assert body["cliente"] == "Cliente Original"


def test_update_job_requires_admin_role(jobs_client):
    # ARRANGE
    admin_token = _admin_token(jobs_client)
    _create_operario(jobs_client, admin_token, "updater@weldix.dev", "Updater")
    job = _create_job(jobs_client, admin_token).json()
    operario_token = _login(jobs_client, "updater@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = jobs_client.patch(
        f"/trabajos/{job['id']}",
        json={"titulo": "Intento no autorizado"},
        headers=_auth_header(operario_token),
    )

    # ASSERT
    assert response.status_code == 403


def test_update_job_returns_404_when_not_found(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT
    response = jobs_client.patch(
        "/trabajos/999999", json={"titulo": "X"}, headers=_auth_header(token)
    )

    # ASSERT
    assert response.status_code == 404


# ─── Compartir — POST /{job_id}/compartir ─────────────────────────────────────


def test_share_job_returns_public_token(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token).json()

    # ACT
    response = jobs_client.post(f"/trabajos/{job['id']}/compartir", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 200
    assert len(response.json()["token"]) > 0


def test_share_job_token_is_stable_across_calls(jobs_client):
    """El token público se genera una vez y se reutiliza — no cambia en cada llamada."""
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token).json()

    # ACT
    first = jobs_client.post(f"/trabajos/{job['id']}/compartir", headers=_auth_header(token))
    second = jobs_client.post(f"/trabajos/{job['id']}/compartir", headers=_auth_header(token))

    # ASSERT
    assert first.json()["token"] == second.json()["token"]


def test_share_job_requires_admin_role(jobs_client):
    # ARRANGE
    admin_token = _admin_token(jobs_client)
    _create_operario(jobs_client, admin_token, "sharer@weldix.dev", "Sharer")
    job = _create_job(jobs_client, admin_token).json()
    operario_token = _login(jobs_client, "sharer@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = jobs_client.post(
        f"/trabajos/{job['id']}/compartir", headers=_auth_header(operario_token)
    )

    # ASSERT
    assert response.status_code == 403


# ─── Borrado — DELETE /{job_id} ───────────────────────────────────────────────


def test_delete_job_removes_it(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token).json()

    # ACT
    delete_response = jobs_client.delete(f"/trabajos/{job['id']}", headers=_auth_header(token))
    get_response = jobs_client.get(f"/trabajos/{job['id']}", headers=_auth_header(token))

    # ASSERT
    assert delete_response.status_code == 204
    assert get_response.status_code == 404


def test_delete_job_requires_admin_role(jobs_client):
    # ARRANGE
    admin_token = _admin_token(jobs_client)
    _create_operario(jobs_client, admin_token, "deleter@weldix.dev", "Deleter")
    job = _create_job(jobs_client, admin_token).json()
    operario_token = _login(jobs_client, "deleter@weldix.dev", "Operario123!").json()[
        "access_token"
    ]

    # ACT
    response = jobs_client.delete(f"/trabajos/{job['id']}", headers=_auth_header(operario_token))

    # ASSERT
    assert response.status_code == 403


def test_delete_nonexistent_job_returns_404(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)

    # ACT
    response = jobs_client.delete("/trabajos/999999", headers=_auth_header(token))

    # ASSERT
    assert response.status_code == 404


# ─── Transición de estado — invariante de negocio ────────────────────────────
# Documentado en CLAUDE.md sección 13.6: "un trabajo en 'entregado' no puede
# volver a un estado anterior". backend/features/jobs/service.py update_estado()
# valida esto con `_NEXT_ESTADO` (Strategy Pattern, mismo criterio que
# frontend/statusConfig.js) — cualquier transición que no sea la siguiente de
# la cadena lanza ValueError, que este router traduce a 404 (igual que el resto
# de ValueError de este endpoint, p.ej. "trabajo no encontrado").


def test_job_in_entregado_cannot_go_back_to_pendiente(jobs_client):
    # ARRANGE — trabajo llevado hasta el estado final 'entregado'
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token).json()
    for estado in ("en_proceso", "control", "listo", "entregado"):
        jobs_client.patch(
            f"/trabajos/{job['id']}/estado",
            json={"estado": estado},
            headers=_auth_header(token),
        )

    # ACT — intento de retroceder desde el estado final
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "pendiente"},
        headers=_auth_header(token),
    )

    # ASSERT — el negocio rechaza la transición inválida
    assert response.status_code == 404
    assert "no se puede cambiar" in response.json()["detail"].lower()


def test_job_cannot_skip_states_forward(jobs_client):
    """La cadena de estados no permite saltarse etapas (p.ej. pendiente -> listo)."""
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token).json()

    # ACT — se intenta saltar directamente a 'listo' sin pasar por en_proceso/control
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "listo"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 404


def test_job_valid_forward_transition_still_works(jobs_client):
    """La validación de transiciones no rompe el camino feliz: avanzar un paso sigue funcionando."""
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token).json()

    # ACT — pendiente -> en_proceso es la única transición válida desde 'pendiente'
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["estado"] == "en_proceso"


# ─── Control de calidad — control -> listo solo lo aprueba un admin ───────────
# El operario que hizo el trabajo entrega a 'control'; a partir de ahí, solo un
# admin/encargado puede darlo por bueno ('listo') o devolverlo. Sin este guard,
# el propio operario podía autoaprobarse — ver ERRORES_APRENDIDOS.md.


def test_operario_cannot_approve_own_job_from_control_to_listo(jobs_client):
    # ARRANGE — el operario lleva su propio trabajo hasta 'control'
    admin_token = _admin_token(jobs_client)
    _create_operario(jobs_client, admin_token, "qc@weldix.dev", "Operario QC")
    operario_token = _login(jobs_client, "qc@weldix.dev", "Operario123!").json()[
        "access_token"
    ]
    job = _create_job(jobs_client, admin_token).json()
    jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(operario_token),
    )
    jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "control"},
        headers=_auth_header(operario_token),
    )

    # ACT — el mismo operario intenta aprobarse a sí mismo
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "listo"},
        headers=_auth_header(operario_token),
    )

    # ASSERT
    assert response.status_code == 403


def test_admin_can_approve_job_from_control_to_listo(jobs_client):
    # ARRANGE — un trabajo ya en 'control'
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token).json()
    jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token),
    )
    jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "control"},
        headers=_auth_header(token),
    )

    # ACT — el admin lo aprueba
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "listo"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    assert response.json()["estado"] == "listo"


# ─── Rechazo — POST /{job_id}/rechazar ────────────────────────────────────────


def _job_in_control(client, admin_token):
    job = _create_job(client, admin_token).json()
    client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(admin_token),
    )
    client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "control"},
        headers=_auth_header(admin_token),
    )
    return job


def test_admin_can_reject_job_from_control_to_pendiente(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _job_in_control(jobs_client, token)

    # ACT
    response = jobs_client.post(
        f"/trabajos/{job['id']}/rechazar",
        json={"motivo": "Falta terminar el cordón de soldadura"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert body["estado"] == "pendiente"
    assert body["urgente"] is True
    assert body["motivo_rechazo"] == "Falta terminar el cordón de soldadura"


def test_reject_job_without_motivo_returns_422(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _job_in_control(jobs_client, token)

    # ACT
    response = jobs_client.post(
        f"/trabajos/{job['id']}/rechazar",
        json={"motivo": ""},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 422


def test_reject_job_not_in_control_returns_404(jobs_client):
    """Solo se puede rechazar un trabajo que está en 'control' — uno recién
    creado (en 'pendiente') no puede rechazarse."""
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _create_job(jobs_client, token).json()

    # ACT
    response = jobs_client.post(
        f"/trabajos/{job['id']}/rechazar",
        json={"motivo": "Motivo cualquiera"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 404


def test_operario_cannot_reject_job(jobs_client):
    # ARRANGE
    admin_token = _admin_token(jobs_client)
    _create_operario(jobs_client, admin_token, "rejecter@weldix.dev", "Rejecter")
    operario_token = _login(jobs_client, "rejecter@weldix.dev", "Operario123!").json()[
        "access_token"
    ]
    job = _job_in_control(jobs_client, admin_token)

    # ACT
    response = jobs_client.post(
        f"/trabajos/{job['id']}/rechazar",
        json={"motivo": "Intento no autorizado"},
        headers=_auth_header(operario_token),
    )

    # ASSERT
    assert response.status_code == 403


def test_reject_job_logs_historial_event(jobs_client):
    # ARRANGE
    token = _admin_token(jobs_client)
    job = _job_in_control(jobs_client, token)

    # ACT
    jobs_client.post(
        f"/trabajos/{job['id']}/rechazar",
        json={"motivo": "Falta pulir la soldadura"},
        headers=_auth_header(token),
    )
    historial = jobs_client.get(
        f"/trabajos/{job['id']}/historial", headers=_auth_header(token)
    ).json()

    # ASSERT
    assert any(
        e["tipo"] == "trabajo_rechazado" and "Falta pulir" in e["descripcion"]
        for e in historial
    )


def test_restarting_job_clears_urgente_and_motivo(jobs_client):
    """El aviso de urgente es para 'hay que retomar esto ya', no un
    registro permanente — eso ya vive en el historial."""
    # ARRANGE — un trabajo rechazado, ahora 'pendiente' y urgente
    token = _admin_token(jobs_client)
    job = _job_in_control(jobs_client, token)
    jobs_client.post(
        f"/trabajos/{job['id']}/rechazar",
        json={"motivo": "Necesita retoque"},
        headers=_auth_header(token),
    )

    # ACT — se retoma el trabajo
    response = jobs_client.patch(
        f"/trabajos/{job['id']}/estado",
        json={"estado": "en_proceso"},
        headers=_auth_header(token),
    )

    # ASSERT
    assert response.status_code == 200
    body = response.json()
    assert body["urgente"] is False
    assert body["motivo_rechazo"] is None
