<div align="center">

<img src="frontend/public/weldix-icon.svg" alt="Weldix" width="72" />

# Weldix

### El sistema de gestión que entiende tu taller.

**OTs · Fichaje · Stock · RRHH · GMAO · IA · SaaS multi-taller**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat&logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?style=flat&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-offline--ready-5A0FC8?style=flat&logo=pwa&logoColor=white)](#)
[![Mistral AI](https://img.shields.io/badge/Mistral-AI-orange?style=flat&logo=data:image/svg+xml;base64,PHN2Zy8+)](#)
[![Stripe](https://img.shields.io/badge/Stripe-pagos-635BFF?style=flat&logo=stripe&logoColor=white)](#)
[![CI](https://img.shields.io/github/actions/workflow/status/1855-git/weldix/test.yml?label=CI&style=flat)](https://github.com/1855-git/weldix/actions)
[![License](https://img.shields.io/badge/licencia-Propietaria-red?style=flat)](#licencia)

[**Demo en vivo**](https://weldix.app) · [**Solicitar acceso**](mailto:hola@weldix.app) · [**Stack técnico**](#stack-completo)

</div>

---

## El problema

En la mayoría de talleres de soldadura y calderería, la gestión sigue igual que hace 20 años: papel, Excel, llamadas de teléfono. Las órdenes se pierden. El stock se gestiona de memoria. Las horas se calculan a mano al final del mes.

**Weldix lo digitaliza todo, sin complicarlo.**

---

## Qué hace

| | Funcionalidad | Para quién |
|---|---|---|
| 📋 | **Órdenes de trabajo** — CRUD completo, flujo de 5 estados, historial de eventos | Admin + Operario |
| ⏱️ | **Fichaje** — entrada/salida desde tablet, historial, cierre forzado | Operario |
| 📦 | **Stock** — materiales, alertas de mínimos, consumos por OT | Admin + Operario |
| 👷 | **RRHH** — vacaciones, ausencias, festivos, aprobación por jefe, calendario | Equipo |
| 🔧 | **GMAO** — maquinaria del taller con semáforo de mantenimiento | Admin |
| 📸 | **Fotos** — galería antes/durante/después con lightbox por trabajo | Operario |
| 📱 | **QR Scanner** — iniciar OT desde tablet escaneando el código físico | Operario |
| 🤖 | **IA Mistral** — chat con contexto real del taller: OTs, stock, operarios | Equipo |
| 📊 | **Dashboard + gráficos** — métricas globales, donut de estados, carga por operario | Admin |
| 🗂️ | **Kanban** — vista tablero con drag & drop para mover OTs entre estados | Admin |
| 💰 | **Nóminas** — el admin sube PDFs por mes, el operario descarga las suyas | Equipo |
| 🔔 | **Avisos en tiempo real** — campana WebSocket: stock bajo, OT bloqueada, mantenimiento vencido | Equipo |
| 🌐 | **Portal cliente** — enlace público para que el cliente siga su OT sin cuenta | Cliente final |
| 🔑 | **Recuperación de contraseña** — enlace por email o reset por el admin para operarios sin correo | Todos |
| 🏢 | **Multi-tenant** — cada taller es un workspace completamente aislado | SaaS |
| 📲 | **PWA instalable** — funciona en tablet sin App Store, con caché offline | Todos |

---

## Flujo de una orden de trabajo

```
[admin crea OT]  →  pendiente  →  en_proceso  →  control  →  listo  →  entregado
                      ↑               ↑
               [operario escanea QR] [registra materiales + fotos + horas]
```

Cada transición queda registrada en el historial con timestamp y usuario. El jefe ve el estado de todo el taller en tiempo real, desde cualquier pantalla.

---

## Arquitectura

```
React 19 + Vite          →  SPA modular por feature (auth / jobs / fichaje / stock / rrhh / ia / …)
FastAPI + SQLAlchemy      →  API REST + ORM con soporte SQLite (dev) y PostgreSQL (prod)
Alembic                  →  Migraciones versionadas con rollback
JWT HS256                →  Auth con roles admin / operario
Tenant isolation         →  Cada tabla filtra por tenant_id — aislamiento completo
WebSocket                →  Campana de avisos en tiempo real por tenant (alertas)
Resend                   →  Emails transaccionales: bienvenida, trial, reset de contraseña
n8n (self-hosted)        →  Automatizaciones opcionales: webhooks por estado, WhatsApp
Stripe                   →  Suscripción + trial 15 días + gestión de plan en Tenant
Mistral AI               →  LLM con contexto dinámico del taller en cada consulta
```

**Principios:** Feature-based vertical slicing · Strategy Pattern · Guard Clauses · SOLID · DRY · KISS

---

## Arranque en 5 minutos

```bash
git clone https://github.com/1855-git/weldix.git && cd weldix
cp .env.example .env            # añade SECRET_KEY y MISTRAL_API_KEY

# Backend
pip install -r requirements.txt
uvicorn backend.main:app --reload

# Frontend (otra terminal)
cd frontend && npm install && npm run dev
```

**Credenciales por defecto:** `admin@weldix.com` / `admin123`

App en `http://localhost:5174` · API Docs en `http://localhost:8000/docs`

---

## Stack completo

### Backend
| Tecnología | Rol |
|---|---|
| **Python 3.11 + FastAPI** | API REST con validación automática, async nativo y docs Swagger |
| **SQLAlchemy 2 + Alembic** | ORM tipado + migraciones versionadas con rollback |
| **Pydantic v2** | Validación y serialización de entrada/salida |
| **python-jose / passlib** | JWT HS256 + hash `pbkdf2_sha256` |
| **SQLite → PostgreSQL** | SQLite en dev (cero setup), PostgreSQL en prod (mismo código vía ORM) |
| **uvicorn + wsproto** | Servidor ASGI + soporte WebSocket para avisos en tiempo real |

### Frontend
| Tecnología | Rol |
|---|---|
| **React 19 + Vite** | SPA modular por feature, HMR instantáneo, bundle tree-shaken |
| **Tailwind CSS v4** | Estilos utilitarios + theming dark/light con CSS variables |
| **React Router 7** | Rutas protegidas por rol, lazy loading, nested routes |
| **Recharts · dnd-kit · FullCalendar** | Gráficos del dashboard · Kanban drag&drop · calendario RRHH |
| **html5-qrcode · vite-plugin-pwa** | Escáner QR desde cámara · PWA instalable con caché offline |

### Integraciones e infra
| Tecnología | Rol |
|---|---|
| **Mistral AI** | Asistente con contexto real del taller (OTs, stock, operarios) |
| **Stripe** | Suscripción, trial 15 días, Checkout + webhooks firmados |
| **Resend** | Emails transaccionales: bienvenida, trial, reset de contraseña |
| **n8n (self-hosted)** | Automatizaciones opcionales: WhatsApp, Sheets, webhooks por estado |
| **GitHub Actions** | CI: lint (ESLint/Black/isort) + tests (pytest/Vitest) + bundle check |

---

## Por qué este stack y no otro

Cada elección resuelve un problema concreto de este proyecto, no una moda:

- **FastAPI, no Django ni Flask.** Django trae de más (admin, templates, su propio ORM) para lo que es una API pura; Flask trae de menos (validación, docs y async a mano). FastAPI da el punto medio: ligero, pero con validación Pydantic, async y Swagger gratis.
- **SQLAlchemy + Alembic, no SQL a mano.** El ORM parametriza las queries (defensa nativa contra inyección) y Alembic versiona el schema con `upgrade`/`downgrade`. Sin migraciones no hay rollback ni despliegue seguro.
- **SQLite en dev, PostgreSQL en prod.** SQLite se crea solo (cero fricción para arrancar). En producción PostgreSQL aporta concurrencia real y tipos que un SaaS necesita (`TIMESTAMPTZ`, `JSONB`). El mismo código sirve para ambos porque el ORM abstrae el dialecto.
- **JWT HS256, no sesiones en servidor.** Un token stateless escala en horizontal sin *sticky sessions* ni almacén de sesiones compartido — justo lo que pide un SaaS. HS256 (secreto simétrico) basta habiendo un solo emisor.
- **React, no Vue/Svelte/Angular.** Angular pesa demasiado para esta app; Vue y Svelte son excelentes, pero React tiene el ecosistema y el mercado laboral más grandes, y su modelo de hooks encaja con la arquitectura por capas (componente → hook → service).
- **Tailwind v4, no MUI ni styled-components.** MUI impondría su estética; styled-components mete CSS-in-JS en runtime. Tailwind da velocidad y control visual total, con theming dark/light por variables CSS y **cero JS en runtime**.
- **Context + hooks, no Redux/Zustand desde el día 1.** Lo único global es la sesión (Context). El resto es estado de servidor (hook + fetch) o de URL (`useSearchParams`). Meter Redux antes de que duela sería *over-engineering* — se subirá de nivel cuando haya dolor real, no por especular.
- **Mistral, no OpenAI.** LLM europeo: los datos se procesan en la UE (GDPR más simple para un producto dirigido a talleres españoles) con buena relación coste/calidad.
- **Resend, no SMTP crudo.** SMTP a mano es dolor de configuración y problemas de entregabilidad; Resend da una API moderna y buena reputación de envío con muy poco código.
- **n8n, no automatizaciones hardcodeadas.** Los flujos (WhatsApp al cliente, resumen diario, Sheets) se cambian sin tocar ni desplegar el backend. Como Zapier, pero self-hosted: sin coste por operación y sin que los datos pasen por un SaaS ajeno.
- **WebSocket en proceso, no Redis todavía.** El manager de conexiones vive en memoria: suficiente para un worker. Redis Pub/Sub se añadirá cuando haya varios workers, no antes. Deuda técnica consciente y documentada, no accidental.

---

## Seguridad

- Contraseñas con `pbkdf2_sha256` — nunca en texto plano
- Rate limiting en login (5 intentos → 10 min), en recuperación y en registro de talleres
- Recuperación de contraseña con token de un solo uso (TTL 1 h) — sin revelar si el email existe
- Todos los endpoints validan rol antes de ejecutar
- Aislamiento por `tenant_id` — un taller no puede ver datos de otro
- CORS por variable de entorno — sin `*` en producción
- Guard de arranque en producción: aborta si el JWT es inseguro, si `/docs` queda abierto o si el origen es localhost
- Secrets en `.env` — ninguna credencial en el código

---

## Estructura del proyecto

```
weldix/
├── backend/
│   ├── core/           # config, database, security, cache, feature_flags
│   └── features/       # auth · jobs · fichaje · stock · fotos · rrhh · equipos · admin · ia · nominas · …
├── frontend/
│   └── src/modules/    # auth · jobs · dashboard · admin · stock · rrhh · equipos · ia · core · …
├── .github/workflows/  # CI: lint + tests + bundle check
├── migrations/         # Alembic — historial completo del schema
└── .env.example
```

---

## Hoja de ruta

### Completado ✅

- Gestión de OTs con flujo de 5 estados + historial de eventos
- Dashboard admin con gráficos (Recharts): donut estados, carga operario, OTs por mes
- Vista Kanban con drag & drop para cambiar estado de OTs (dnd-kit)
- Control de stock con alertas de mínimos y registro de consumos
- Fichaje de jornada con historial y cierre forzado por admin
- Registro de horas imputadas por OT y resumen por operario
- Galería de fotos por trabajo (antes / durante / después)
- Escáner QR para iniciar OT desde tablet
- GMAO: gestión de maquinaria con semáforo de mantenimiento
- Módulo RRHH: ausencias, vacaciones, festivos, calendario (FullCalendar)
- Nóminas: admin sube PDFs, operario descarga las suyas por mes y año
- Asistente IA con contexto real del taller (Mistral)
- Multi-tenant: workspace aislado por taller
- Onboarding wizard de 5 pasos para nuevos admins
- PWA instalable con caché offline (vite-plugin-pwa)
- Tema dark / light con toggle global — CSS variables Tailwind v4
- Emails transaccionales con Resend: bienvenida, aviso de trial, recuperación de contraseña
- Recuperación de contraseña: enlace por email + reset por el admin para operarios sin correo
- Stripe integrado: suscripción, trial 15 días, webhook de confirmación de pago
- Landing page pública (`/`) con hero, features y precios
- Trial automático de 15 días + página `/trial-expirado` con CTA de contratación
- WebSocket: campana de avisos en tiempo real (stock bajo, OT bloqueada, mantenimiento)
- Portal cliente: enlace público `/seguimiento/:token` para seguir la OT sin cuenta
- PDF del parte de trabajo descargable
- CI/CD con GitHub Actions (lint + tests + bundle size check)
- Páginas legales: Términos, Privacidad (GDPR)

### Próximo

- [ ] Factura PDF con IVA, número de serie y logo del taller
- [ ] Notificaciones n8n: WhatsApp/Email al cliente por cambio de estado de OT
- [ ] Firma digital del cliente al recibir el trabajo
- [ ] Kanban con métricas avanzadas y filtros guardados

---

## Autor y contacto

**Fernando Del Rio** — 10 años en el sector de soldadura y calderería, en transición a desarrollo full-stack.

- Email: [fernandogondelrio@gmail.com](mailto:fernandogondelrio@gmail.com)
- Demo o consultas: [hola@weldix.app](mailto:hola@weldix.app)

---

## Licencia

Copyright (c) 2026 Fernando Del Rio. Todos los derechos reservados.

Código visible con fines de evaluación técnica y portfolio. La visibilidad del repositorio no implica ninguna licencia de uso, copia ni distribución. Para licencia comercial: [fernandogondelrio@gmail.com](mailto:fernandogondelrio@gmail.com)
