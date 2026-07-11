from backend.features.admin.router import router as admin_router
from backend.features.alertas.router import router as alertas_router
from backend.features.pdf.router import router as pdf_router
from backend.features.auth.router import router as auth_router
from backend.features.billing.router import router as billing_router
from backend.features.dashboard.router import router as dashboard_router
from backend.features.equipos.router import router as equipos_router
from backend.features.fichaje.router import router as fichaje_router
from backend.features.fotos.router import router as fotos_router
from backend.features.historial.router import router as historial_router
from backend.features.ia.router import router as ia_router
from backend.features.jobs.router import router as jobs_router
from backend.features.nominas.router import router as nominas_router
from backend.features.registro_horas.router import router as registro_horas_router
from backend.features.rrhh.router import router as rrhh_router
from backend.features.stock.router import router as stock_router
from backend.features.seguimiento.router import router as seguimiento_router
from backend.features.superadmin.router import router as superadmin_router

ENABLED_ROUTERS = [
    admin_router,
    alertas_router,
    auth_router,
    billing_router,
    dashboard_router,
    equipos_router,
    fichaje_router,
    fotos_router,
    registro_horas_router,
    historial_router,
    ia_router,
    jobs_router,
    nominas_router,
    pdf_router,
    rrhh_router,
    seguimiento_router,
    stock_router,
    superadmin_router,
]
