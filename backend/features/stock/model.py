from sqlalchemy import JSON, Boolean, Column, DateTime, Float, ForeignKey, Integer, String, func

from backend.core.database import Base

CATEGORIAS_VALIDAS = {
    "perfil",
    "chapa",
    "soldadura",
    "tornilleria",
    "epi",
    "consumible",
}


class Material(Base):
    __tablename__ = "stock"

    id = Column(Integer, primary_key=True, index=True)
    tenant_id = Column(Integer, ForeignKey("tenants.id"), nullable=True, index=True)

    # v1 — nombre libre (se mantiene para compatibilidad)
    name = Column(String(255), nullable=False)

    # v2 — estructura por categoría
    category = Column(
        String(50), nullable=True
    )  # perfil | chapa | soldadura | tornilleria | epi | consumible
    display_name = Column(
        String(255), nullable=True
    )  # auto-generado desde category + specs
    specs = Column(JSON, nullable=True)  # {"ancho": 40, "alto": 20, "grosor": 2}
    supplier_code = Column(
        String(100), nullable=True
    )  # código proveedor para escaneo futuro

    quantity = Column(Float, nullable=False, default=0)
    minimum = Column(Float, nullable=False, default=0)
    unit = Column(String(20), nullable=False, default="ud")
    is_demo = Column(Boolean, nullable=False, default=False)
    created_at = Column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
