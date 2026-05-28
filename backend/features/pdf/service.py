"""
Generación de PDF del parte de trabajo con fpdf2 (Python puro, sin dependencias de sistema).

Estructura del documento A4:
  1. Cabecera: marca Weldix + nombre del taller / tipo de documento + fecha y ref
  2. Bloque del trabajo: código, título, cliente, badge de estado, progreso
  3. Grid de información: operario, fecha inicio, fecha creación
  4. Descripción (si existe)
  5. Tabla de horas imputadas con total
  6. Tabla del historial de estados
  7. Pie de firmas: operario + responsable/cliente
"""

from datetime import datetime, timezone

from fpdf import FPDF
from sqlalchemy.orm import Session

from backend.features.auth.model import Tenant, User
from backend.features.historial.model import JobEvent
from backend.features.jobs.model import Job
from backend.features.registro_horas.model import RegistroHoras

# ── Paleta de colores ──────────────────────────────────────────────────────────

_C_DARK = (15, 23, 42)       # slate-900  — cabecera y texto principal
_C_SLATE = (71, 85, 105)     # slate-600  — texto secundario
_C_MUTED = (148, 163, 184)   # slate-400  — etiquetas y pie
_C_BORDER = (226, 232, 240)  # slate-200  — líneas
_C_BG = (248, 250, 252)      # slate-50   — fondos de sección
_C_WHITE = (255, 255, 255)

_STATUS_COLORS = {
    "pendiente":  ((254, 243, 199), (146, 64, 14)),    # amber bg / text
    "en_proceso": ((224, 242, 254), (7, 89, 133)),     # sky bg / text
    "control":    ((237, 233, 254), (91, 33, 182)),    # violet bg / text
    "listo":      ((209, 250, 229), (6, 95, 70)),      # emerald bg / text
    "entregado":  ((241, 245, 249), (71, 85, 105)),    # slate bg / text
}

_ESTADO_LABELS = {
    "pendiente": "Pendiente",
    "en_proceso": "En proceso",
    "control": "Control",
    "listo": "Listo",
    "entregado": "Entregado",
}


def _fmt_dt(dt: datetime | None, fmt: str = "%d/%m/%Y %H:%M") -> str:
    if dt is None:
        return "—"
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime(fmt)


def _fmt_date(d) -> str:
    if d is None:
        return "—"
    try:
        return d.strftime("%d/%m/%Y")
    except Exception:
        return str(d)


# ── Clase PDF ──────────────────────────────────────────────────────────────────

class _WeldixPDF(FPDF):
    """FPDF2 con cabecera y pie personalizados para partes de trabajo."""

    def __init__(self, taller_nombre: str, job_code: str, fecha_gen: str):
        super().__init__(orientation="P", unit="mm", format="A4")
        self._taller_nombre = taller_nombre
        self._job_code = job_code
        self._fecha_gen = fecha_gen
        self.set_margins(left=16, top=16, right=16)
        self.set_auto_page_break(auto=True, margin=18)
        self.add_page()

    def header(self):
        # Línea superior
        self.set_draw_color(*_C_DARK)
        self.set_line_width(0.6)

        # Marca Weldix
        self.set_font("Helvetica", "B", 18)
        self.set_text_color(*_C_DARK)
        self.cell(60, 8, "Weldix", ln=False)

        # Tipo de documento alineado a la derecha
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(*_C_DARK)
        self.cell(0, 8, "PARTE DE TRABAJO", align="R", ln=True)

        # Nombre del taller / meta
        self.set_font("Helvetica", "", 8)
        self.set_text_color(*_C_SLATE)
        self.cell(100, 4, self._taller_nombre, ln=False)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*_C_MUTED)
        self.cell(0, 4, f"Generado: {self._fecha_gen}  ·  Ref: {self._job_code}", align="R", ln=True)

        # Línea separadora
        self.ln(2)
        self.set_draw_color(*_C_DARK)
        self.set_line_width(0.5)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(5)

    def footer(self):
        self.set_y(-13)
        self.set_draw_color(*_C_BORDER)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(2)
        self.set_font("Helvetica", "", 7.5)
        self.set_text_color(*_C_MUTED)
        self.cell(0, 4, f"Pág. {self.page_no()} — Documento generado por Weldix", align="C")

    # ── Helpers de estilo ──────────────────────────────────────────────────────

    def section_title(self, text: str):
        """Título de sección en mayúsculas con línea inferior."""
        self.set_font("Helvetica", "B", 7)
        self.set_text_color(*_C_MUTED)
        self.cell(0, 5, text.upper(), ln=True)
        self.set_draw_color(*_C_BORDER)
        self.set_line_width(0.3)
        self.line(self.l_margin, self.get_y(), self.w - self.r_margin, self.get_y())
        self.ln(3)

    def field_label(self, text: str):
        self.set_font("Helvetica", "B", 6.5)
        self.set_text_color(*_C_MUTED)
        self.cell(0, 3.5, text.upper(), ln=True)

    def field_value(self, text: str):
        self.set_font("Helvetica", "", 9.5)
        self.set_text_color(*_C_DARK)
        self.cell(0, 5, text, ln=True)

    def spacer(self, h: float = 4):
        self.ln(h)


# ── Renderizado de secciones ───────────────────────────────────────────────────

def _draw_job_header(pdf: _WeldixPDF, job: Job, operario_nombre: str | None):
    """Bloque principal: código, título, cliente + badge de estado."""
    # Fondo del bloque
    bx = pdf.l_margin
    by = pdf.get_y()
    bw = pdf.w - pdf.l_margin - pdf.r_margin
    bh = 28

    pdf.set_fill_color(*_C_BG)
    pdf.set_draw_color(*_C_BORDER)
    pdf.set_line_width(0.3)
    pdf.rect(bx, by, bw, bh, style="FD")

    # Código OT
    pdf.set_xy(bx + 4, by + 3)
    pdf.set_font("Helvetica", "B", 7)
    pdf.set_text_color(*_C_SLATE)
    pdf.cell(bw - 8, 4, (job.code or f"OT #{job.id}").upper(), ln=True)

    # Título
    pdf.set_x(bx + 4)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*_C_DARK)
    pdf.cell(bw - 55, 7, job.titulo[:55], ln=False)

    # Badge de estado (esquina superior derecha del bloque)
    estado = job.estado or "pendiente"
    badge_bg, badge_fg = _STATUS_COLORS.get(estado, (_C_BG, _C_SLATE))
    label = _ESTADO_LABELS.get(estado, estado)
    pdf.set_font("Helvetica", "B", 7)
    badge_w = 36
    badge_x = bx + bw - badge_w - 4
    badge_y = by + 3
    pdf.set_fill_color(*badge_bg)
    pdf.set_draw_color(*badge_bg)
    pdf.rect(badge_x, badge_y, badge_w, 6, style="F")
    pdf.set_xy(badge_x, badge_y)
    pdf.set_text_color(*badge_fg)
    pdf.cell(badge_w, 6, label.upper(), align="C", ln=True)

    # Cliente
    pdf.set_x(bx + 4)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_C_SLATE)
    pdf.cell(bw - 8, 5, job.cliente, ln=True)

    # Barra de progreso
    if job.progreso and job.progreso > 0:
        bar_x = bx + 4
        bar_y = pdf.get_y() + 1
        bar_w = bw - 8
        bar_h = 3
        # fondo
        pdf.set_fill_color(*_C_BORDER)
        pdf.rect(bar_x, bar_y, bar_w, bar_h, style="F")
        # relleno
        pdf.set_fill_color(56, 189, 248)  # sky-400
        fill_w = bar_w * job.progreso / 100
        pdf.rect(bar_x, bar_y, fill_w, bar_h, style="F")
        # etiqueta
        pdf.set_xy(bx + bw - 20, bar_y - 1)
        pdf.set_font("Helvetica", "B", 7)
        pdf.set_text_color(*_C_SLATE)
        pdf.cell(16, 5, f"{job.progreso}%", align="R", ln=False)

    pdf.set_y(by + bh + 4)


def _draw_info_grid(pdf: _WeldixPDF, job: Job, operario_nombre: str | None):
    """Grid de 3 campos: operario, fecha inicio, fecha creación."""
    col_w = (pdf.w - pdf.l_margin - pdf.r_margin) / 3
    x0 = pdf.l_margin

    fields = [
        ("Operario asignado", operario_nombre or "—"),
        ("Fecha de inicio", _fmt_date(job.fecha_inicio)),
        ("Creado el", _fmt_date(job.created_at)),
    ]

    for i, (label, value) in enumerate(fields):
        cx = x0 + i * col_w
        pdf.set_xy(cx, pdf.get_y())
        pdf.set_font("Helvetica", "B", 6.5)
        pdf.set_text_color(*_C_MUTED)
        pdf.cell(col_w - 2, 3.5, label.upper(), ln=False)

    pdf.ln(3.5)

    for i, (_, value) in enumerate(fields):
        cx = x0 + i * col_w
        pdf.set_xy(cx, pdf.get_y())
        pdf.set_font("Helvetica", "", 9.5)
        pdf.set_text_color(*_C_DARK)
        pdf.cell(col_w - 2, 5.5, value, ln=False)

    pdf.ln(8)


def _draw_description(pdf: _WeldixPDF, descripcion: str):
    """Caja de descripción con fondo gris."""
    pdf.section_title("Descripción / Notas del trabajo")
    bx = pdf.l_margin
    bw = pdf.w - pdf.l_margin - pdf.r_margin
    y0 = pdf.get_y()

    pdf.set_fill_color(*_C_BG)
    pdf.set_draw_color(*_C_BORDER)
    pdf.set_line_width(0.3)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*_C_SLATE)

    # multi_cell calcula la altura; dibujar fondo antes
    pdf.set_xy(bx + 4, y0 + 3)
    lines_h = pdf.get_string_width(descripcion) / (bw - 8) * 5 + 5
    box_h = max(12, lines_h)
    pdf.set_xy(bx, y0)
    pdf.rect(bx, y0, bw, box_h, style="FD")
    pdf.set_xy(bx + 4, y0 + 3)
    pdf.multi_cell(bw - 8, 5, descripcion)
    pdf.ln(4)


def _draw_horas_table(pdf: _WeldixPDF, registros: list[RegistroHoras]):
    """Tabla de horas imputadas."""
    pdf.section_title("Horas imputadas")

    if not registros:
        pdf.set_font("Helvetica", "I", 8.5)
        pdf.set_text_color(*_C_MUTED)
        pdf.cell(0, 5, "Sin registros de horas imputadas.", ln=True)
        pdf.ln(3)
        return

    col_widths = [60, 45, 45, 28]
    headers = ["Operario", "Inicio", "Fin", "Horas"]
    full_w = pdf.w - pdf.l_margin - pdf.r_margin

    # Cabecera de tabla
    pdf.set_fill_color(*_C_BG)
    pdf.set_draw_color(*_C_BORDER)
    pdf.set_line_width(0.3)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(*_C_SLATE)
    for i, h in enumerate(headers):
        align = "R" if i == 3 else "L"
        pdf.cell(col_widths[i], 6, h, border="B", align=align, fill=True, ln=(i == 3))

    # Filas
    total_horas = 0.0
    for idx, r in enumerate(registros):
        nombre = (r.operario.full_name or r.operario.email) if r.operario else "—"
        inicio = _fmt_dt(r.inicio)
        fin = _fmt_dt(r.fin) if r.fin else "—"
        horas_str = f"{r.horas:.2f}" if r.horas else "—"
        if r.horas:
            total_horas += r.horas

        fill = idx % 2 == 1
        pdf.set_fill_color(*((_C_BG) if fill else _C_WHITE))
        pdf.set_font("Helvetica", "", 9)
        pdf.set_text_color(*_C_DARK)

        row_data = [nombre[:30], inicio, fin, horas_str]
        for i, cell in enumerate(row_data):
            align = "R" if i == 3 else "L"
            pdf.cell(col_widths[i], 6, cell, border=0, align=align, fill=fill, ln=(i == 3))

    # Fila de total
    if total_horas > 0:
        pdf.set_fill_color(*_C_BG)
        pdf.set_draw_color(*_C_BORDER)
        pdf.set_line_width(0.3)
        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*_C_DARK)
        pdf.cell(sum(col_widths[:3]), 6.5, "Total horas", border="T", fill=True, ln=False)
        pdf.cell(col_widths[3], 6.5, f"{total_horas:.2f}", border="T", align="R", fill=True, ln=True)

    pdf.ln(5)


def _draw_historial_table(pdf: _WeldixPDF, events: list[JobEvent]):
    """Tabla del historial de estados."""
    pdf.section_title("Historial de estados")

    if not events:
        pdf.set_font("Helvetica", "I", 8.5)
        pdf.set_text_color(*_C_MUTED)
        pdf.cell(0, 5, "Sin historial registrado.", ln=True)
        pdf.ln(3)
        return

    col_widths = [45, 105, 28]
    headers = ["Fecha", "Evento", "Usuario"]

    pdf.set_fill_color(*_C_BG)
    pdf.set_draw_color(*_C_BORDER)
    pdf.set_line_width(0.3)
    pdf.set_font("Helvetica", "B", 7.5)
    pdf.set_text_color(*_C_SLATE)
    for i, h in enumerate(headers):
        pdf.cell(col_widths[i], 6, h, border="B", fill=True, ln=(i == 2))

    for idx, ev in enumerate(events):
        fill = idx % 2 == 1
        pdf.set_fill_color(*(_C_BG if fill else _C_WHITE))
        pdf.set_font("Helvetica", "", 8.5)
        pdf.set_text_color(*_C_DARK)
        row = [_fmt_dt(ev.created_at), ev.descripcion[:60], ev.usuario[:20]]
        for i, cell in enumerate(row):
            pdf.cell(col_widths[i], 6, cell, border=0, fill=fill, ln=(i == 2))

    pdf.ln(5)


def _draw_firmas(pdf: _WeldixPDF, operario_nombre: str | None):
    """Dos cajas de firma: operario y responsable."""
    pdf.ln(6)
    col_w = (pdf.w - pdf.l_margin - pdf.r_margin - 10) / 2
    x0 = pdf.l_margin

    for i, (titulo, nombre) in enumerate([
        ("Firma del operario", operario_nombre or ""),
        ("Firma del responsable / Conforme del cliente", ""),
    ]):
        cx = x0 + i * (col_w + 10)
        y0 = pdf.get_y()
        # Línea de firma
        pdf.set_draw_color(*_C_MUTED)
        pdf.set_line_width(0.4)
        pdf.line(cx, y0, cx + col_w, y0)
        # Etiqueta
        pdf.set_xy(cx, y0 + 2)
        pdf.set_font("Helvetica", "", 7.5)
        pdf.set_text_color(*_C_MUTED)
        pdf.cell(col_w, 4, titulo, ln=False)

    pdf.ln(10)

    for i, nombre in enumerate([operario_nombre or "", ""]):
        cx = x0 + i * (col_w + 10)
        pdf.set_xy(cx, pdf.get_y())
        pdf.set_font("Helvetica", "B", 8.5)
        pdf.set_text_color(*_C_SLATE)
        pdf.cell(col_w, 4, nombre or "____________________", ln=False)


# ── Punto de entrada ───────────────────────────────────────────────────────────

def generate_job_pdf(db: Session, job_id: int, tenant_id: int | None = None) -> bytes:
    """Genera y devuelve el PDF del parte de trabajo como bytes."""

    q = db.query(Job).filter(Job.id == job_id)
    if tenant_id is not None:
        q = q.filter(Job.tenant_id == tenant_id)
    job = q.first()
    if not job:
        raise ValueError(f"Trabajo {job_id} no encontrado")

    operario: User | None = (
        db.query(User).filter(User.id == job.operario_id).first()
        if job.operario_id
        else None
    )
    operario_nombre = operario.full_name or operario.email if operario else None

    registros = (
        db.query(RegistroHoras)
        .filter(RegistroHoras.job_id == job_id)
        .order_by(RegistroHoras.inicio)
        .all()
    )

    events = (
        db.query(JobEvent)
        .filter(JobEvent.trabajo_id == job_id)
        .order_by(JobEvent.created_at)
        .all()
    )

    taller_nombre = "Weldix"
    if tenant_id is not None:
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if tenant:
            taller_nombre = tenant.nombre

    fecha_gen = datetime.now(timezone.utc).strftime("%d/%m/%Y %H:%M")
    job_code = job.code or f"OT-{job.id}"

    pdf = _WeldixPDF(taller_nombre, job_code, fecha_gen)

    _draw_job_header(pdf, job, operario_nombre)
    pdf.spacer(2)
    pdf.section_title("Información general")
    _draw_info_grid(pdf, job, operario_nombre)

    if job.descripcion:
        _draw_description(pdf, job.descripcion)

    _draw_horas_table(pdf, registros)
    _draw_historial_table(pdf, events)
    _draw_firmas(pdf, operario_nombre)

    return bytes(pdf.output())
