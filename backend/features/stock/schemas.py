from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


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


class StockItemResponse(BaseModel):
    id: int
    name: str
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


class CreateMaterialRequest(BaseModel):
    name: str = Field(min_length=1)
    quantity: float = Field(default=0, ge=0)
    minimum: float = Field(default=0, ge=0)
    unit: str = Field(default="ud", min_length=1)


class UpdateMaterialRequest(BaseModel):
    name: Optional[str] = None
    quantity: Optional[float] = Field(default=None, ge=0)
    minimum: Optional[float] = Field(default=None, ge=0)
    unit: Optional[str] = None


class ConsumeMaterialRequest(BaseModel):
    consumed: float = Field(gt=0)
