from datetime import datetime
from itertools import product
from typing import Any, Optional

from pydantic import BaseModel, Field, model_validator

from .model import CATEGORIAS_VALIDAS


def _level(quantity: float, minimum: float) -> int:
    if minimum <= 0:
        return 100
    return max(0, min(100, int((quantity / minimum) * 100)))


def _tone(level: int) -> str:
    if level < 30:
        return "danger"
    if level < 70:
        return "warning"
    return "success"


# ─── Respuesta ────────────────────────────────────────────────────────────────


class StockItemResponse(BaseModel):
    id: int
    name: str
    category: Optional[str] = None
    display_name: Optional[str] = None
    specs: Optional[dict] = None
    supplier_code: Optional[str] = None
    quantity: float
    minimum: float
    unit: str
    created_at: datetime
    level: int = 0
    tone: str = "neutral"
    stock_label: str = ""
    minimum_label: str = ""

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_material(cls, m: object) -> "StockItemResponse":
        instance = cls.model_validate(m)
        instance.level = _level(instance.quantity, instance.minimum)
        instance.tone = _tone(instance.level)
        instance.stock_label = f"Stock: {instance.quantity:g} {instance.unit}"
        instance.minimum_label = f"Minimo: {instance.minimum:g} {instance.unit}"
        return instance


# ─── Crear material individual ────────────────────────────────────────────────


class CreateMaterialRequest(BaseModel):
    name: str = Field(min_length=1)
    category: Optional[str] = None
    display_name: Optional[str] = None
    specs: Optional[dict] = None
    supplier_code: Optional[str] = None
    quantity: float = Field(default=0, ge=0)
    minimum: float = Field(default=0, ge=0)
    unit: str = Field(default="ud", min_length=1)

    @model_validator(mode="after")
    def validar_categoria(self) -> "CreateMaterialRequest":
        if self.category and self.category not in CATEGORIAS_VALIDAS:
            raise ValueError(
                f"Categoría inválida. Válidas: {sorted(CATEGORIAS_VALIDAS)}"
            )
        return self


class UpdateMaterialRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    display_name: Optional[str] = None
    specs: Optional[dict] = None
    supplier_code: Optional[str] = None
    quantity: Optional[float] = Field(default=None, ge=0)
    minimum: Optional[float] = Field(default=None, ge=0)
    unit: Optional[str] = None

    @model_validator(mode="after")
    def validar_categoria(self) -> "UpdateMaterialRequest":
        if self.category and self.category not in CATEGORIAS_VALIDAS:
            raise ValueError(
                f"Categoría inválida. Válidas: {sorted(CATEGORIAS_VALIDAS)}"
            )
        return self


class ConsumeMaterialRequest(BaseModel):
    consumed: float = Field(gt=0)


# ─── Generador de variantes ───────────────────────────────────────────────────

MAX_VARIANTES = 500


class GenerarVariantesRequest(BaseModel):
    category: str
    attribute_values: dict[str, list[Any]] = Field(
        description="Atributos y sus posibles valores. Ej: {'metrica': ['M6','M8'], 'longitud_mm': [20,30]}"
    )
    unit: str = Field(default="ud")
    minimum: float = Field(default=0, ge=0)

    @model_validator(mode="after")
    def validar(self) -> "GenerarVariantesRequest":
        if self.category not in CATEGORIAS_VALIDAS:
            raise ValueError(
                f"Categoría inválida. Válidas: {sorted(CATEGORIAS_VALIDAS)}"
            )
        if not self.attribute_values:
            raise ValueError("Debes definir al menos un atributo con valores.")
        for attr, valores in self.attribute_values.items():
            if not valores:
                raise ValueError(f"El atributo '{attr}' no tiene valores.")

        # Calcular total y rechazar si supera el límite
        total = 1
        for valores in self.attribute_values.values():
            total *= len(valores)
        if total > MAX_VARIANTES:
            raise ValueError(
                f"Demasiadas variantes ({total}). Máximo {MAX_VARIANTES} por llamada. "
                "Divide en varias generaciones."
            )
        return self

    def calcular_combinaciones(self) -> list[dict]:
        claves = list(self.attribute_values.keys())
        valores = list(self.attribute_values.values())
        return [dict(zip(claves, combo)) for combo in product(*valores)]


class GenerarVariantesResponse(BaseModel):
    creadas: int
    omitidas: int  # ya existían con el mismo display_name
    materiales: list[StockItemResponse]
