# ERRORES_APRENDIDOS.md — Registro de aprendizaje agéntico

> Cada vez que se corrige un error real en Weldix, se registra aquí con el formato:
> **❌ Error / ✅ Corrección / 🎓 Concepto aprendido**.
> El objetivo: que el próximo tú (o cualquier programador) no repita el fallo.

---

### 2026-08-05 — [Backend: Admin]

**❌ Error:**
El gráfico "OTs creadas — últimos 6 meses" del panel de admin salía siempre a 0,
aunque había 9 OTs creadas ese mismo mes. El dato existía en la BD (`created_at`
correcto) y el `read_model` lo devolvía, pero nunca llegaba al frontend.

**✅ Corrección:**
Añadir `created_at: str | None` al schema `AdminJobItem` en
`backend/features/admin/schemas.py`. El campo ya se calculaba en
`read_model._job_item`; solo faltaba declararlo en el `response_model`.

**🎓 Concepto aprendido:**
En FastAPI, el `response_model` no solo **valida** la salida: la **filtra**.
Cualquier campo que el service devuelva pero que no esté declarado en el schema
de respuesta se elimina silenciosamente. Es una protección (evita filtrar datos
por accidente), pero también un pie del que tropezar: si un campo "desaparece"
en el frontend, revisa el schema de salida ANTES que el frontend.

---

### 2026-08-05 — [Backend/Frontend: Trabajos (Kanban)]

**❌ Error:**
Arrastrar una tarjeta entre columnas del Kanban no hacía nada: la tarjeta rebotaba
a su columna original. Parecía un problema de permisos o de drag no cableado.

**✅ Corrección:**
El drag SÍ estaba cableado (`onMoveJob → changeJobStatus`). El fallo era un
desajuste de contrato: `UpdateEstadoRequest` exigía `estado` **y** `progreso`,
pero el Kanban solo enviaba `{ estado }` → el backend respondía **422** y el
`refresh()` recargaba datos sin cambios. Se hizo `progreso` opcional
(`int | None = None`); si no llega, el trabajo conserva el progreso que tenía.

**🎓 Concepto aprendido:**
Cuando el frontend y el backend "no se hablan", el sospechoso número uno es el
**contrato de la petición** (qué campos son obligatorios), no la lógica de negocio.
Un 422 silencioso (sin manejo de error visible) se disfraza de "no funciona".
Además: mejor que el endpoint acepte solo lo que ese caso de uso necesita
(cambiar estado sin tocar progreso) que forzar al llamante a inventar un valor.

---
