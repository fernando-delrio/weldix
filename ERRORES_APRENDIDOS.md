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

---

### 2026-08-06 — [Backend: Stock / Equipos — código HTTP inconsistente]

**❌ Error:**
En `stock/router.py::consume_material` y `equipos/router.py::update_estado`,
un único `except ValueError` capturaba dos errores de negocio distintos
("recurso no encontrado" y "regla de negocio violada") y los mapeaba
siempre al mismo código. Resultado: "material no encontrado" daba 400 en
`consume` pero 404 en `restock` del mismo módulo; "equipo no encontrado"
daba 400 en `/estado` pero 404 en el resto de endpoints de equipos.

**✅ Corrección:**
Se separó cada caso en su propio `try/except`: primero se comprueba que el
recurso existe (`get_material_by_id` / `get_equipo_by_id` → 404 si no),
y solo después se ejecuta la regla de negocio que puede fallar con 400
(stock insuficiente / estado inválido).

**🎓 Concepto aprendido:**
Un `except ValueError` genérico no distingue *por qué* falló — solo que
falló. Cuando una misma función de servicio puede lanzar `ValueError` por
motivos distintos (no encontrado vs. regla de negocio), el router necesita
separar la comprobación de existencia de la comprobación de negocio para
poder responder con el código HTTP correcto en cada caso.

---

### 2026-08-06 — [Backend: Registro de horas / Aislamiento multi-tenant]

**❌ Error:**
En `backend/features/registro_horas/service.py`, ni `iniciar_registro` ni
`get_resumen_horas_ot` recibían ni filtraban por `tenant_id` — a diferencia
de `jobs`, `fichaje` o (ya corregido) `rrhh`. Consecuencia real: cualquier
operario o admin autenticado, de CUALQUIER taller, podía leer
`GET /trabajos/{job_id}/horas` de una OT ajena (código, título, horas
totales y desglose con nombres de operarios) solo conociendo o adivinando
su `job_id` autoincremental; y un operario de otro taller podía abrir un
registro de horas (`POST /registro-horas/iniciar`) sobre una OT que no era
suya, sin ninguna validación de pertenencia. `finalizar_registro` se
revisó también: no hacía falta tocarla, porque ya comparaba
`registro.operario_id != operario_id` y los ids de usuario son globales y
únicos en toda la tabla `users` — ningún usuario de otro tenant puede
coincidir con ese id salvo que sea la misma cuenta.

**✅ Corrección:**
Se añadió `tenant_id: int | None = None` a `iniciar_registro` y a
`get_resumen_horas_ot`. Ambas usan un helper nuevo, `_get_job_in_tenant`,
que consulta la OT filtrando por `tenant_id` y lanza `JobNotFoundError`
(subclase de `ValueError`, para no romper ningún `except ValueError`
existente) si no existe o pertenece a otro taller. El router captura
`JobNotFoundError` **antes** que `ValueError` genérico y responde 404;
el resto de errores de negocio (jornada no iniciada, registro ya abierto)
siguen respondiendo 400 — mismo patrón que la entrada anterior de este
archivo (stock/equipos). También se empezó a grabar `tenant_id` en el
`RegistroHoras` creado (antes la columna existía pero nunca se rellenaba).
Cobertura en `tests/features/registro_horas/test_registro_horas_tenant_isolation_bugs.py`
(los dos tests que antes estaban `xfail(strict=True)` ahora pasan en verde).

**🎓 Concepto aprendido:**
Una fuga de aislamiento no siempre es "falta un filtro `WHERE tenant_id =`"
— a veces es que ni siquiera se comprueba que el recurso referenciado por
un id externo (`job_id`) exista dentro del tenant del que llama, antes de
leerlo o de crear una fila que lo referencia. Y no toda función de un
módulo sin `tenant_id` es automáticamente explotable: `finalizar_registro`
demuestra que un chequeo distinto (comparar contra el id del propio
usuario autenticado, que es global y único) puede bloquear el mismo vector
sin necesitar tenant_id — pero eso hay que demostrarlo con un test, no
darlo por supuesto.

---

### 2026-08-06 — [Backend: PDF / Generación rota al 100% por encoding]

**❌ Error:**
`GET /trabajos/{id}/pdf` (backend/features/pdf/service.py) crasheaba con
`FPDFUnicodeEncodingException` para CUALQUIER trabajo, en cualquier tenant
— la feature estaba rota al 100%, no era un caso límite. La causa raíz:
`_WeldixPDF.footer()` escribía un f-string con un em dash `"—"` (U+2014)
literal sin pasar por `_safe()` (la función que sanea unicode a latin-1
para las fuentes core "Helvetica", que solo soporta U+0000–U+00FF).
`footer()` se ejecuta en cada página, así que ninguna descarga se salvaba.
Además, `_safe()` tenía el mismo bug en su propio guard clause: cuando
recibía texto vacío o `None`, devolvía `"—"` sin sanear — así que cualquier
llamador que confiara en `_safe()` (p. ej. `_draw_firmas` con un trabajo sin
operario asignado) también podía crashear. Y `_draw_info_grid` construía
"Operario asignado" (`operario_nombre or "—"`) y las fechas (`_fmt_date`,
que también devuelve `"—"` en `None`) sin pasarlas por `_safe()` en absoluto
— roto de nuevo para cualquier trabajo sin operario o sin `fecha_inicio`
(el estado por defecto de toda OT recién creada).

**✅ Corrección:**
Tres cambios en `backend/features/pdf/service.py`: (1) el guard clause de
`_safe()` ahora devuelve `"-"` (ya seguro) en vez de `"—"` sin sanear; (2)
`footer()` envuelve el f-string completo en `_safe(...)`; (3)
`_draw_info_grid` envuelve `operario_nombre or "—"` y ambas llamadas a
`_fmt_date(...)` en `_safe(...)`. Los dos tests que documentaban el crash
(`tests/features/pdf/test_pdf_router.py`) se reescribieron como happy path
real: uno para el peor escenario (trabajo sin operario ni fecha) y otro con
datos completos — ambos verifican bytes `%PDF-` válidos, no una excepción.

**🎓 Concepto aprendido:**
Una función "de saneado" como `_safe()` es un módulo profundo (Ousterhout):
su contrato es "SIEMPRE devuelvo texto seguro para esta fuente", sin
excepciones. Si su propio guard clause puede devolver algo inseguro, el
contrato está roto y cada llamador que confía en ella hereda el bug — no
basta con arreglar el sitio donde se descubrió el crash, hay que revisar
todos los `return` de la función que se supone que garantiza la invariante.

---

### 2026-08-06 — [Backend: Nóminas / Aislamiento multi-tenant]

**❌ Error:**
En `backend/features/nominas/service.py::subir_nomina` y
`router.py::upload_nomina`, nunca se comprobaba que el `operario_id`
recibido por formulario perteneciera al tenant del admin que sube la
nómina. Un admin del tenant A podía subir una nómina indicando el
`operario_id` real de un operario del tenant B: el registro se creaba con
`tenant_id=A` pero `operario_id` apuntando a un usuario de B, filtrando su
nombre completo en el propio listado de nóminas del tenant A.

**✅ Corrección:**
Se añadió el mismo guard clause de aislamiento que ya usan `rrhh`/
`registro_horas`: `subir_nomina` valida que exista un `User` con ese
`operario_id` **y** `tenant_id`; si no, lanza `OperarioNotFoundError`
(subclase de `ValueError`, mismo patrón que `JobNotFoundError`). El router
captura `OperarioNotFoundError` antes que `ValueError` genérico y responde
404; el resto de errores de validación (mes fuera de rango, PDF inválido)
siguen respondiendo 400. El test que antes documentaba el bug
(`tests/features/nominas/test_nominas_router.py`) se convirtió en test de
regresión en verde (`test_upload_nomina_rejects_operario_id_from_another_tenant`).

**🎓 Concepto aprendido:**
Mismo patrón que la entrada de RRHH/Registro de horas de este archivo: la
columna `tenant_id` en el modelo no protege nada si un `operario_id`
recibido desde fuera nunca se valida contra el tenant de quien hace la
petición. Cuando un endpoint acepta el id de "otra entidad" (aquí, el
operario destinatario) como parámetro, ese id es tan de confiar como
cualquier otro dato de entrada — hay que verificar su pertenencia antes
de usarlo para crear o modificar algo.
