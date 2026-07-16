"""
Fixtures compartidas de test.

Cada test recibe una base de datos SQLite en memoria, limpia y aislada:
- StaticPool → una sola conexión compartida (necesario para :memory: entre llamadas).
- Se importan todos los modelos vía bootstrap para que create_all cree todas las tablas.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import backend.core.bootstrap  # noqa: F401 — registra todos los modelos en Base.metadata
from backend.core.database import Base


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    TestSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=engine)
        engine.dispose()
