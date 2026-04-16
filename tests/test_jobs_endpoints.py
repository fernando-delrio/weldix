# ─── Helpers ──────────────────────────────────────────────────────────────────


def _login(client, email: str, password: str):
    return client.post("/auth/login", json={"email": email, "password": password})


def _admin_token(client):
    login = _login(client, "admin@weldix.dev", "Admin1234!")
    return login.json()["access_token"]


def _create_worker(
    client, email: str = "worker@example.com", password: str = "Password123"
):
    token = _admin_token(client)
    res = client.post(
        "/auth/admin/signup",
        json={"email": email, "password": password, "full_name": "Test Worker"},
        headers={"Authorization": f"Bearer {token}"},
    )
    return res.json()["id"], token  # devuelve (worker_id, admin_token)


def _worker_token(
    client, email: str = "worker@example.com", password: str = "Password123"
):
    _create_worker(client, email, password)
    login = _login(client, email, password)
    return login.json()["access_token"]


def _create_job(
    client, token: str, titulo: str = "Soldadura acero", cliente: str = "Acme"
):
    return client.post(
        "/trabajos",
        json={"titulo": titulo, "cliente": cliente},
        headers={"Authorization": f"Bearer {token}"},
    )


# ─── Creación ─────────────────────────────────────────────────────────────────


def test_admin_can_create_job(jobs_client):
    """El admin puede crear un trabajo y se genera el código ORD- automáticamente."""
    token = _admin_token(jobs_client)

    res = _create_job(jobs_client, token)

    assert res.status_code == 201
    job = res.json()
    assert job["titulo"] == "Soldadura acero"
    assert job["cliente"] == "Acme"
    assert job["estado"] == "pendiente"
    assert job["code"].startswith("ORD-")


def test_operario_cannot_create_job(jobs_client):
    """Un operario no tiene permiso para crear trabajos — solo admin."""
    token = _worker_token(jobs_client)

    res = _create_job(jobs_client, token)

    assert res.status_code == 403


def test_create_job_generates_sequential_codes(jobs_client):
    """Dos trabajos creados seguidos tienen códigos ORD-YYYY-001 y ORD-YYYY-002."""
    token = _admin_token(jobs_client)

    first = _create_job(jobs_client, token, titulo="Trabajo 1")
    second = _create_job(jobs_client, token, titulo="Trabajo 2")

    assert first.status_code == 201
    assert second.status_code == 201
    # Los códigos son distintos
    assert first.json()["code"] != second.json()["code"]


# ─── Listado ──────────────────────────────────────────────────────────────────


def test_admin_sees_all_jobs(jobs_client):
    """El admin ve todos los trabajos del sistema."""
    token = _admin_token(jobs_client)
    _create_job(jobs_client, token, titulo="Job A")
    _create_job(jobs_client, token, titulo="Job B")

    res = jobs_client.get("/trabajos", headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 200
    assert len(res.json()) == 2


def test_operario_only_sees_own_jobs(jobs_client):
    """Un operario solo ve los trabajos asignados a él, no los de otros."""
    admin_token = _admin_token(jobs_client)

    # Crear operario y obtener su token + id
    worker_id, _ = _create_worker(jobs_client)
    worker_login = _login(jobs_client, "worker@example.com", "Password123")
    worker_token = worker_login.json()["access_token"]

    # Admin crea dos trabajos, uno asignado al operario y otro sin asignar
    jobs_client.post(
        "/trabajos",
        json={
            "titulo": "Job asignado",
            "cliente": "Cliente A",
            "operario_id": worker_id,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    _create_job(jobs_client, admin_token, titulo="Job de otro")

    res = jobs_client.get(
        "/trabajos", headers={"Authorization": f"Bearer {worker_token}"}
    )

    assert res.status_code == 200
    titles = [j["titulo"] for j in res.json()]
    assert "Job asignado" in titles
    assert "Job de otro" not in titles


# ─── Detalle ──────────────────────────────────────────────────────────────────


def test_get_job_by_id_returns_correct_job(jobs_client):
    """GET /trabajos/{id} devuelve el trabajo correcto."""
    token = _admin_token(jobs_client)
    created = _create_job(jobs_client, token, titulo="Corte láser")
    job_id = created.json()["id"]

    res = jobs_client.get(
        f"/trabajos/{job_id}", headers={"Authorization": f"Bearer {token}"}
    )

    assert res.status_code == 200
    assert res.json()["titulo"] == "Corte láser"


def test_get_job_nonexistent_returns_404(jobs_client):
    """GET /trabajos/9999 devuelve 404 si el trabajo no existe."""
    token = _admin_token(jobs_client)

    res = jobs_client.get(
        "/trabajos/9999", headers={"Authorization": f"Bearer {token}"}
    )

    assert res.status_code == 404


def test_operario_cannot_access_job_assigned_to_other(jobs_client):
    """Un operario no puede ver un trabajo asignado a otro operario."""
    admin_token = _admin_token(jobs_client)

    # Crear dos operarios
    worker_a_id, _ = _create_worker(jobs_client, email="worker_a@example.com")
    _create_worker(jobs_client, email="worker_b@example.com")
    worker_b_login = _login(jobs_client, "worker_b@example.com", "Password123")
    worker_b_token = worker_b_login.json()["access_token"]

    # Crear trabajo asignado al operario A
    job = jobs_client.post(
        "/trabajos",
        json={
            "titulo": "Job exclusivo",
            "cliente": "Cliente",
            "operario_id": worker_a_id,
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    job_id = job.json()["id"]

    # Operario B intenta leerlo
    res = jobs_client.get(
        f"/trabajos/{job_id}", headers={"Authorization": f"Bearer {worker_b_token}"}
    )

    assert res.status_code == 403


# ─── Cambio de estado ─────────────────────────────────────────────────────────


def test_admin_can_change_job_status(jobs_client):
    """El admin puede mover un trabajo de pendiente a en_proceso."""
    token = _admin_token(jobs_client)
    job_id = _create_job(jobs_client, token).json()["id"]

    res = jobs_client.patch(
        f"/trabajos/{job_id}/estado",
        json={"estado": "en_proceso", "progreso": 10},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 200
    assert res.json()["estado"] == "en_proceso"
    assert res.json()["progreso"] == 10


def test_starting_job_autoassigns_operario(jobs_client):
    """Cuando un operario inicia un trabajo sin asignar, queda asignado a él."""
    admin_token = _admin_token(jobs_client)
    worker_id, _ = _create_worker(jobs_client)
    worker_login = _login(jobs_client, "worker@example.com", "Password123")
    worker_token = worker_login.json()["access_token"]

    # Admin crea trabajo sin asignar
    job_id = _create_job(jobs_client, admin_token).json()["id"]

    # Operario lo inicia
    res = jobs_client.patch(
        f"/trabajos/{job_id}/estado",
        json={"estado": "en_proceso", "progreso": 0},
        headers={"Authorization": f"Bearer {worker_token}"},
    )

    assert res.status_code == 200
    assert res.json()["operario_id"] == worker_id


def test_operario_cannot_change_status_of_job_assigned_to_other(jobs_client):
    """Un operario no puede cambiar el estado de un trabajo asignado a otro."""
    admin_token = _admin_token(jobs_client)

    worker_a_id, _ = _create_worker(jobs_client, email="worker_a@example.com")
    _create_worker(jobs_client, email="worker_b@example.com")
    worker_b_login = _login(jobs_client, "worker_b@example.com", "Password123")
    worker_b_token = worker_b_login.json()["access_token"]

    # Trabajo asignado al operario A, ya en_proceso
    job = jobs_client.post(
        "/trabajos",
        json={"titulo": "Job de A", "cliente": "X", "operario_id": worker_a_id},
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    job_id = job.json()["id"]
    # Admin lo mueve a en_proceso para que tenga operario_id asignado
    jobs_client.patch(
        f"/trabajos/{job_id}/estado",
        json={"estado": "en_proceso", "progreso": 0},
        headers={"Authorization": f"Bearer {admin_token}"},
    )

    # Operario B intenta cambiar el estado
    res = jobs_client.patch(
        f"/trabajos/{job_id}/estado",
        json={"estado": "control", "progreso": 50},
        headers={"Authorization": f"Bearer {worker_b_token}"},
    )

    assert res.status_code == 403


def test_progreso_is_clamped_to_0_100(jobs_client):
    """El progreso se recorta al rango [0, 100] — Pydantic valida el rango."""
    token = _admin_token(jobs_client)
    job_id = _create_job(jobs_client, token).json()["id"]

    # Enviar progreso fuera de rango — Pydantic devuelve 422
    res = jobs_client.patch(
        f"/trabajos/{job_id}/estado",
        json={"estado": "en_proceso", "progreso": 150},
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 422


# ─── Búsqueda ─────────────────────────────────────────────────────────────────


def test_search_jobs_returns_matching_results(jobs_client):
    """La búsqueda rápida encuentra trabajos por título."""
    token = _admin_token(jobs_client)
    _create_job(jobs_client, token, titulo="Soldadura TIG", cliente="Acme")
    _create_job(jobs_client, token, titulo="Corte plasma", cliente="Beta")

    res = jobs_client.get(
        "/trabajos/buscar-rapido?q=TIG",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 200
    titles = [j["titulo"] for j in res.json()]
    assert "Soldadura TIG" in titles
    assert "Corte plasma" not in titles


# ─── Eliminación ──────────────────────────────────────────────────────────────


def test_admin_can_delete_job(jobs_client):
    """El admin puede borrar un trabajo — devuelve 204."""
    token = _admin_token(jobs_client)
    job_id = _create_job(jobs_client, token).json()["id"]

    res = jobs_client.delete(
        f"/trabajos/{job_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 204

    # Confirmar que ya no existe
    get_res = jobs_client.get(
        f"/trabajos/{job_id}", headers={"Authorization": f"Bearer {token}"}
    )
    assert get_res.status_code == 404


def test_operario_cannot_delete_job(jobs_client):
    """Un operario no puede borrar trabajos."""
    admin_token = _admin_token(jobs_client)
    job_id = _create_job(jobs_client, admin_token).json()["id"]

    worker_token = _worker_token(jobs_client)
    res = jobs_client.delete(
        f"/trabajos/{job_id}", headers={"Authorization": f"Bearer {worker_token}"}
    )

    assert res.status_code == 403
