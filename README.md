# normAIso v1.0 - BY Eduardo Restrepo

Plataforma web para auditoria interna orientada a marcos como `ISO 42001`, `ISO 27001`, `ENS` y otros catalogos de control, con evidencia multi-origen, evaluacion automatica por control, hallazgos, planes de accion y trazabilidad completa.

## Resumen ejecutivo

La solucion ya no se comporta como una app de checklist simple. El backend esta orientado a un flujo de auditoria basado en:

1. catalogo normativo,
2. generacion de evaluaciones versionadas,
3. asociacion de evidencia principal y compensatoria,
4. evaluacion automatica control a control,
5. apertura de hallazgos y seguimiento de remediacion,
6. registro de actividad y estado historico.

La aplicacion arranca vacia. No crea datos demo, usuarios de prueba ni marcos precargados.

## Estado actual del sistema

La base funcional ya incluye:

- backend `Node.js + Express`,
- persistencia en `PostgreSQL`,
- despliegue con `Docker Compose`,
- esquema relacional inicial con historico de resultados,
- marcos normativos y controles configurables,
- evaluaciones y clonacion de controles a la instancia de auditoria,
- carga de evidencia manual y referencia a evidencia externa,
- registro de conectores documentales,
- configuracion de proveedores IA,
- soporte de configuracion para `Azure AI Foundry`,
- prompts por marco a traves de `settings`,
- hallazgos y planes de accion,
- bitacora operativa,
- endpoints de salud y readiness,
- cifrado de secretos de proveedor,
- fallback heuristico cuando el proveedor IA no responde.

## Arquitectura actual

```text
Navegador
   |
   v
index.html + js/app.js + styles.css
   |
   v
Express API (server.js)
   |
   +--> PostgreSQL (db/schema.sql)
   |
   +--> Uploads locales (/uploads)
   |
   +--> Azure AI Foundry u otro proveedor futuro
```

### Componentes

- [server.js](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\server.js)
  API REST, seguridad basica, flujo de evaluacion, acceso a PostgreSQL, cifrado de secretos y llamadas al proveedor IA.
- [db/schema.sql](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\db\schema.sql)
  Esquema relacional inicial y alteraciones evolutivas.
- [index.html](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\index.html)
  Shell principal de la SPA.
- [js/app.js](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\js\app.js)
  Cliente frontend, manejo de formularios y consumo de API.
- [Dockerfile](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\Dockerfile)
  Imagen productiva Node 20, `npm ci --omit=dev`, usuario no root.
- [docker-compose.yml](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docker-compose.yml)
  Stack local con `app` y `postgres`.

## Flujo funcional principal

1. Se registra un marco normativo en `frameworks`.
2. Se cargan los controles del marco en `framework_controls`.
3. Se crean conectores y proveedores IA si aplica.
4. Se crea una evaluacion en `evaluations`.
5. El sistema instancia los controles del marco en `evaluation_controls`.
6. El auditor adjunta evidencias manuales o referenciadas en `evidences`.
7. El backend procesa cada control y persiste el resultado en `ai_assessments`.
8. Si el resultado es debil, genera `findings`.
9. Los hallazgos pueden disparar `action_plans`.
10. Todas las acciones relevantes quedan reflejadas en `audit_logs`.

## Endurecimiento ya implementado

El backend ya incluye medidas practicas para un entorno serio:

- `helmet` para cabeceras seguras,
- `express-rate-limit`,
- `CORS` parametrizable por variable de entorno,
- `X-Request-Id` por solicitud,
- comprobacion temprana de `DATABASE_URL`,
- pool PostgreSQL configurable,
- `health` y `readyz`,
- error handler centralizado,
- cifrado `AES-256-GCM` para secretos de proveedores IA,
- sanitizacion de proveedores antes de devolverlos al frontend,
- contenedor Node ejecutado como usuario no root,
- imagen Docker sin dependencias de desarrollo.

## Requisitos

### Local sin Docker

- Node.js `20+`
- PostgreSQL `16+`

### Local o despliegue con Docker

- Docker Desktop o Docker Engine
- Docker Compose v2

## Inicio rapido con Docker

1. Crear `.env` a partir de [.env.example](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\.env.example).
2. Ajustar al menos `DATABASE_URL`, `APP_ENCRYPTION_KEY` y `ALLOWED_ORIGINS`.
3. Arrancar:

```bash
docker compose up -d --build
```

4. Abrir [http://localhost:3000](http://localhost:3000).

## Inicio local sin Docker

1. Crear `.env` a partir de [.env.example](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\.env.example).
2. Instalar dependencias:

```bash
npm install
```

En PowerShell:

```bash
npm.cmd install
```

3. Asegurar una base PostgreSQL accesible.
4. Iniciar:

```bash
npm start
```

## Variables de entorno

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `NODE_ENV` | no | `production` activa endurecimiento y SSL opcional en PostgreSQL |
| `PORT` | no | puerto HTTP del backend |
| `APP_BASE_URL` | no | URL base publicada y usada por OpenAPI |
| `DATABASE_URL` | si | cadena de conexion PostgreSQL |
| `APP_ENCRYPTION_KEY` | si para secretos | clave base para cifrar API keys de proveedores |
| `ALLOWED_ORIGINS` | no, muy recomendada | lista separada por comas para CORS |
| `TRUST_PROXY` | no | activa `trust proxy` en Express |
| `DB_SSL` | no | habilita SSL a PostgreSQL en `production` si no vale `false` |
| `DB_POOL_MAX` | no | conexiones maximas del pool |
| `DB_IDLE_TIMEOUT_MS` | no | tiempo ocioso del pool |
| `DB_CONNECT_TIMEOUT_MS` | no | timeout de conexion |
| `MAX_FILE_SIZE_MB` | no | limite de subida de archivos |
| `MAX_JSON_SIZE` | no | limite de payload JSON |
| `RATE_LIMIT_WINDOW_MS` | no | ventana del rate limit |
| `RATE_LIMIT_MAX` | no | maximo de solicitudes por ventana |
| `AI_FALLBACK_TO_HEURISTIC` | no | si falla el proveedor IA usa heuristica |
| `AI_PROVIDER_NAME` | no | metadato usado por el fallback |
| `AI_MODEL_NAME` | no | metadato usado por el fallback |

Ejemplo base:

```env
NODE_ENV=production
PORT=3000
APP_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://audit:audit@localhost:5432/auditcopilot
APP_ENCRYPTION_KEY=change-this-with-a-strong-32-byte-secret
ALLOWED_ORIGINS=http://localhost:3000
TRUST_PROXY=false
DB_SSL=false
DB_POOL_MAX=20
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECT_TIMEOUT_MS=10000
MAX_FILE_SIZE_MB=20
MAX_JSON_SIZE=2mb
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
AI_FALLBACK_TO_HEURISTIC=true
AI_PROVIDER_NAME=azure-foundry
AI_MODEL_NAME=configurar-modelo
```

## Azure AI Foundry

La configuracion del proveedor se hace desde la UI en `Configuracion`, o por API mediante `POST /api/ai-providers`.

Campos relevantes:

- `name`
- `providerType`
- `providerKind = azure_foundry`
- `modelName`
- `deploymentName`
- `endpointUrl`
- `apiVersion`
- `secret`
- `secretHint`

### Contrato esperado

- Endpoint base:
  `https://<resource>.services.ai.azure.com/models`
- Prueba de conexion:
  `GET /info?api-version=<version>`
- Inferencia:
  `POST /chat/completions?api-version=<version>`
- Cabecera:
  `api-key`
- Campo enviado como modelo:
  `deployment_name || model_name`

El backend obliga a que la respuesta del modelo sea JSON parseable con este contrato logico:

```json
{
  "result": "cumple_parcialmente",
  "confidence": 0.74,
  "summary": "Resumen corto",
  "strengths": ["..."],
  "gaps": ["..."],
  "missing_evidence": ["..."],
  "recommendation": "..."
}
```

## API disponible

### Operacion y estado

- `GET /api/health`
- `GET /api/readyz`
- `GET /api/openapi.json`
- `GET /api/dashboard`

### Catalogo normativo

- `GET /api/frameworks`
- `POST /api/frameworks`
- `GET /api/frameworks/:id/controls`
- `POST /api/frameworks/:id/controls`

### Ejecucion de auditoria

- `GET /api/evaluations`
- `POST /api/evaluations`
- `GET /api/evaluations/:id/controls`
- `POST /api/evaluations/:id/process`
- `POST /api/evaluation-controls/:id/notes`
- `GET /api/evaluation-controls/:id/evidences`
- `POST /api/evaluation-controls/:id/evidences/upload`
- `POST /api/evaluation-controls/:id/evidences/reference`
- `POST /api/evaluation-controls/:id/process`

### Hallazgos y remediacion

- `POST /api/evaluation-controls/:id/create-finding`
- `GET /api/findings`
- `POST /api/findings`
- `PATCH /api/findings/:id`
- `GET /api/findings/:id/action-plans`
- `POST /api/findings/:id/action-plans`
- `PATCH /api/action-plans/:id`

### Configuracion

- `GET /api/connectors`
- `POST /api/connectors`
- `GET /api/settings`
- `POST /api/ai-providers`
- `PATCH /api/ai-providers/:id`
- `POST /api/ai-providers/:id/test`
- `POST /api/settings/prompt`
- `GET /api/audit-logs`

## Persistencia

La base relacional se organiza en estas entidades:

- `users`
- `frameworks`
- `framework_controls`
- `evaluations`
- `evaluation_controls`
- `evidences`
- `connectors`
- `ai_providers`
- `ai_assessments`
- `findings`
- `action_plans`
- `audit_logs`
- `settings`

La documentacion detallada del modelo esta en [docs/data-map.md](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\data-map.md).

## Comportamiento del motor de evaluacion

El flujo de `computeAssessment()` es:

1. carga el control evaluado,
2. carga evidencias y conector asociado,
3. arma un `assessmentInput`,
4. intenta usar el proveedor IA activo,
5. si falla y `AI_FALLBACK_TO_HEURISTIC=true`, ejecuta la heuristica local,
6. persiste el resultado en `ai_assessments`,
7. actualiza `evaluation_controls.ai_status` y `ai_confidence`,
8. crea hallazgo automatico cuando el resultado es debil,
9. escribe evento en `audit_logs`.

## Documentacion incluida

- [Mapa de datos](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\data-map.md)
- [Manual de usuario](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\manual-usuario.md)
- [Manual de integracion](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\manual-integracion.md)
- [Roadmap tecnico](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\roadmap-tecnico.md)
- [Especificacion OpenAPI resumida](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\openapi.json)
- [Vision funcional del reajuste](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\reajuste-app-auditoria-ia.md)

## Recomendaciones para produccion real

Lo que ya esta resuelto:

- hardening base HTTP,
- cifrado de secretos de proveedor,
- contenedorizacion razonable,
- trazabilidad operativa,
- configuracion Azure Foundry,
- persistencia historica de evaluaciones.

Lo que aun conviene completar antes de una explotacion enterprise:

- autenticacion real,
- RBAC por rol, evaluacion y organizacion,
- gestion externa de secretos,
- migraciones formales en vez de autoaplicar schema completo,
- cola asincrona para procesos pesados,
- OCR y parsing documental,
- almacenamiento externo para binarios,
- observabilidad centralizada,
- backup y restauracion automatizados,
- tests automatizados y pipeline CI/CD.

## Nota sobre volumenes y bases antiguas

Si vienes de una version anterior con datos precargados, el backend nuevo no los elimina solo. Para arrancar vacio debes:

- recrear el volumen de PostgreSQL, o
- vaciar manualmente la base existente.
