<div align="center">

# Weldix

**El sistema de gestión que entiende tu taller.**

*Órdenes de trabajo · Fichaje · Stock · RRHH · GMAO · IA*

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-prod-4169E1?style=flat&logo=postgresql&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-instalable-5A0FC8?style=flat&logo=pwa&logoColor=white)
![License](https://img.shields.io/badge/license-Proprietary-red?style=flat)

[Probar demo](https://weldix.app) · [Solicitar acceso](mailto:hola@weldix.app) · [WhatsApp](https://wa.me/34600000000)

</div>

---

## El problema real

En la mayoría de talleres de soldadura y calderería, la gestión operativa sigue igual que hace 20 años:

- Las órdenes de trabajo se apuntan en papel y se pierden
- Nadie sabe quién lleva qué trabajo ni en qué estado está
- El stock se gestiona de memoria o en un Excel que siempre va retrasado
- Las horas de los operarios se calculan a mano al final del mes
- Los clientes preguntan por teléfono cuándo estará su pieza lista

**Weldix resuelve todo eso.** Nace de 10 años de experiencia real en el sector — no de un despacho.

---

## ¿Qué es Weldix?

Weldix es una plataforma SaaS **multi-taller** diseñada específicamente para talleres de soldadura, calderería y metalurgia. Digitaliza el día a día del taller sin cambiar cómo trabaja tu equipo.

**Para el jefe de taller:**
- Ve el estado de todas las OTs en tiempo real, desde cualquier pantalla
- Sabe cuántas horas ha trabajado cada operario hoy, esta semana, este mes
- Recibe alertas cuando el stock baja del mínimo o una OT lleva demasiado tiempo parada
- Tiene control total del mantenimiento de la maquinaria (GMAO)

**Para el operario:**
- Ficha su entrada y salida desde cualquier tablet del taller
- Inicia su trabajo escaneando el código QR de la OT o escribiendo el código
- Registra qué materiales ha consumido y sube fotos del trabajo
- Solicita vacaciones y ausencias sin papeleo

**Para el negocio:**
- Todos los datos en un solo sitio, sin Excel ni papel
- Cada taller es independiente y aislado (arquitectura multi-tenant)
- Instala la app en cualquier tablet sin pasar por la App Store
- Funciona aunque haya cortes de internet (PWA con caché offline)

---

## Módulos — qué hace cada parte

| Módulo | Descripción | Estado |
|---|---|---|
| **Órdenes de trabajo** | CRUD completo de OTs, flujo de estados, detalle, historial de eventos | ✅ Activo |
| **Dashboard operario** | Trabajo activo, métricas personales, inicio de OT por código o QR | ✅ Activo |
| **Dashboard admin** | Métricas globales del taller, todas las OTs, gestión de usuarios | ✅ Activo |
| **Fichaje** | Control de jornada (entrada/salida), historial, cierre forzado por admin | ✅ Activo |
| **Registro de horas** | Imputación de horas por OT, resumen por operario y trabajo | ✅ Activo |
| **Stock** | CRUD de materiales, alertas de mínimos, registro de consumos por OT | ✅ Activo |
| **Fotos** | Galería antes/durante/después por trabajo, visor lightbox | ✅ Activo |
| **Escáner QR** | Iniciar OT desde tablet escaneando el código QR físico | ✅ Activo |
| **Historial** | Línea de tiempo completa de eventos por trabajo | ✅ Activo |
| **GMAO — Equipos** | Gestión de maquinaria: estados, alertas de mantenimiento, semáforo visual | ✅ Activo |
| **RRHH** | Ausencias, vacaciones, festivos, aprobación por jefe, calendario | ✅ Activo |
| **Asistente IA** | Chat Mistral con contexto real del taller: OTs, stock, operarios | ✅ Activo |
| **Multi-tenant** | Cada taller es un workspace aislado. Un operario de un taller no ve otro. | ✅ Activo |
| **PWA instalable** | Instalar en tablet/iPad sin App Store. Funciona offline. | ✅ Activo |
| **Onboarding wizard** | 5 pasos para configurar el taller desde cero al primer login | ✅ Activo |
| **Registro de taller** | Cualquier taller puede crear su workspace en 2 minutos | ✅ Activo |
| **PDF de trabajo / factura** | Documento técnico y factura con logo del taller | Fase 7 |
| **Portal del cliente** | Link público para que el cliente siga su OT sin cuenta | Fase 9 |
| **Notificaciones n8n** | WhatsApp/Email automático al cambiar estado de una OT | Fase 8 |
| **Kanban drag & drop** | Vista tablero con columnas por estado | Fase 7 |
| **Stripe / pagos** | Suscripción mensual con trial de 15 días | Fase 6 |

---

## Flujo de una orden de trabajo

```
PAPEL → pendiente → en_proceso → control → listo → entregado → CLIENTE
```

1. El jefe crea la OT en el sistema y entrega el papel físico al operario
2. El operario escanea el código QR o escribe el código (`ORD-2026-031`)
3. El backend valida el estado, auto-asigna al operario y registra el inicio
4. El operario registra materiales consumidos y sube fotos del avance
5. Al finalizar, el jefe hace el control de calidad y marca como listo
6. Cada transición queda registrada en el historial con timestamp y usuario

---

## Stack tecnológico

### Backend

| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.11+ | Lenguaje base |
| FastAPI | 0.111+ | Framework web, API REST, validación automática |
| SQLAlchemy | 2.x | ORM — abstracción de base de datos |
| Pydantic v2 | 2.x | Validación y serialización de datos |
| Alembic | — | Migraciones de base de datos versionadas |
| python-jose | — | Generación y verificación de JWT HS256 |
| passlib (pbkdf2) | — | Hash seguro de contraseñas |
| Mistral AI | — | LLM con contexto dinámico del taller |
| SQLite | dev | Base de datos en desarrollo local |
| PostgreSQL | prod | Base de datos en producción |

### Frontend

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | UI — arquitectura modular por feature |
| Vite | 6+ | Build tool, dev server, tree-shaking |
| Tailwind CSS | v4 | Estilos utilitarios con CSS variables |
| React Router | 7 | Navegación SPA con rutas protegidas por rol |
| vite-plugin-pwa | — | Service worker, manifest, caché offline |
| html5-qrcode | — | Escáner QR nativo desde la cámara |
| FullCalendar | — | Calendario RRHH interactivo |

### Infraestructura y calidad

| Herramienta | Uso |
|---|---|
| GitHub Actions | CI/CD: lint + tests + bundle size check en cada push |
| Alembic | Migraciones SQL versionadas con rollback |
| pre-commit (Black + isort) | Formateo automático del código Python |
| pytest + httpx | Tests de integración del backend |
| Feature flags | Kill switch por variable de entorno para funcionalidades nuevas |
| TTL cache en memoria | Caché de métricas del dashboard sin Redis |

---

## Arquitectura

```
Componente JSX → Custom Hook → Service → Model → API (FastAPI)
                                                      ↓
                                              SQLAlchemy ORM
                                                      ↓
                                           SQLite (dev) / PostgreSQL (prod)
```

- **Modular por feature** (vertical slicing): `auth`, `jobs`, `fichaje`, `stock`, `equipos`, `rrhh`, `ia`...
- **Multi-tenant**: cada tabla filtra por `tenant_id`. Un operario de Taller A no puede ver datos de Taller B
- **JWT HS256** con roles `admin` / `operario`
- **Strategy Pattern** para configuración de estados de OT
- **Guard Clauses** — sin if/else anidados en ningún componente
- **Context API** para auth session y tema dark/light
- **CSS variables Tailwind v4** — el tema claro/oscuro cambia sin tocar JSX

---

## Seguridad

- JWT HS256 firmado con `SECRET_KEY` — configurable en `.env`
- Contraseñas hasheadas con `pbkdf2_sha256` — nunca en texto plano
- Rate limiting en login: 5 intentos fallidos → bloqueo automático 10 minutos
- Todos los endpoints validan rol antes de ejecutar cualquier lógica
- CORS configurado por variable de entorno — nunca `*` en producción
- Datos de cada taller completamente aislados por `tenant_id`
- Secrets en `.env` — ninguna credencial hardcodeada en el código
- Registro público cerrado — el admin del taller crea las cuentas

---

## Instalación y arranque rápido

### Requisitos

- Python 3.11+
- Node.js 20+ y npm
- Git

### 1. Clonar y configurar

```bash
git clone https://github.com/1855-git/weldix.git
cd weldix
cp .env.example .env
```

Edita `.env`:

```env
SECRET_KEY=genera_una_clave_aleatoria_larga_aqui
DATABASE_URL=sqlite:///./weldix.db
MISTRAL_API_KEY=tu_api_key_de_mistral
ALLOWED_ORIGINS=http://localhost:5174
SEED_DEMO_DATA=true
```

### 2. Backend

```bash
python -m venv .venv
source .venv/bin/activate          # Linux / Mac
.venv\Scripts\activate             # Windows

pip install -r requirements.txt
uvicorn backend.main:app --reload
```

Al arrancar por primera vez crea las tablas y el usuario admin por defecto.
API disponible en `http://localhost:8000` · Docs en `http://localhost:8000/docs`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

App disponible en `http://localhost:5174`

### Credenciales por defecto

| Campo | Valor |
|---|---|
| Email | `admin@weldix.com` |
| Contraseña | `admin123` |
| Rol | `admin` |

> Cambia la contraseña tras el primer login.

---

## Estructura del proyecto

```
weldix/
├── backend/
│   ├── core/
│   │   ├── config.py           # Settings — lee variables de .env
│   │   ├── database.py         # SQLAlchemy engine, sesión
│   │   ├── security.py         # JWT, hash, verify password
│   │   ├── bootstrap.py        # create_all + seed admin
│   │   ├── cache.py            # TTL cache en memoria
│   │   └── feature_flags.py    # Kill switch por envvar
│   └── features/
│       ├── auth/               # Login, JWT, registro de workspace
│       ├── jobs/               # Órdenes de trabajo
│       ├── fichaje/            # Control de jornada
│       ├── registro_horas/     # Horas imputadas por OT
│       ├── stock/              # Materiales del taller
│       ├── fotos/              # Galería por trabajo
│       ├── historial/          # Eventos por trabajo
│       ├── equipos/            # GMAO — maquinaria
│       ├── rrhh/               # Ausencias, vacaciones
│       ├── dashboard/          # Endpoints del panel operario
│       ├── admin/              # Panel de administración
│       └── ia/                 # Chat Mistral
├── frontend/
│   └── src/
│       └── modules/
│           ├── auth/           # Login, registro workspace, perfil
│           ├── jobs/           # Lista y detalle de OTs
│           ├── fichaje/        # Jornada y calendario
│           ├── stock/          # Materiales
│           ├── equipos/        # Maquinaria
│           ├── rrhh/           # RRHH y calendario
│           ├── dashboard/      # Panel del operario
│           ├── admin/          # Panel del jefe
│           ├── ia/             # Chat IA
│           ├── landing/        # Página pública de marketing
│           └── core/           # Componentes y utilidades compartidas
├── .github/
│   └── workflows/
│       └── test.yml            # CI: lint + tests + bundle check
├── doc/                        # Documentación técnica interna
├── .env.example
├── LICENSE
└── README.md
```

---

## API — Endpoints principales

### Auth

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/auth/login` | Autenticación, devuelve JWT | Público |
| POST | `/auth/register-workspace` | Crea un taller nuevo + admin | Público |
| GET | `/auth/me` | Perfil del usuario autenticado | Autenticado |
| PATCH | `/auth/me` | Actualizar perfil | Autenticado |
| POST | `/auth/change-password` | Cambio de contraseña | Autenticado |
| POST | `/auth/admin/signup` | Crear operario (solo admin) | Admin |
| POST | `/auth/me/onboarding-done` | Marcar onboarding completado | Admin |

### Trabajos (OTs)

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/trabajos` | Lista paginada con filtros | Autenticado |
| POST | `/trabajos` | Crear OT | Admin |
| GET | `/trabajos/{id}` | Detalle de OT | Autenticado |
| PATCH | `/trabajos/{id}` | Editar OT | Admin |
| PATCH | `/trabajos/{id}/estado` | Avanzar estado | Autenticado |
| DELETE | `/trabajos/{id}` | Eliminar OT | Admin |
| GET | `/trabajos/buscar-rapido` | Buscar por código QR / texto | Autenticado |
| GET | `/trabajos/{id}/historial` | Línea de tiempo de eventos | Autenticado |

### Fichaje y horas

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/fichaje/inicio` | Abrir jornada | Operario |
| POST | `/fichaje/fin` | Cerrar jornada | Operario |
| GET | `/fichaje/activo` | Jornada en curso del usuario | Autenticado |
| GET | `/fichaje/mis-jornadas` | Historial del operario | Operario |
| POST | `/fichaje/forzar-cierre/{id}` | Cerrar jornada huérfana | Admin |
| POST | `/registro-horas` | Imputar horas a una OT | Autenticado |

### Stock, Fotos, Equipos, RRHH

| Método | Ruta | Descripción |
|---|---|---|
| GET/POST | `/stock` | Lista y creación de materiales |
| POST | `/stock/{id}/consume` | Registrar consumo de material |
| POST | `/trabajos/{id}/fotos` | Subir foto al trabajo |
| GET/POST | `/equipos` | Gestión de maquinaria |
| GET/POST | `/rrhh/ausencias` | Solicitudes del operario |
| PATCH | `/rrhh/ausencias/{id}` | Aprobar/rechazar (admin) |

### Dashboard y Admin

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| GET | `/dashboard/worker` | Métricas y trabajo activo del operario | Operario |
| GET | `/admin/dashboard` | Métricas globales del taller | Admin |
| GET | `/admin/users` | Lista de usuarios del taller | Admin |
| POST | `/ia/consulta` | Chat con asistente IA | Autenticado |

---

## Roles y permisos

| Rol | Qué puede hacer |
|---|---|
| `admin` | Todo: crear OTs, usuarios, ver métricas globales, aprobar RRHH, cerrar jornadas, gestionar equipos |
| `operario` | Sus OTs asignadas, fichar, consumir stock, subir fotos, solicitar vacaciones |

El registro público está **cerrado por defecto**. Cada taller crea su propio workspace y el admin gestiona los accesos de su equipo.

---

## Hoja de ruta

### Completado

- [x] Gestión de OTs con flujo de estados completo
- [x] Dashboard del operario y panel de administración
- [x] Control de stock con alertas y registro de consumos
- [x] Fichaje de jornada con historial y cierre forzado por admin
- [x] Registro de horas imputadas por OT
- [x] Galería de fotos por trabajo (antes / durante / después)
- [x] Escáner QR para iniciar OT desde tablet
- [x] Historial completo de eventos por trabajo (línea de tiempo)
- [x] GMAO: gestión de maquinaria con semáforo de mantenimiento
- [x] Módulo RRHH: ausencias, vacaciones, festivos, calendario
- [x] Asistente IA con contexto real del taller (Mistral)
- [x] Multi-tenant: cada taller es un workspace aislado
- [x] Registro de taller en 2 minutos (`/registro`)
- [x] Onboarding wizard de 5 pasos para nuevos admins
- [x] PWA instalable — funciona offline, sin App Store
- [x] Tema dark / light industrial con toggle global
- [x] Página de landing pública con precios y CTAs
- [x] CI/CD con GitHub Actions (lint + tests + bundle check)
- [x] Páginas de Términos y Privacidad (GDPR)

### En curso — Fase 6 (Lanzamiento Comercial)

- [ ] Trial automático de 15 días al crear workspace (`trial_expires_at`)
- [ ] Banner de aviso cuando quedan < 5 días de trial
- [ ] Página `/trial-expirado` con CTA de contratación
- [ ] Email de bienvenida automático vía n8n al registrar taller
- [ ] Pagos y suscripción con Stripe
- [ ] Datos de demo para nuevos talleres (con botón para limpiarlos)

### Próximas fases

- [ ] Generación de PDF del trabajo y factura (WeasyPrint)
- [ ] Kanban drag & drop por estado
- [ ] Dashboard con gráficos (Recharts)
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Automatizaciones n8n: WhatsApp / Email por cambio de estado
- [ ] Alerta si una OT lleva +48h parada
- [ ] Resumen diario del taller por email (cron 18:00)
- [ ] Portal del cliente: link público para seguir su OT sin cuenta
- [ ] Firma digital del cliente al recibir el trabajo

---

## Filosofía de código

El código de Weldix sigue principios de ingeniería de software rigurosos. No es un proyecto de bootcamp — es una herramienta de negocio que otros van a leer, mantener y extender.

**Principios aplicados:**
- **DRY** — cada pieza de lógica vive en un solo sitio
- **KISS** — código que se entiende en 10 segundos sin comentarios
- **YAGNI** — solo lo que el negocio pide hoy
- **SOC** — una clase, un módulo, una responsabilidad
- **LOD** — máximo 2 niveles de acceso en cualquier expresión
- **Guard Clauses** — retorno rápido, sin if/else anidados
- **Strategy Pattern** — configuración en objetos, sin switch
- **SOLID** — especialmente Single Responsibility y Open/Closed

Basado en: *Clean Code* (Martin), *A Philosophy of Software Design* (Ousterhout), *Dive Into Design Patterns* (Shvets), *Code Complete* (McConnell).

---

## Contacto y licencias

**Autor:** Fernando Del Rio
**Email:** fernandogondelrio@gmail.com
**Web:** [weldix.app](https://weldix.app)
**Demo o consultas:** [hola@weldix.app](mailto:hola@weldix.app)

---

## Licencia

Copyright (c) 2026 Fernando Del Rio. Todos los derechos reservados.

Este software y su código fuente son **propietarios y confidenciales**.
No se concede ninguna licencia para copiar, modificar, distribuir, sublicenciar ni usar este software sin autorización escrita del autor.

Para consultas de licencia comercial: [melacrujo@gmail.com](mailto:melacrujo@gmail.com)

> El código es visible en este repositorio con fines de evaluación técnica y portfolio. La visibilidad del código no implica ninguna licencia de uso ni distribución.
