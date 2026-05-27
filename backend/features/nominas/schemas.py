from datetime import datetime

from pydantic import BaseModel

MESES_ES = {
    1: "Enero", 2: "Febrero", 3: "Marzo", 4: "Abril",
    5: "Mayo", 6: "Junio", 7: "Julio", 8: "Agosto",
    9: "Septiembre", 10: "Octubre", 11: "Noviembre", 12: "Diciembre",
}


class NominaResponse(BaseModel):
    id: int
    operario_id: int
    operario_nombre: str
    year: int
    month: int
    month_label: str
    filename: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_nomina(cls, nomina) -> "NominaResponse":
        return cls(
            id=nomina.id,
            operario_id=nomina.operario_id,
            operario_nombre=nomina.operario.full_name if nomina.operario else "—",
            year=nomina.year,
            month=nomina.month,
            month_label=MESES_ES.get(nomina.month, str(nomina.month)),
            filename=nomina.filename,
            uploaded_at=nomina.uploaded_at,
        )
