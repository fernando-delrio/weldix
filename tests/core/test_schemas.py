"""
Tests de UTCResponseModel — la base compartida que corrige el desfase horario.

Contexto del bug: SQLite no guarda zona horaria. Un datetime escrito como UTC
vuelve "naive" (sin tzinfo) al releerlo de la base de datos. Si Pydantic lo
serializa tal cual, el frontend lo interpreta como hora local del navegador
en vez de UTC — un fichaje a las 13:09 (hora España, verano) llegaba al
kiosko como "11:09".
"""
from datetime import date, datetime, timezone

from backend.core.schemas import UTCResponseModel
from backend.features.kiosko.schemas import FicharKioskoResponse


class _EjemploConDatetime(UTCResponseModel):
    creado_en: datetime
    nombre: str


def test_datetime_naive_se_etiqueta_como_utc():
    # ARRANGE — un datetime "naive", como el que devuelve SQLite al releer
    naive = datetime(2026, 8, 28, 11, 9, 57)

    # ACT
    instancia = _EjemploConDatetime(creado_en=naive, nombre="test")

    # ASSERT
    assert instancia.creado_en.tzinfo == timezone.utc
    assert instancia.creado_en.hour == 11


def test_datetime_ya_con_zona_no_se_toca():
    # ARRANGE — un datetime que YA lleva su propia zona (no UTC)
    con_zona = datetime(2026, 8, 28, 13, 9, 57, tzinfo=timezone(timezone.utc.utcoffset(None)))

    # ACT
    instancia = _EjemploConDatetime(creado_en=con_zona, nombre="test")

    # ASSERT — no se reemplaza la zona ya presente
    assert instancia.creado_en.tzinfo is not None
    assert instancia.creado_en.hour == 13


def test_campo_no_datetime_pasa_intacto():
    # ARRANGE / ACT
    instancia = _EjemploConDatetime(creado_en=datetime(2026, 1, 1), nombre="Taller García")

    # ASSERT — el validador wildcard no rompe campos que no son datetime
    assert instancia.nombre == "Taller García"


def test_fichar_kiosko_response_serializa_hora_como_utc():
    """Reproduce exactamente el bug reportado: fichaje a las 11:09:57 UTC
    naive debe salir en el JSON con sufijo Z (UTC), no sin zona."""
    # ARRANGE — dict crudo como lo devuelve kiosko_service.fichar_por_pin,
    # con `hora` naive (así vuelve de SQLite tras el commit)
    hora_naive = datetime(2026, 8, 28, 11, 9, 57)

    # ACT
    response = FicharKioskoResponse(
        operario="Test", accion="entrada", hora=hora_naive, horas=None
    )
    json_payload = response.model_dump_json()

    # ASSERT
    assert response.hora.tzinfo == timezone.utc
    assert '"hora":"2026-08-28T11:09:57Z"' in json_payload
