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

[**Demo en vivo**](https://weldix.app) · [**Solicitar acceso**](mailto:hola@weldix.app) · [**Stack técnico**](doc/tech-stack.md)

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
n8n (self-hosted)        →  Automatizaciones: email de bienvenida, webhooks por estado
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

Ver [`doc/tech-stack.md`](doc/tech-stack.md) para el desglose completo de tecnologías, integraciones y decisiones de arquitectura.

**Resumen:** Python 3.11 · FastAPI · SQLAlchemy · Alembic · Pydantic v2 · React 19 · Vite · Tailwind v4 · React Router 7 · Recharts · dnd-kit · FullCalendar · Mistral AI · Stripe · n8n · GitHub Actions · PWA

---

## Seguridad

- Contraseñas con `pbkdf2_sha256` — nunca en texto plano
- Rate limiting en login: 5 intentos → bloqueo 10 min
- Todos los endpoints validan rol antes de ejecutar
- Aislamiento por `tenant_id` — un taller no puede ver datos de otro
- CORS por variable de entorno — sin `*` en producción
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
├── doc/                # tech-stack.md, módulos, filosofía, deuda técnica
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
- n8n integrado: email de bienvenida al crear workspace
- Stripe integrado: suscripción, trial 15 días, webhook de confirmación de pago
- CI/CD con GitHub Actions (lint + tests + bundle size check)
- Páginas legales: Términos, Privacidad (GDPR)

### En curso — Fase 6 (Lanzamiento)

- [ ] Landing page pública (`/`) con hero, features, precios
- [ ] Trial automático de 15 días al crear workspace
- [ ] Banner de aviso cuando quedan < 5 días de trial
- [ ] Página `/trial-expirado` con CTA de contratación

### Próximo

- [ ] PDF del trabajo y factura con logo del taller (WeasyPrint)
- [ ] Notificaciones n8n: WhatsApp/Email por cambio de estado de OT
- [ ] WebSockets: campana de avisos en tiempo real
- [ ] Portal cliente: link público para seguir su OT sin cuenta
- [ ] Firma digital del cliente al recibir el trabajo

---

## Autor y contacto

**Fernando Del Rio** — 10 años en el sector de soldadura y calderería, en transición a desarrollo full-stack.

- Email: [fernandogondelrio@gmail.com](mailto:fernandogondelrio@gmail.com)
- Demo o consultas: [hola@weldix.app](mailto:hola@weldix.app)

---

## Licencia

Copyright (c) 2026 Fernando Del Rio. Todos los derechos reservados.

Código visible con fines de evaluación técnica y portfolio. La visibilidad del repositorio no implica ninguna licencia de uso, copia ni distribución. Para licencia comercial: [fernandogondelrio@gmail.com](mailto:fernandogondelrio@gmail.com)
