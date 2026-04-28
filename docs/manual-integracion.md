# Manual de Integracion

## Objetivo

Este documento describe como desplegar, integrar y extender tecnicamente `Audit Evidence Copilot` con foco en backend de produccion y configuracion de `Azure AI Foundry`.

## Stack actual

- `Node.js`
- `Express`
- `PostgreSQL`
- `Docker Compose`
- frontend SPA sin framework

## Backend endurecido

El backend actual incorpora:

- `helmet`
- rate limiting
- `X-Request-Id`
- CORS parametrizable
- pool PostgreSQL configurable
- cifrado de secretos de proveedores IA
- endpoint de readiness
- manejo centralizado de errores
- OpenAPI JSON

Archivo principal:

- [server.js](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\server.js)

## Base de datos

Esquema:

- [schema.sql](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\db\schema.sql)

Motor:

- PostgreSQL

## Frontend

Archivos principales:

- [index.html](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\index.html)
- [styles.css](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\styles.css)
- [app.js](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\js\app.js)

## Variables de entorno

Archivo base:

- [.env.example](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\.env.example)

Variables clave:

```env
NODE_ENV=production
PORT=3000
APP_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://audit:audit@localhost:5432/auditcopilot
APP_ENCRYPTION_KEY=change-this-with-a-strong-secret
ALLOWED_ORIGINS=http://localhost:3000
TRUST_PROXY=false
DB_SSL=false
DB_POOL_MAX=20
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
AI_FALLBACK_TO_HEURISTIC=true
AI_PROVIDER_NAME=azure-foundry
AI_MODEL_NAME=configurar-modelo
```

## Despliegue con Docker

Archivos:

- [docker-compose.yml](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docker-compose.yml)
- [Dockerfile](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\Dockerfile)

Comando:

```bash
docker compose up -d --build
```

## Endpoints operativos

- `GET /api/health`
- `GET /api/readyz`
- `GET /api/openapi.json`

## Endpoints principales

### Marcos normativos

- `GET /api/frameworks`
- `POST /api/frameworks`
- `GET /api/frameworks/:id/controls`
- `POST /api/frameworks/:id/controls`

### Evaluaciones

- `GET /api/evaluations`
- `POST /api/evaluations`
- `GET /api/evaluations/:id/controls`
- `POST /api/evaluations/:id/process`

### Controles evaluados

- `POST /api/evaluation-controls/:id/notes`
- `GET /api/evaluation-controls/:id/evidences`
- `POST /api/evaluation-controls/:id/evidences/upload`
- `POST /api/evaluation-controls/:id/evidences/reference`
- `POST /api/evaluation-controls/:id/process`
- `POST /api/evaluation-controls/:id/create-finding`

### Hallazgos

- `GET /api/findings`
- `POST /api/findings`
- `PATCH /api/findings/:id`
- `GET /api/findings/:id/action-plans`
- `POST /api/findings/:id/action-plans`
- `PATCH /api/action-plans/:id`

### Proveedores IA

- `GET /api/settings`
- `POST /api/ai-providers`
- `PATCH /api/ai-providers/:id`
- `POST /api/ai-providers/:id/test`
- `POST /api/settings/prompt`

## Azure AI Foundry soportado

Se soporta la configuracion del endpoint base de Foundry con este formato:

- `https://<resource>.services.ai.azure.com/models`

Llamadas implementadas:

- `POST /chat/completions?api-version=...`
- `GET /info?api-version=...` para prueba de conexion

Cabecera:

- `api-key`

Campo de despliegue enviado:

- `model`

Datos configurables por proveedor:

- `provider_kind`
- `provider_type`
- `model_name`
- `deployment_name`
- `endpoint_url`
- `api_version`
- `secret`

## Cifrado de secretos

La API key del proveedor se cifra con `APP_ENCRYPTION_KEY` usando AES-256-GCM antes de persistirse.

Sin `APP_ENCRYPTION_KEY`:

- no deberias operar en produccion,
- no se deben guardar secretos de proveedor.

## Evaluacion automatica

La funcion `computeAssessment()` sigue este orden:

1. intenta usar el proveedor IA activo configurado,
2. si falla y `AI_FALLBACK_TO_HEURISTIC=true`, usa heuristica,
3. persiste resultado,
4. actualiza estado del control,
5. genera hallazgo si corresponde.

## Recomendaciones de produccion pendientes

- autenticacion real
- RBAC
- vault o secret manager
- colas asincronas
- OCR
- parsing documental
- tests automatizados
- observabilidad centralizada

## Limpieza de una base antigua

Si vienes de una version previa con datos precargados:

- elimina el volumen Docker de PostgreSQL, o
- vacia manualmente la base.
