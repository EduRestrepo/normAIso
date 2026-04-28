# Manual de Integracion

## Objetivo

Este documento describe como desplegar, configurar e integrar tecnicamente `Audit Evidence Copilot`, con foco en:

- backend endurecido para produccion,
- base de datos PostgreSQL,
- despliegue con Docker,
- integracion con `Azure AI Foundry`,
- operacion y extension del API.

## Alcance de la implementacion actual

El sistema actual cubre:

- API REST en `Express`,
- persistencia PostgreSQL,
- almacenamiento local de uploads,
- configuracion de proveedores IA,
- configuracion de conectores,
- evaluacion automatica con proveedor remoto o fallback heuristico,
- hallazgos y remediacion,
- documentacion OpenAPI resumida.

No cubre aun:

- autenticacion real,
- multi-tenant,
- cola de trabajos,
- OCR,
- parsing binario avanzado,
- integracion viva con SharePoint o OneDrive,
- observabilidad centralizada.

## Arquitectura tecnica

```text
Cliente web
   |
   v
Express API
   |
   +--> PostgreSQL
   +--> uploads/
   +--> Azure AI Foundry
```

### Responsabilidad de cada capa

- Frontend:
  captura formularios, consume API y presenta dashboard, mesa de control, hallazgos y configuracion.
- Backend:
  valida entrada, persiste entidades, cifra secretos, ejecuta evaluacion y expone endpoints.
- Base de datos:
  conserva estado transaccional, historico y configuracion funcional.
- Storage local:
  guarda archivos subidos manualmente.
- Azure AI Foundry:
  evalua evidencia textual contra un control.

## Componentes relevantes

- [server.js](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\server.js)
- [db/schema.sql](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\db\schema.sql)
- [Dockerfile](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\Dockerfile)
- [docker-compose.yml](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docker-compose.yml)
- [.env.example](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\.env.example)
- [docs/openapi.json](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\openapi.json)

## Despliegue local con Docker

### Requisitos

- Docker Engine o Docker Desktop
- Docker Compose v2

### Pasos

1. Crear `.env` a partir de `.env.example`.
2. Ajustar secretos y conexion.
3. Ejecutar:

```bash
docker compose up -d --build
```

4. Verificar:

- `GET /api/health`
- `GET /api/readyz`

### Topologia de `docker-compose.yml`

- `postgres`
  - imagen `postgres:16-alpine`
  - healthcheck con `pg_isready`
  - volumen `postgres_data`
- `app`
  - build local desde `Dockerfile`
  - `restart: unless-stopped`
  - volumen `uploads_data`
  - variables de entorno de backend

## Despliegue local sin Docker

1. Provisionar PostgreSQL.
2. Configurar `.env`.
3. Instalar dependencias:

```bash
npm install
```

En PowerShell:

```bash
npm.cmd install
```

4. Iniciar:

```bash
npm start
```

## Inicializacion de base de datos

El backend ejecuta `initDatabase()` al arrancar:

1. carga [db/schema.sql](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\db\schema.sql),
2. ejecuta el script sobre la base configurada,
3. valida conectividad con `SELECT 1`,
4. solo entonces levanta el listener HTTP.

Implicacion operativa:

- es conveniente en produccion mover esto a un proceso de migracion controlado,
- pero como bootstrap inicial funciona bien para este proyecto.

## Seguridad de backend

### Middleware HTTP

- `helmet`
- `cors`
- `express-rate-limit`
- `body-parser` con limites configurables

### Trazabilidad

Cada request recibe:

- `req.requestId`
- cabecera `X-Request-Id`

Esto permite correlacion entre logs de servidor y errores del cliente.

### Errores

El backend devuelve JSON con:

```json
{
  "error": "Error interno del servidor",
  "detail": "solo visible fuera de produccion",
  "requestId": "uuid"
}
```

### Secretos

`APP_ENCRYPTION_KEY` se usa para cifrar secretos de proveedores con `AES-256-GCM`.

Flujo:

1. el frontend envia `secret`,
2. `encryptSecret()` genera `iv + authTag + ciphertext`,
3. se persiste en `ai_providers.secret_ciphertext`,
4. `sanitizeProvider()` evita devolver el secreto,
5. `decryptSecret()` lo reconstituye solo cuando hay que llamar al proveedor.

## Variables de entorno

### Nucleo

| Variable | Uso |
| --- | --- |
| `NODE_ENV` | modo del proceso |
| `PORT` | puerto HTTP |
| `APP_BASE_URL` | URL base del servicio |
| `DATABASE_URL` | conexion PostgreSQL |

### Seguridad y red

| Variable | Uso |
| --- | --- |
| `APP_ENCRYPTION_KEY` | cifrado de secretos |
| `ALLOWED_ORIGINS` | CORS |
| `TRUST_PROXY` | proxy inverso |
| `RATE_LIMIT_WINDOW_MS` | ventana de rate limit |
| `RATE_LIMIT_MAX` | cupo por ventana |

### Base de datos

| Variable | Uso |
| --- | --- |
| `DB_SSL` | SSL al conectarse a PostgreSQL |
| `DB_POOL_MAX` | maximo de conexiones |
| `DB_IDLE_TIMEOUT_MS` | timeout de conexiones ociosas |
| `DB_CONNECT_TIMEOUT_MS` | timeout de conexion |

### Payload y uploads

| Variable | Uso |
| --- | --- |
| `MAX_FILE_SIZE_MB` | tamano maximo de subida |
| `MAX_JSON_SIZE` | limite de payload JSON |

### IA

| Variable | Uso |
| --- | --- |
| `AI_FALLBACK_TO_HEURISTIC` | fallback local si falla el proveedor |
| `AI_PROVIDER_NAME` | nombre del fallback |
| `AI_MODEL_NAME` | modelo reportado por el fallback |

## API REST

### Salud

#### `GET /api/health`

Comprueba conectividad con base de datos y devuelve un payload de estado.

Respuesta:

```json
{
  "ok": true,
  "requestId": "uuid",
  "database": "connected",
  "date": "2026-04-28T10:00:00.000Z"
}
```

#### `GET /api/readyz`

Usado como endpoint de readiness.

### Dashboard

#### `GET /api/dashboard`

Devuelve metricas agregadas:

- numero de evaluaciones,
- numero de controles instanciados,
- numero de evidencias,
- distribucion de resultados IA,
- hallazgos abiertos y cerrados,
- planes de accion abiertos y vencidos,
- agregacion por marco.

### Marcos

#### `GET /api/frameworks`

Lista marcos con `controls_count`.

#### `POST /api/frameworks`

Payload:

```json
{
  "name": "ISO/IEC 27001",
  "code": "ISO27001",
  "version": "2022",
  "description": "Sistema de gestion de seguridad"
}
```

### Controles de marco

#### `GET /api/frameworks/:id/controls`

Lista controles del marco ordenados por `sort_order, code`.

#### `POST /api/frameworks/:id/controls`

Payload:

```json
{
  "code": "A.5.1",
  "domain": "Gobierno",
  "title": "Politicas de seguridad",
  "description": "Debe existir una politica formal",
  "objective": "Definir directrices",
  "guidance": ["Revisar aprobacion", "Validar vigencia"],
  "suggestedEvidence": ["Politica firmada", "Registro de revision"],
  "sortOrder": 10
}
```

### Evaluaciones

#### `GET /api/evaluations`

Lista evaluaciones con:

- `framework_name`
- `controls_count`
- `evidences_count`

#### `POST /api/evaluations`

Payload:

```json
{
  "frameworkId": 1,
  "name": "Auditoria interna Q2",
  "auditee": "Seguridad",
  "scope": "Controles corporativos",
  "periodLabel": "2026-Q2",
  "versionLabel": "v1",
  "status": "borrador"
}
```

Comportamiento:

- abre transaccion,
- crea fila en `evaluations`,
- clona controles del marco en `evaluation_controls`,
- confirma con `COMMIT`.

#### `GET /api/evaluations/:id/controls`

Devuelve la mesa de control materializada con:

- datos del control,
- numero de evidencias,
- ultimo resultado IA,
- brechas y recomendacion,
- numero de hallazgos abiertos.

#### `POST /api/evaluations/:id/process`

Procesa todos los controles de la evaluacion secuencialmente.

Respuesta:

```json
{
  "processed": 12,
  "results": []
}
```

### Controles evaluados

#### `POST /api/evaluation-controls/:id/notes`

Permite guardar:

- `auditorNotes`
- `compensatoryNotes`
- `reviewerDecision`
- `reviewerJustification`

#### `GET /api/evaluation-controls/:id/evidences`

Lista evidencias del control.

#### `POST /api/evaluation-controls/:id/evidences/upload`

`multipart/form-data`

Campos esperados:

- `file`
- `evidenceRole`
- `sourceLabel`
- `notes`
- `clarificationText`

Comportamiento:

- guarda binario en `/uploads`,
- registra metadata en `evidences`,
- deja `extracted_text` informativo mientras no exista parser real.

#### `POST /api/evaluation-controls/:id/evidences/reference`

Payload:

```json
{
  "evidenceRole": "principal",
  "originType": "sharepoint",
  "sourceLabel": "SharePoint SGSI",
  "fileName": "Politica.pdf",
  "referencePath": "/sites/audit/Documentos/Politica.pdf",
  "externalUrl": "https://contoso.sharepoint.com/...",
  "connectorId": 2,
  "notes": "Version aprobada",
  "clarificationText": "",
  "extractedText": "Resumen o texto preparado"
}
```

#### `POST /api/evaluation-controls/:id/process`

Dispara `computeAssessment()`.

Flujo:

1. lectura del control,
2. lectura de evidencias,
3. construccion del `assessmentInput`,
4. llamada a proveedor IA activo,
5. fallback heuristico si procede,
6. persistencia del resultado,
7. alta automatica de hallazgo si aplica.

### Hallazgos

#### `POST /api/evaluation-controls/:id/create-finding`

Crea hallazgo desde el ultimo resultado del control.

Regla:

- si ya existe uno abierto o en progreso para ese control, reutiliza el existente.

#### `GET /api/findings`

Lista hallazgos con:

- nombre de evaluacion,
- codigo y titulo del control,
- numero de planes,
- avance medio.

#### `POST /api/findings`

Permite alta manual de hallazgo.

#### `PATCH /api/findings/:id`

Actualiza estado, severidad, responsable, fecha objetivo o recomendacion.

### Planes de accion

#### `GET /api/findings/:id/action-plans`

Lista planes de un hallazgo.

#### `POST /api/findings/:id/action-plans`

Alta de plan:

```json
{
  "title": "Actualizar politica",
  "description": "Alinear el documento con la version vigente",
  "ownerName": "Equipo SGSI",
  "targetDate": "2026-05-30",
  "status": "abierto",
  "progress": 0
}
```

#### `PATCH /api/action-plans/:id`

Actualiza:

- `status`
- `progress`
- `ownerName`
- `targetDate`

### Conectores

#### `GET /api/connectors`

Lista conectores.

#### `POST /api/connectors`

Payload:

```json
{
  "name": "SharePoint Riesgo",
  "connectorType": "sharepoint",
  "basePath": "/sites/audit/Controles",
  "baseUrl": "https://contoso.sharepoint.com",
  "credentialsHint": "Usar app registration corporativa",
  "config": {
    "site": "audit",
    "library": "Controles"
  }
}
```

### Configuracion general

#### `GET /api/settings`

Devuelve:

- `settings`
- `users`
- `aiProviders`

Los proveedores se devuelven saneados, sin el secreto.

#### `POST /api/settings/prompt`

Payload:

```json
{
  "frameworkCode": "ISO27001",
  "promptText": "Evalua la evidencia..."
}
```

### Proveedores IA

#### `POST /api/ai-providers`

Payload minimo para Azure Foundry:

```json
{
  "name": "Azure Foundry SGSI",
  "providerType": "azure",
  "providerKind": "azure_foundry",
  "modelName": "gpt-4.1",
  "deploymentName": "gpt-4.1",
  "endpointUrl": "https://mi-recurso.services.ai.azure.com/models",
  "apiVersion": "2024-05-01-preview",
  "isActive": true,
  "secret": "api-key-real",
  "secretHint": "Key de prod",
  "config": {}
}
```

#### `PATCH /api/ai-providers/:id`

Actualiza metadata y opcionalmente secreto.

Si `secret` llega vacio:

- el backend conserva el secreto previo.

#### `POST /api/ai-providers/:id/test`

Prueba la conectividad remota.

Para `azure_foundry`:

- hace `GET <endpoint>/info?api-version=<version>`
- con cabecera `api-key`

Respuesta esperada:

```json
{
  "ok": true,
  "message": "Conexion valida",
  "data": {}
}
```

## Integracion con Azure AI Foundry

### Implementacion actual

La funcion [invokeAzureFoundry](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\server.js:261) hace:

1. descifra la API key,
2. normaliza `endpoint_url`,
3. arma la URL `/chat/completions?api-version=...`,
4. construye un prompt de auditoria textual,
5. envia `messages` con `system` y `user`,
6. exige que la respuesta del modelo sea JSON valido,
7. adapta esa respuesta al contrato interno.

### Contrato de entrada al modelo

El backend sintetiza:

- marco,
- codigo y titulo del control,
- descripcion,
- objetivo,
- notas del auditor,
- compensatorios,
- texto de evidencias.

### Contrato de salida esperado

```json
{
  "result": "cumple",
  "confidence": 0.86,
  "summary": "La evidencia es suficiente",
  "strengths": ["Existe politica aprobada"],
  "gaps": [],
  "missing_evidence": [],
  "recommendation": "Validar decision final del auditor"
}
```

### Fallback

Si Azure Foundry falla y `AI_FALLBACK_TO_HEURISTIC=true`:

- se escribe evento `invoke_failed` en `audit_logs`,
- el backend aplica la heuristica local,
- el proceso no se aborta.

Si `AI_FALLBACK_TO_HEURISTIC=false`:

- la API devuelve error.

## Operacion de logs y trazabilidad

El helper `writeAuditLog()` se usa en:

- alta de marcos,
- alta de controles,
- creacion de evaluaciones,
- cargas y referencias de evidencia,
- procesamiento IA,
- creacion y actualizacion de hallazgos,
- creacion y actualizacion de planes,
- pruebas de proveedores,
- cambios de prompt.

## Politica de almacenamiento

### Base de datos

Persistencia estructurada de negocio:

- catalogos,
- evaluaciones,
- evidencias como metadata,
- resultados IA,
- hallazgos,
- planes,
- logs.

### Filesystem

Persistencia de binarios subidos por el usuario:

- directorio `/app/uploads` dentro del contenedor,
- volumen Docker `uploads_data`.

Recomendacion futura:

- mover a `S3`, `MinIO` o storage equivalente.

## Backups y recuperacion

Recomendaciones minimas:

1. backup diario de PostgreSQL,
2. backup del volumen de uploads,
3. rotacion de `APP_ENCRYPTION_KEY` con estrategia controlada,
4. respaldo del `.env` o su equivalente seguro.

Advertencia:

- si se pierde `APP_ENCRYPTION_KEY`, no se podran descifrar los secretos ya almacenados.

## Checklist de salida a produccion

1. cambiar todas las credenciales de ejemplo,
2. definir `APP_ENCRYPTION_KEY` robusta,
3. restringir `ALLOWED_ORIGINS`,
4. activar proxy inverso y `TRUST_PROXY` si aplica,
5. habilitar SSL real hacia PostgreSQL si el entorno lo exige,
6. definir backups,
7. poner el servicio detras de autenticacion,
8. externalizar storage de archivos,
9. introducir migraciones controladas,
10. instrumentar logs y metricas.

## Limitaciones conocidas

- sin autenticacion ni sesion,
- sin RBAC,
- sin ingestion real desde SharePoint,
- sin OCR ni parsing de PDF o DOCX,
- sin colas para procesos costosos,
- especificacion OpenAPI resumida, no exhaustiva.
