from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _read(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8")


def test_ia_router_uses_context_provider_instead_of_feature_models():
    source = _read("backend/features/ia/router.py")

    assert "backend.features.jobs" not in source
    assert "backend.features.stock" not in source
    assert "backend.features.rrhh" not in source
    assert "build_ai_context" in source


def test_auth_does_not_own_demo_seed_models():
    source = _read("backend/features/auth/service.py")

    assert "backend.features.jobs.model" not in source
    assert "backend.features.stock.model" not in source
    assert "backend.features.equipos.model" not in source
    assert "seed_workspace_demo_data" in source


def test_backend_router_registration_is_centralized():
    source = _read("backend/main.py")

    assert "ENABLED_ROUTERS" in source
    assert "from backend.features.admin.router" not in source
    assert "from backend.features.jobs.router" not in source


def test_shared_frontend_ui_does_not_depend_on_dashboard_feature():
    frontend = ROOT / "frontend/src/modules"
    offenders = []
    forbidden = ("dashboard/components/PanelCard", "dashboard/lib/tones")

    for path in frontend.rglob("*.jsx"):
        source = path.read_text(encoding="utf-8")
        if any(pattern in source for pattern in forbidden):
            offenders.append(path.relative_to(ROOT).as_posix())
    for path in frontend.rglob("*.js"):
        source = path.read_text(encoding="utf-8")
        if any(pattern in source for pattern in forbidden):
            offenders.append(path.relative_to(ROOT).as_posix())

    assert offenders == []
