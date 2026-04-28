# Mapa de Datos

## Objetivo

Este documento describe el modelo de datos actual de `Audit Evidence Copilot`, sus entidades principales y la relacion entre catalogos, evaluaciones, evidencias y resultados.

## Vista general

La aplicacion se divide en cinco bloques de datos:

1. configuracion base,
2. catalogo normativo,
3. ejecucion de auditoria,
4. evidencia y fuentes,
5. resultados de evaluacion.

## Entidades principales

### `users`

Representa usuarios de la plataforma.

Campos principales:

- `id`
- `full_name`
- `email`
- `role`
- `created_at`

Uso actual:

- referencia opcional para trazabilidad de creacion.

### `ai_providers`

Registra motores o proveedores de IA configurados.

Campos principales:

- `id`
- `name`
- `provider_type`
- `model_name`
- `is_active`
- `config_json`
- `created_at`

Ejemplos de `provider_type`:

- `openai`
- `azure-openai`
- `anthropic`
- `mock`

### `frameworks`

Define cada marco normativo o catalogo de controles.

Campos principales:

- `id`
- `name`
- `code`
- `version`
- `description`
- `created_at`

Ejemplos:

- `ISO/IEC 42001`
- `ISO/IEC 27001`
- `ENS`

### `framework_controls`

Contiene los controles pertenecientes a un marco.

Campos principales:

- `id`
- `framework_id`
- `code`
- `domain`
- `title`
- `description`
- `objective`
- `guidance`
- `suggested_evidence`
- `sort_order`
- `created_at`

Relaciones:

- muchos controles pertenecen a un marco.

### `evaluations`

Representa una auditoria o ciclo de evaluacion.

Campos principales:

- `id`
- `framework_id`
- `name`
- `auditee`
- `scope`
- `period_label`
- `version_label`
- `status`
- `created_by`
- `created_at`
- `updated_at`

Relaciones:

- una evaluacion pertenece a un marco,
- una evaluacion genera muchos controles evaluables.

### `evaluation_controls`

Instancia de cada control dentro de una evaluacion.

Campos principales:

- `id`
- `evaluation_id`
- `framework_control_id`
- `sort_order`
- `status`
- `ai_status`
- `ai_confidence`
- `auditor_notes`
- `compensatory_notes`
- `reviewer_decision`
- `reviewer_justification`
- `created_at`
- `updated_at`

Importancia:

- es la tabla central del trabajo de auditoria.

### `connectors`

Registra fuentes de evidencia externas.

Campos principales:

- `id`
- `name`
- `connector_type`
- `base_path`
- `base_url`
- `credentials_hint`
- `config_json`
- `created_by`
- `created_at`

Ejemplos de `connector_type`:

- `sharepoint`
- `filesystem`
- `onedrive`
- `url`
- `api`
- `database`

### `evidences`

Registra toda evidencia asociada a un control evaluado.

Campos principales:

- `id`
- `evaluation_control_id`
- `evidence_role`
- `origin_type`
- `source_label`
- `file_name`
- `stored_path`
- `reference_path`
- `external_url`
- `connector_id`
- `mime_type`
- `file_size`
- `extracted_text`
- `notes`
- `clarification_text`
- `created_by`
- `created_at`

Conceptos clave:

- `evidence_role`: `principal` o `compensatoria`
- `origin_type`: origen real de la evidencia

### `ai_assessments`

Guarda los resultados automáticos por control.

Campos principales:

- `id`
- `evaluation_control_id`
- `provider_name`
- `model_name`
- `result`
- `confidence`
- `summary`
- `strengths`
- `gaps`
- `missing_evidence`
- `recommendation`
- `evidence_snapshot`
- `raw_response`
- `is_latest`
- `created_at`

Importancia:

- mantiene historico de evaluaciones automáticas por control.

### `settings`

Tabla de configuracion flexible.

Campos principales:

- `id`
- `category`
- `key`
- `value_json`
- `updated_at`

Uso actual:

- prompts por marco.

## Relaciones principales

```text
frameworks 1 --- N framework_controls
frameworks 1 --- N evaluations
evaluations 1 --- N evaluation_controls
framework_controls 1 --- N evaluation_controls
evaluation_controls 1 --- N evidences
evaluation_controls 1 --- N ai_assessments
connectors 1 --- N evidences
users 1 --- N evaluations
users 1 --- N evidences
users 1 --- N connectors
```

## Flujo de datos

### 1. Configuracion del catalogo

- se crea un `framework`
- se crean sus `framework_controls`

### 2. Configuracion de soporte

- se crean `connectors`
- se crean `ai_providers`
- se guardan prompts en `settings`

### 3. Ejecucion de auditoria

- se crea una `evaluation`
- el sistema copia los controles del marco en `evaluation_controls`

### 4. Registro de evidencia

- se agregan `evidences` a cada `evaluation_control`
- la evidencia puede ser archivo subido o referencia externa

### 5. Evaluacion automatica

- el sistema procesa un `evaluation_control`
- crea un registro en `ai_assessments`
- actualiza `ai_status` y `ai_confidence` en `evaluation_controls`

## Campos JSON y su intencion

### `framework_controls.guidance`

Lista de criterios de evaluacion del control.

### `framework_controls.suggested_evidence`

Lista de tipos de evidencia sugerida.

### `connectors.config_json`

Configuracion tecnica del conector.

### `ai_providers.config_json`

Parametros del proveedor IA.

### `settings.value_json`

Configuracion flexible, por ejemplo prompts.

### `ai_assessments.strengths`, `gaps`, `missing_evidence`

Listas estructuradas de hallazgos automáticos.

### `ai_assessments.evidence_snapshot`

Fotografia de la evidencia usada en esa ejecucion.

### `ai_assessments.raw_response`

Payload bruto o metadatos de evaluacion.

## Recomendaciones de evolucion

- mover secretos de conectores fuera de `config_json` hacia un vault o secret manager,
- agregar tablas de `findings`, `action_plans` y `audit_logs`,
- incorporar versionado de documentos,
- modelar usuarios, permisos y organizaciones de forma explicita,
- separar extraccion documental y procesamiento IA en colas asincronas.
