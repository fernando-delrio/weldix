"""
Fixture de fotos: redirige el almacenamiento físico a un directorio temporal
de pytest (tmp_path) para no ensuciar backend/media en cada corrida.

`MEDIA_DIR` en backend/features/fotos/service.py es una constante de módulo
calculada al importar (`Path(settings.media_base_dir) / "fotos"`), así que
parchear `settings.media_base_dir` después de importar no tendría efecto —
hay que monkeypatchear el propio atributo del módulo `service.MEDIA_DIR`.

Los tests de fotos usan `two_tenants_client` (tests/conftest.py raíz), que ya
monta auth + jobs + fotos con dos tenants reales.
"""
import pytest

import backend.features.fotos.service as fotos_service


@pytest.fixture(autouse=True)
def _redirect_media_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(fotos_service, "MEDIA_DIR", tmp_path / "fotos")
    yield
