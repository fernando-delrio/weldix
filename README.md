# Weldix

> Sistema de gestión de taller para empresas de soldadura y calderería industrial.

![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-003B57?style=flat&logo=sqlite&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)

---

## ¿Qué es Weldix?

Weldix es una aplicación web SaaS diseñada para digitalizar la gestión operativa de talleres de soldadura y calderería industrial. Nace de la experiencia real de 10 años trabajando en el sector: el papel, los whatsapps y las hojas de Excel son el estándar actual. Weldix los reemplaza con un sistema claro, rápido.

**Problema que resuelve:**
- Pérdida de información en órdenes de trabajo en papel
- Sin trazabilidad de qué operario hizo qué y cuándo
- Stock gestionado de memoria o en Excel desactualizado
- Sin visibilidad del estado del taller en tiempo real

**Lo que aporta Weldix:**
- Gestión de órdenes de trabajo (OTs) con flujo de estados definido
- Dashboard del operario accesible desde cualquier ordenador o tablet del taller
- Panel de administración con métricas globales del taller
- Control de stock con alertas de mínimos
- Asistente IA con conocimiento del taller en tiempo real

> **Dispositivos objetivo:** ordenadores y tablets compartidos en el taller. La interfaz es responsive y funciona en pantalla táctil, pero el modelo de uso asume estaciones de trabajo fijas o tablets de empresa — no móviles personales.

---

## Stack tecnológico

### Backend
| Tecnología | Versión | Uso |
|---|---|---|
| Python | 3.11+ | Lenguaje base |
| FastAPI | 0.111+ | Framework web y API REST |
| SQLAlchemy | 2.x | ORM — mapeo de modelos a base de datos |
| Pydantic v2 | 2.x | Validación de datos y esquemas |
| python-jose | — | Generación y verificación de JWT |
| passlib (pbkdf2) | — | Hash seguro de contraseñas |
| Mistral AI | — | Asistente IA con contexto del taller |
| SQLite | — | Base de datos en desarrollo |

### Frontend
| Tecnología | Versión | Uso |
|---|---|---|
| React | 19 | UI — arquitectura modular por feature |
| Vite | 6+ | Build tool y dev server |
| Tailwind CSS | v4 | Estilos utilitarios |
| React Router | 7 | Navegación SPA |

### Arquitectura
- **Modular por feature** (vertical slicing) — cada módulo es autónomo
- **Capas estrictas**: Componente → Hook → Service → Model → API
- **JWT HS256** con roles `admin` / `operario`
- **Strategy Pattern** para configuración de estados de trabajo
- **Guard Clauses** y **Single Responsibility** aplicados en toda la codebase

---

## Módulos implementados

| Módulo | Descripción | Estado |
|---|---|---|
| **Auth** | Login, JWT, roles, gestión de perfil | ✅ |
| **Jobs** | CRUD de OTs, flujo de estados, detalle | ✅ |
| **Dashboard** | Panel del operario: métricas, trabajo activo, iniciar OT | ✅ |
| **Stock** | CRUD de materiales, alertas de mínimos, consumo | ✅ |
| **Admin** | Métricas globales, gestión de usuarios y trabajos | ✅ |
| **IA** | Chat Mistral con contexto dinámico del taller | ✅ |
| **Historial** | Línea de tiempo de eventos por trabajo | ⬜ |
| **PDF** | Documentos y facturas por trabajo | ⬜ |
| **Fichaje** | Control de horas por trabajo | ⬜ |
| **n8n** | Motor de automatizaciones: notificaciones, alertas, resúmenes diarios | ⬜ |


---

## Flujo de estados de una OT

```
pendiente → en_proceso → control → listo → entregado
```

El operario inicia un trabajo escaneando o introduciendo el código OT (`ORD-YYYY-NNN`). El backend valida el estado y auto-asigna al operario. Cada transición queda registrada.

---

## Requisitos previos

- Python 3.11+
- Node.js 18+ y npm
- Git

---

## Instalación y arranque

### 1. Clonar el repositorio

```bash
git clone https://github.com/fernando-delrio/weldix.git
cd weldix
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus valores:

```env
SECRET_KEY=tu_clave_secreta_larga_y_aleatoria
DATABASE_URL=sqlite:///./weldix.db
MISTRAL_API_KEY=tu_api_key_de_mistral
ALLOWED_ORIGINS=http://localhost:5173
SEED_DEMO_DATA=true   # false en producción
```

### 3. Backend

```bash
# Crear entorno virtual
python -m venv .venv
source .venv/bin/activate      # Linux/Mac
.venv\Scripts\activate         # Windows

# Instalar dependencias
pip install -r requirements.txt

# Arrancar (crea tablas y seed de admin automáticamente)
uvicorn backend.main:app --reload
```

La API estará disponible en `http://localhost:8000`.
Documentación interactiva: `http://localhost:8000/docs`

### 4. Frontend

```bash
cd frontend
npm install
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

---

## Credenciales por defecto (seed)

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
│   ├── core/               # Config, DB, seguridad, bootstrap
│   └── features/
│       ├── auth/           # Login, JWT, usuarios
│       ├── jobs/           # Órdenes de trabajo
│       ├── stock/          # Materiales del taller
│       ├── dashboard/      # Endpoints del panel operario
│       ├── admin/          # Panel de administración
│       └── ia/             # Integración Mistral
├── frontend/
│   └── src/
│       └── modules/
│           ├── auth/
│           ├── jobs/
│           ├── dashboard/
│           ├── admin/
│           ├── ia/
│           └── core/       # Componentes y utilidades compartidas
├── .env.example
└── README.md
```

---

## API — Endpoints principales

| Método | Ruta | Descripción | Rol |
|---|---|---|---|
| POST | `/auth/login` | Autenticación | Público |
| GET | `/auth/me` | Perfil del usuario | Autenticado |
| GET | `/trabajos` | Lista de trabajos | Autenticado |
| POST | `/trabajos` | Crear trabajo | Admin |
| PATCH | `/trabajos/{id}/estado` | Avanzar estado | Autenticado |
| GET | `/stock` | Lista de materiales | Autenticado |
| POST | `/stock/{id}/consume` | Consumir material | Autenticado |
| GET | `/dashboard/worker` | Métricas del operario | Operario |
| GET | `/admin/dashboard` | Métricas globales | Admin |
| POST | `/ia/consulta` | Chat con el asistente | Autenticado |

---

## Roles

| Rol | Acceso |
|---|---|
| `admin` | Panel completo, todos los trabajos, gestión de usuarios, creación de OTs |
| `operario` | Solo sus trabajos activos, iniciar OT por código, stock, IA |

> El registro público está cerrado. Solo el admin puede crear cuentas vía panel de administración.

---

## Seguridad

- Tokens JWT HS256 con expiración configurable
- Contraseñas hasheadas con `pbkdf2_sha256`
- Rate limiting en login: 5 intentos fallidos → bloqueo 10 minutos
- CORS configurado por variable de entorno (no `*` en producción)
- Endpoints protegidos por rol en cada router

---

## Hoja de ruta

- [x] Gestión de OTs con flujo de estados
- [x] Panel operario y admin
- [x] Stock con alertas de mínimos
- [x] Asistente IA con contexto del taller
- [x] Página de detalle de trabajo
- [ ] Historial de eventos por trabajo
- [ ] Generación de documentos PDF
- [ ] Control de fichaje y horas
- [ ] Kanban drag & drop
- [ ] Notificaciones en tiempo real (WebSockets)
- [ ] Portal del cliente (link público por trabajo)
- [ ] Automatizaciones con n8n (webhooks → WhatsApp, email, PDF, resumen diario)
- [ ] Notificaciones WhatsApp / Email al cliente al cambiar estado de su OT
- [ ] Alerta al admin si una OT lleva +48h sin cambio de estado
- [ ] Alerta de stock bajo al responsable de compras
- [ ] Email de bienvenida automático al crear un operario
- [ ] Resumen diario del taller por email (cron 18:00)
- [ ] PDF automático al cliente cuando su OT pasa a `entregado`

---

## Licencia

MIT
