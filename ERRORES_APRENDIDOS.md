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

### 2026-08-06 — [Backend: RRHH / Aislamiento multi-tenant]

**❌ Error:**
En `backend/features/rrhh/`, todas las operaciones sobre solicitudes de
ausencia (`crear_solicitud`, `get_todas_solicitudes`, `revisar_solicitud`,
`get_saldo_vacaciones`, `get_informe_mensual`, `get_calendario`) ignoraban
`tenant_id` por completo — ni se guardaba al crear la solicitud, ni se
filtraba al consultar. Un admin de un taller podía ver, aprobar o rechazar
solicitudes de vacaciones de operarios de OTRO taller, consultar su saldo
de vacaciones, y el informe mensual mezclaba operarios de todos los
talleres. Lo mismo pasaba con `upsert_config` (`ConfiguracionLaboral`): un
admin podía sobrescribir la jornada/vacaciones/turno de un operario de otro
taller, porque nunca se validaba que `operario_id` perteneciera a su tenant.

**✅ Corrección:**
Se añadió el mismo guard clause de aislamiento que ya usan `jobs`/`fichaje`:
cada función ahora recibe `tenant_id` y filtra las queries por
`Modelo.tenant_id == tenant_id`; cuando la operación depende de un
`operario_id` recibido desde fuera (saldo, config), se valida primero que
ese operario exista **y** pertenezca al mismo tenant — si no, se lanza
`ValueError` y el router responde 404. `crear_solicitud` ahora graba
`tenant_id` en la `SolicitudAusencia` al crearla. Cobertura añadida en
`tests/features/rrhh/test_rrhh_tenant_isolation_bugs.py`.

**🎓 Concepto aprendido:**
Que un modelo tenga la columna `tenant_id` no aísla nada por sí solo — el
aislamiento lo da la disciplina de **filtrar por tenant en cada query** y
de **validar la pertenencia de cualquier id recibido por parámetro** antes
de leer o escribir con él. Basta una función que se salte ese filtro para
que el muro entre talleres tenga un agujero.

---

### 2026-08-06 — [Backend: RRHH / NameError en producción]

**❌ Error:**
`GET /rrhh/accidentes/mios` (backend/features/rrhh/router.py, función
`mis_accidentes`) usaba el modelo `AccidenteLaboral` directamente en una
query, pero `router.py` solo importaba los *schemas* de respuesta
(`AccidenteLaboralResponse`), nunca el modelo. Cualquier llamada a ese
endpoint lanzaba `NameError` — el operario no podía ver ni su propia lista
de accidentes/incidentes.

**✅ Corrección:**
Se añadió `from .model import AccidenteLaboral` en `router.py`, junto a
los demás imports del módulo.

**🎓 Concepto aprendido:**
Un `NameError` en un endpoint solo aparece en tiempo de ejecución, nunca en
el arranque de FastAPI (Python no valida nombres dentro del cuerpo de una
función hasta que se ejecuta esa línea). Por eso un test de integración que
de verdad **llama** al endpoint es la única red que atrapa este tipo de
fallo — revisar el código a ojo no basta cuando el bug está en una rama que
no se ejecuta en el camino feliz de otros tests.
