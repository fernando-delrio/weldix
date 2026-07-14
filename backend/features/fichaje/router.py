from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session

from backend.core.database import get_db
from backend.features.auth.dependencies import (
    get_current_user,
    require_active_trial,
    require_role,
)
from backend.features.auth.model import User

from . import service
from .schemas import (
    BalanceHorasResponse,
    FichajeResponse,
    ForzarCierreRequest,
    ResumenExtrasResponse,
)

router = APIRouter(
    prefix="/fichajes",
    tags=["fichajes"],
    dependencies=[Depends(require_active_trial)],
)


@router.post("/iniciar", response_model=FichajeResponse, status_code=201)
def iniciar_jornada(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        fichaje = service.iniciar_jornada(
            db, current_user.id, tenant_id=current_user.tenant_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return FichajeResponse.from_orm_fichaje(fichaje)


@router.get("/export/csv")
def export_fichajes_csv(
    year: int = Query(default=date.today().year, ge=2020, le=2100),
    month: int = Query(default=date.today().month, ge=1, le=12),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    csv_content = service.build_fichajes_csv(
        db,
        tenant_id=current_user.tenant_id,
        year=year,
        month=month,
    )
    filename = f"fichajes-{year}-{month:02d}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/export/csv-rango")
def export_fichajes_csv_rango(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    csv_content = service.build_fichajes_csv_rango(
        db,
        tenant_id=current_user.tenant_id,
        desde=desde,
        hasta=hasta,
    )
    desde_str = str(desde) if desde else "inicio"
    hasta_str = str(hasta) if hasta else "hoy"
    filename = f"fichajes-{desde_str}-a-{hasta_str}.csv"
    return Response(
        content=csv_content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/admin/resumen-extras", response_model=list[ResumenExtrasResponse])
def resumen_extras(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return service.get_resumen_extras(
        db,
        tenant_id=current_user.tenant_id,
        desde=desde,
        hasta=hasta,
    )


@router.get("/admin/balance-horas", response_model=list[BalanceHorasResponse])
def balance_horas(
    desde: date | None = Query(default=None),
    hasta: date | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    return service.get_balance_horas(
        db,
        tenant_id=current_user.tenant_id,
        desde=desde,
        hasta=hasta,
    )


@router.post("/{fichaje_id}/finalizar", response_model=FichajeResponse)
def finalizar_jornada(
    fichaje_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        fichaje = service.finalizar_jornada(db, fichaje_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return FichajeResponse.from_orm_fichaje(fichaje)


@router.get("/activo", response_model=FichajeResponse | None)
def get_jornada_activa(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fichaje = service.get_jornada_activa(db, current_user.id)
    return FichajeResponse.from_orm_fichaje(fichaje) if fichaje else None


@router.get("/mis-jornadas", response_model=list[FichajeResponse])
def mis_jornadas(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    fichajes = service.get_fichajes_operario(
        db, current_user.id, tenant_id=current_user.tenant_id
    )
    return [FichajeResponse.from_orm_fichaje(f) for f in fichajes]


@router.get("", response_model=list[FichajeResponse])
def list_all_fichajes(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    fichajes = service.get_todos_los_fichajes(db, tenant_id=current_user.tenant_id)
    return [FichajeResponse.from_orm_fichaje(f) for f in fichajes]


@router.post("/{fichaje_id}/forzar-cierre", response_model=FichajeResponse)
def forzar_cierre(
    fichaje_id: int,
    body: ForzarCierreRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    try:
        fichaje = service.forzar_cierre_jornada(
            db, fichaje_id, body.horas_reales, tenant_id=current_user.tenant_id
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return FichajeResponse.from_orm_fichaje(fichaje)


@router.get("/operario/{operario_id}", response_model=list[FichajeResponse])
def fichajes_por_operario(
    operario_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("admin")),
):
    # tenant_id del admin: impide leer fichajes de un operario de otro taller
    fichajes = service.get_fichajes_operario(
        db, operario_id, tenant_id=current_user.tenant_id
    )
    return [FichajeResponse.from_orm_fichaje(f) for f in fichajes]
