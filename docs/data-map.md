# Mapa de Datos

## Objetivo

Este documento describe el modelo de datos actual de `Audit Evidence Copilot` desde una perspectiva funcional y tecnica: entidades, claves, relaciones, contratos JSON, flujos de escritura, estados y recomendaciones de evolucion.

## Principios de modelado

El esquema actual sigue estas decisiones:

- separar catalogo normativo de la ejecucion de auditoria,
- permitir evidencia multi-origen sin obligar a duplicar archivos,
- conservar historico de evaluaciones IA,
- soportar hallazgos y remediacion como objetos de negocio propios,
- mantener una tabla flexible de `settings` para configuracion funcional,
- evitar datos demo y partir siempre desde un estado vacio.

## Vista de dominio

```text
frameworks
  -> framework_controls
       -> evaluation_controls
            -> evidences
            -> ai_assessments
            -> findings

evaluations
  -> evaluation_controls
  -> findings

findings
  -> action_plans

connectors
  -> evidences

users
  -> evaluations / connectors / evidences / findings / action_plans

ai_providers
settings
audit_logs
```

## Tablas del esquema

### `users`

Propone la base para trazabilidad y futura autenticacion.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `full_name` | `TEXT` | no | nombre visible |
| `email` | `TEXT` | no | identificador unico |
| `role` | `TEXT` | no | rol funcional actual, hoy informativo |
| `created_at` | `TIMESTAMPTZ` | no | fecha de alta |

Restricciones:

- `email` unico.

Observaciones:

- El backend actual no autentica usuarios; `created_by` en muchas tablas puede quedar `NULL`.

### `ai_providers`

Registra motores o endpoints IA configurables.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `name` | `TEXT` | no | nombre unico del proveedor |
| `provider_type` | `TEXT` | no | taxonomia funcional libre |
| `model_name` | `TEXT` | no | modelo por defecto |
| `is_active` | `BOOLEAN` | no | proveedor elegible por `getActiveAIProvider()` |
| `config_json` | `JSONB` | no | configuracion extra |
| `created_at` | `TIMESTAMPTZ` | no | alta |
| `provider_kind` | `TEXT` | no | implementacion tecnica, por ejemplo `azure_foundry` |
| `endpoint_url` | `TEXT` | no | endpoint base |
| `api_version` | `TEXT` | no | version del endpoint remoto |
| `deployment_name` | `TEXT` | no | deployment o alias remoto |
| `secret_ciphertext` | `TEXT` | no | secreto cifrado |
| `secret_hint` | `TEXT` | no | pista operativa sin exponer el secreto |

Restricciones:

- `name` unico.

Semantica:

- `provider_type` clasifica.
- `provider_kind` decide la implementacion concreta del backend.
- `secret_ciphertext` nunca se devuelve al frontend.
- `sanitizeProvider()` deriva `has_secret`.

Contrato JSON recomendado en `config_json`:

```json
{
  "timeoutMs": 30000,
  "temperature": 0,
  "topP": 1
}
```

### `frameworks`

Representa cada marco normativo o catalogo de controles.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `name` | `TEXT` | no | nombre del marco |
| `code` | `TEXT` | no | codigo funcional |
| `version` | `TEXT` | no | version del marco |
| `description` | `TEXT` | no | detalle libre |
| `created_at` | `TIMESTAMPTZ` | no | alta |

Restricciones:

- `UNIQUE(code, version)`.

Uso:

- un mismo codigo puede coexistir en varias versiones.

### `framework_controls`

Catalogo de controles pertenecientes a un marco.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `framework_id` | `INTEGER` | no | FK a `frameworks` |
| `code` | `TEXT` | no | codigo del control dentro del marco |
| `domain` | `TEXT` | no | dominio o agrupador |
| `title` | `TEXT` | no | titulo corto |
| `description` | `TEXT` | no | descripcion operacional |
| `objective` | `TEXT` | no | objetivo de control |
| `guidance` | `JSONB` | no | lista de criterios o guias |
| `suggested_evidence` | `JSONB` | no | lista de evidencias recomendadas |
| `sort_order` | `INTEGER` | no | orden relativo |
| `created_at` | `TIMESTAMPTZ` | no | alta |

Restricciones:

- `UNIQUE(framework_id, code)`.
- FK con `ON DELETE CASCADE` hacia `frameworks`.

Contrato de `guidance`:

```json
[
  "Validar vigencia del procedimiento",
  "Confirmar aprobacion del responsable"
]
```

Contrato de `suggested_evidence`:

```json
[
  "Politica aprobada",
  "Registro de revision",
  "Captura de herramienta"
]
```

### `evaluations`

Instancia de una auditoria o ciclo de revision.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `framework_id` | `INTEGER` | no | FK a `frameworks` |
| `name` | `TEXT` | no | nombre de la evaluacion |
| `auditee` | `TEXT` | no | area u organizacion auditada |
| `scope` | `TEXT` | no | alcance |
| `period_label` | `TEXT` | no | etiqueta temporal |
| `version_label` | `TEXT` | no | version funcional de la evaluacion |
| `status` | `TEXT` | no | estado general |
| `created_by` | `INTEGER` | si | FK a `users` |
| `created_at` | `TIMESTAMPTZ` | no | alta |
| `updated_at` | `TIMESTAMPTZ` | no | ultima actualizacion |

Estados funcionales observados:

- `borrador`
- `en_revision`
- `cerrado`

Uso real:

- al crear una evaluacion, el backend copia los controles del marco en `evaluation_controls`.

### `evaluation_controls`

Tabla central del dominio. Representa el control ya instanciado dentro de una evaluacion.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `evaluation_id` | `INTEGER` | no | FK a `evaluations` |
| `framework_control_id` | `INTEGER` | no | FK a `framework_controls` |
| `sort_order` | `INTEGER` | no | orden de la vista |
| `status` | `TEXT` | no | estado operativo del control |
| `ai_status` | `TEXT` | no | resumen del ultimo procesamiento IA |
| `ai_confidence` | `NUMERIC(5,2)` | no | confianza del ultimo resultado |
| `auditor_notes` | `TEXT` | no | notas del auditor |
| `compensatory_notes` | `TEXT` | no | compensatorios o aclaraciones |
| `reviewer_decision` | `TEXT` | no | decision humana |
| `reviewer_justification` | `TEXT` | no | justificacion humana |
| `created_at` | `TIMESTAMPTZ` | no | alta |
| `updated_at` | `TIMESTAMPTZ` | no | ultima actualizacion |

Restricciones:

- `UNIQUE(evaluation_id, framework_control_id)`.

Valores observados de `ai_status`:

- `pendiente`
- `cumple`
- `parcial`
- `revision`
- `no_cumple`

Notas:

- `status` y `ai_status` no son lo mismo.
- `status` refleja gestion del control.
- `ai_status` refleja el ultimo veredicto sintetizado del motor.

### `connectors`

Catalogo de fuentes externas de evidencia.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `name` | `TEXT` | no | nombre visible |
| `connector_type` | `TEXT` | no | tipo de origen |
| `base_path` | `TEXT` | no | ruta base local o remota |
| `base_url` | `TEXT` | no | URL base |
| `credentials_hint` | `TEXT` | no | pista de credenciales |
| `config_json` | `JSONB` | no | parametros tecnicos |
| `created_by` | `INTEGER` | si | FK a `users` |
| `created_at` | `TIMESTAMPTZ` | no | alta |

Tipos esperables:

- `sharepoint`
- `filesystem`
- `onedrive`
- `url`
- `api`
- `database`

Contrato JSON sugerido:

```json
{
  "site": "Audit",
  "library": "Controles",
  "tenant": "contoso.onmicrosoft.com"
}
```

### `evidences`

Representa la evidencia efectiva vinculada a un control evaluado.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `evaluation_control_id` | `INTEGER` | no | FK a `evaluation_controls` |
| `evidence_role` | `TEXT` | no | `principal` o `compensatoria` |
| `origin_type` | `TEXT` | no | origen real de la evidencia |
| `source_label` | `TEXT` | no | etiqueta visible |
| `file_name` | `TEXT` | no | nombre visible del archivo o documento |
| `stored_path` | `TEXT` | no | ruta local si hubo upload |
| `reference_path` | `TEXT` | no | ruta remota o identificador externo |
| `external_url` | `TEXT` | no | URL externa si aplica |
| `connector_id` | `INTEGER` | si | FK a `connectors` |
| `mime_type` | `TEXT` | no | MIME si hubo upload |
| `file_size` | `BIGINT` | no | tamano del archivo |
| `extracted_text` | `TEXT` | no | texto disponible para analizar |
| `notes` | `TEXT` | no | notas libres |
| `clarification_text` | `TEXT` | no | aclaracion especifica |
| `created_by` | `INTEGER` | si | FK a `users` |
| `created_at` | `TIMESTAMPTZ` | no | alta |

Roles:

- `principal`
- `compensatoria`

Origenes observados o previstos:

- `upload`
- `sharepoint`
- `filesystem`
- `url`
- `onedrive`
- `api`
- `db`

Reglas de negocio actuales:

- si la evidencia se sube, `stored_path` apunta a `/uploads/<archivo>`.
- si es referenciada, se usa `reference_path`, `external_url` y opcionalmente `connector_id`.
- `extracted_text` puede ser un resumen manual o texto ya preparado.

### `ai_assessments`

Historico de procesamientos IA por control.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `evaluation_control_id` | `INTEGER` | no | FK a `evaluation_controls` |
| `provider_name` | `TEXT` | no | nombre del proveedor que produjo el resultado |
| `model_name` | `TEXT` | no | modelo reportado |
| `result` | `TEXT` | no | veredicto principal |
| `confidence` | `NUMERIC(5,2)` | no | confianza |
| `summary` | `TEXT` | no | resumen ejecutivo |
| `strengths` | `JSONB` | no | fortalezas detectadas |
| `gaps` | `JSONB` | no | brechas detectadas |
| `missing_evidence` | `JSONB` | no | evidencia faltante |
| `recommendation` | `TEXT` | no | siguiente accion sugerida |
| `evidence_snapshot` | `JSONB` | no | fotografia de la evidencia usada |
| `raw_response` | `JSONB` | no | respuesta cruda o metadatos |
| `is_latest` | `BOOLEAN` | no | marca el resultado vigente |
| `created_at` | `TIMESTAMPTZ` | no | fecha de procesamiento |

Resultados esperados:

- `cumple`
- `cumple_parcialmente`
- `requiere_validacion_humana`
- `evidencia_insuficiente`
- `no_cumple`

Notas tecnicas:

- antes de insertar uno nuevo, el backend marca anteriores como `is_latest = FALSE`.
- `evidence_snapshot` evita perder contexto cuando la evidencia cambia despues.

Ejemplo de `evidence_snapshot`:

```json
[
  {
    "id": 14,
    "originType": "sharepoint",
    "evidenceRole": "principal",
    "fileName": "Politica-Seguridad.pdf",
    "sourceLabel": "SharePoint corporativo",
    "connectorName": "SharePoint Riesgo",
    "referencePath": "/sites/audit/Controles/Politica-Seguridad.pdf",
    "notes": "Version revisada por el auditor",
    "clarification": "",
    "uploadedAt": "2026-04-28T12:00:00.000Z"
  }
]
```

### `findings`

Entidad de hallazgo operativa.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `evaluation_id` | `INTEGER` | no | FK a `evaluations` |
| `evaluation_control_id` | `INTEGER` | si | FK a `evaluation_controls` |
| `title` | `TEXT` | no | titulo |
| `description` | `TEXT` | no | descripcion |
| `severity` | `TEXT` | no | severidad |
| `status` | `TEXT` | no | estado |
| `source_type` | `TEXT` | no | `manual` o `ia` |
| `recommendation` | `TEXT` | no | recomendacion |
| `owner_name` | `TEXT` | no | responsable |
| `due_date` | `DATE` | si | fecha objetivo |
| `created_by` | `INTEGER` | si | FK a `users` |
| `created_at` | `TIMESTAMPTZ` | no | alta |
| `updated_at` | `TIMESTAMPTZ` | no | ultima actualizacion |

Estados observados:

- `abierto`
- `en_progreso`
- `cerrado`

Severidades observadas:

- `alta`
- `media`
- `baja`

Regla automatica:

- si el resultado IA es `evidencia_insuficiente` o `requiere_validacion_humana`, el backend puede abrir un hallazgo automaticamente.

### `action_plans`

Plan de remediacion asociado a un hallazgo.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `finding_id` | `INTEGER` | no | FK a `findings` |
| `title` | `TEXT` | no | accion resumida |
| `description` | `TEXT` | no | detalle |
| `owner_name` | `TEXT` | no | responsable |
| `target_date` | `DATE` | si | objetivo |
| `status` | `TEXT` | no | estado del plan |
| `progress` | `INTEGER` | no | avance de 0 a 100 |
| `created_by` | `INTEGER` | si | FK a `users` |
| `created_at` | `TIMESTAMPTZ` | no | alta |
| `updated_at` | `TIMESTAMPTZ` | no | ultima actualizacion |

Estados observados:

- `abierto`
- `en_progreso`
- `cerrado`

### `audit_logs`

Bitacora operativa transversal.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `entity_type` | `TEXT` | no | tipo de entidad impactada |
| `entity_id` | `TEXT` | no | identificador textual |
| `action` | `TEXT` | no | accion realizada |
| `actor_name` | `TEXT` | no | autor, hoy `system` por defecto |
| `details_json` | `JSONB` | no | payload adicional |
| `created_at` | `TIMESTAMPTZ` | no | fecha del evento |

Uso:

- auditoria tecnica y trazabilidad de procesos backend.

### `settings`

Configuracion flexible de producto.

Campos:

| Campo | Tipo | Nulo | Descripcion |
| --- | --- | --- | --- |
| `id` | `SERIAL` | no | PK |
| `category` | `TEXT` | no | agrupador |
| `key` | `TEXT` | no | clave funcional |
| `value_json` | `JSONB` | no | valor estructurado |
| `updated_at` | `TIMESTAMPTZ` | no | ultima actualizacion |

Restricciones:

- `UNIQUE(category, key)`.

Uso actual:

- prompts por marco con `category = prompt`.

## Relaciones y cardinalidades

| Relacion | Cardinalidad | Comentario |
| --- | --- | --- |
| `frameworks -> framework_controls` | 1:N | un marco tiene muchos controles |
| `frameworks -> evaluations` | 1:N | una evaluacion se basa en un marco |
| `evaluations -> evaluation_controls` | 1:N | una evaluacion instancia muchos controles |
| `framework_controls -> evaluation_controls` | 1:N | un control catalogo puede existir en muchas evaluaciones |
| `evaluation_controls -> evidences` | 1:N | un control recibe multiples evidencias |
| `evaluation_controls -> ai_assessments` | 1:N | mantiene historico |
| `evaluation_controls -> findings` | 1:N | un control puede originar varios hallazgos |
| `findings -> action_plans` | 1:N | un hallazgo puede tener multiples acciones |
| `connectors -> evidences` | 1:N | una fuente se reutiliza en muchos registros |
| `users -> varias tablas` | 1:N | trazabilidad de creacion |

## Flujo de escritura por proceso

### Alta de marco

Escribe en:

- `frameworks`

### Alta de control

Escribe en:

- `framework_controls`
- `audit_logs`

### Alta de evaluacion

Escribe en:

- `evaluations`
- `evaluation_controls`
- `audit_logs`

Observacion:

- la creacion de `evaluation_controls` se hace por `INSERT INTO ... SELECT` desde `framework_controls`.

### Subida de evidencia

Escribe en:

- filesystem local `uploads/`
- `evidences`
- `audit_logs`

### Registro de evidencia referenciada

Escribe en:

- `evidences`
- `audit_logs`

### Procesamiento IA

Lee:

- `evaluation_controls`
- `framework_controls`
- `frameworks`
- `evidences`
- `connectors`
- `ai_providers`

Escribe:

- `ai_assessments`
- `evaluation_controls.ai_status`
- `evaluation_controls.ai_confidence`
- `findings` si corresponde
- `audit_logs`

### Gestion de hallazgos

Escribe en:

- `findings`
- `action_plans`
- `audit_logs`

## Estados y transiciones

### Resultado IA (`ai_assessments.result`)

```text
cumple
cumple_parcialmente
requiere_validacion_humana
evidencia_insuficiente
no_cumple
```

Mapeo al estado sintetico de control (`evaluation_controls.ai_status`):

| Result | AI status |
| --- | --- |
| `cumple` | `cumple` |
| `cumple_parcialmente` | `parcial` |
| `requiere_validacion_humana` | `revision` |
| `evidencia_insuficiente` | `pendiente` |
| `no_cumple` | `no_cumple` |

### Hallazgos

Estados funcionales:

```text
abierto -> en_progreso -> cerrado
```

### Planes de accion

Estados funcionales:

```text
abierto -> en_progreso -> cerrado
```

## JSONB usados y contrato funcional

| Tabla | Campo | Uso |
| --- | --- | --- |
| `framework_controls` | `guidance` | criterios o pasos de validacion |
| `framework_controls` | `suggested_evidence` | evidencias sugeridas |
| `connectors` | `config_json` | datos tecnicos del conector |
| `ai_providers` | `config_json` | parametros extra del proveedor |
| `settings` | `value_json` | prompts y configuracion flexible |
| `ai_assessments` | `strengths` | lista de fortalezas |
| `ai_assessments` | `gaps` | lista de brechas |
| `ai_assessments` | `missing_evidence` | lista de faltantes |
| `ai_assessments` | `evidence_snapshot` | snapshot de contexto |
| `ai_assessments` | `raw_response` | respuesta cruda o metadatos |
| `audit_logs` | `details_json` | detalle del evento |

## Indices existentes y ausentes

Actualmente el esquema tiene:

- PK por tabla,
- unicos funcionales en `users`, `frameworks`, `framework_controls`, `settings`,
- FKs basicas.

Indices recomendados para la siguiente iteracion:

```sql
CREATE INDEX IF NOT EXISTS idx_evaluation_controls_evaluation_id ON evaluation_controls(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_evidences_evaluation_control_id ON evidences(evaluation_control_id);
CREATE INDEX IF NOT EXISTS idx_ai_assessments_control_latest ON ai_assessments(evaluation_control_id, is_latest);
CREATE INDEX IF NOT EXISTS idx_findings_evaluation_id ON findings(evaluation_id);
CREATE INDEX IF NOT EXISTS idx_findings_control_id ON findings(evaluation_control_id);
CREATE INDEX IF NOT EXISTS idx_action_plans_finding_id ON action_plans(finding_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
```

## Riesgos y decisiones actuales

### Secretos

- `ai_providers.secret_ciphertext` se cifra en base de datos.
- `connectors` todavia no tiene un modelo seguro de secretos.

### Archivos

- los uploads viven en disco local.
- esto es valido para entorno inicial, pero no ideal para horizontal scaling.

### Integridad temporal

- `evaluation_controls` es una copia viva del catalogo.
- si cambia el catalogo despues, la evaluacion existente no se recompone sola.

### Migraciones

- el backend aplica el `schema.sql` completo al arrancar.
- para produccion enterprise conviene migrar a una estrategia formal versionada.

## Recomendaciones de evolucion

1. separar secretos de conectores en un secret manager,
2. mover binarios a `S3` o `MinIO`,
3. introducir indices operativos,
4. modelar organizaciones, tenants y permisos,
5. implementar versionado fuerte de prompts,
6. incorporar cola de extraccion documental,
7. guardar hash de archivo y metadatos de integridad,
8. registrar version real de documentos SharePoint u origen externo,
9. desacoplar autoaplicacion del esquema del arranque HTTP,
10. introducir migraciones controladas y pruebas de regresion SQL.
