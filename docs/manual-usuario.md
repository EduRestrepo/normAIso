# Manual de Usuario

## Objetivo

Este manual explica como operar la aplicacion desde la interfaz actual para:

- registrar marcos y controles,
- crear evaluaciones,
- adjuntar evidencia,
- procesar resultados con IA,
- abrir hallazgos y planes de accion,
- administrar conectores, prompts y proveedores IA.

## Perfil de uso

Pensado para:

- auditor interno,
- lider de auditoria,
- responsable funcional del repositorio normativo,
- administrador de configuracion.

## Conceptos clave

### Marco

Catalogo normativo base. Ejemplos:

- `ISO 27001`
- `ISO 42001`
- `ENS`

### Control

Item individual del marco que sera evaluado.

### Evaluacion

Instancia concreta de auditoria que copia los controles del marco elegido.

### Evidencia principal

Documento o referencia principal usada para soportar un control.

### Evidencia compensatoria

Aclaracion, excepcion o soporte adicional cuando la evidencia principal no es suficiente por si sola.

### Hallazgo

Brecha o desviacion abierta sobre un control.

### Plan de accion

Accion correctiva o de mejora asociada a un hallazgo.

## Estructura de la interfaz

### `Resumen`

Vista ejecutiva con:

- total de evaluaciones,
- total de controles instanciados,
- total de evidencias,
- distribucion de resultados IA,
- estado operativo de hallazgos y planes,
- agregacion por marco.

### `Evaluaciones`

Zona de alta y consulta de:

- marcos,
- controles,
- evaluaciones.

### `Mesa de control`

Vista operativa de una evaluacion concreta.

Permite:

- navegar entre controles,
- registrar notas,
- subir evidencias,
- referenciar evidencias externas,
- procesar el control,
- procesar toda la evaluacion,
- crear hallazgos.

### `Fuentes`

Administracion de conectores.

### `Hallazgos`

Seguimiento de hallazgos y planes de accion.

### `Configuracion`

Administracion de:

- usuarios visibles,
- proveedores IA,
- prompts,
- bitacora.

## Preparacion inicial recomendada

La app arranca sin datos precargados. Antes de evaluar debes preparar al menos:

1. un marco,
2. uno o mas controles,
3. si usaras evidencia referenciada, al menos un conector,
4. si usaras IA remota, al menos un proveedor IA,
5. opcionalmente un prompt por marco.

## Flujo completo de uso

### 1. Registrar un marco normativo

Ir a `Evaluaciones`.

En el formulario de marcos completar:

- nombre,
- codigo,
- version,
- descripcion.

Guardar.

Resultado:

- el marco queda disponible para asociarle controles y para crear evaluaciones.

### 2. Registrar controles del marco

Seguir en `Evaluaciones`.

En el formulario de control seleccionar el marco y completar:

- codigo del control,
- dominio,
- titulo,
- descripcion,
- objetivo.

Si el frontend muestra campos de guias o evidencia sugerida, usarlos para enriquecer el catalogo.

Guardar.

Resultado:

- cada control queda registrado dentro del marco.

### 3. Registrar fuentes de evidencia

Ir a `Fuentes`.

Completar:

- nombre del conector,
- tipo de conector,
- ruta base,
- URL base,
- pista de credenciales.

Ejemplos de tipo:

- `sharepoint`
- `filesystem`
- `onedrive`
- `url`
- `api`
- `database`

Resultado:

- el conector podra elegirse al referenciar evidencias.

### 4. Configurar un proveedor IA

Ir a `Configuracion`.

En `Motores IA` completar:

- nombre,
- tipo,
- clase de proveedor,
- modelo,
- deployment,
- endpoint,
- api version,
- api key,
- pista del secreto.

Para `Azure AI Foundry` usar:

- `providerKind = azure_foundry`
- endpoint base con formato `https://<resource>.services.ai.azure.com/models`

Guardar.

Luego usar `Probar conexion` para validar la configuracion.

### 5. Configurar un prompt por marco

Ir a `Configuracion`.

En la seccion de prompt:

- indicar el codigo del marco,
- redactar el prompt objetivo,
- guardar.

Uso esperado:

- ajustar el tono o el criterio de evaluacion para una familia de controles.

### 6. Crear una evaluacion

Ir a `Evaluaciones`.

En `Crear auditoria` completar:

- marco,
- nombre de la evaluacion,
- auditado,
- alcance,
- periodo,
- version.

Guardar.

Resultado:

- se crea la evaluacion,
- el sistema importa automaticamente todos los controles del marco a la mesa de control.

### 7. Abrir la mesa de control

Desde la lista de evaluaciones, abrir la evaluacion deseada.

La mesa mostrara:

- lista de controles,
- estado IA,
- confianza,
- numero de evidencias,
- resumen del ultimo procesamiento,
- conteo de hallazgos abiertos.

### 8. Registrar notas del auditor

Seleccionar un control.

Completar:

- `notas del auditor`
- `aclaracion o compensatorio`
- si la interfaz lo muestra, `decision del revisor`
- `justificacion del revisor`

Guardar observaciones.

Estas notas mejoran el contexto usado por la IA y dejan trazabilidad para la revision humana.

### 9. Subir evidencia manual

En el bloque de carga:

- seleccionar rol de evidencia,
- introducir etiqueta de fuente,
- elegir archivo,
- anadir nota si aplica,
- guardar.

Archivos tipicos:

- PDF,
- DOCX,
- TXT,
- LOG,
- exportes de herramienta.

Resultado:

- el archivo se almacena en el servidor,
- se registra la metadata en la base.

### 10. Referenciar evidencia externa

En el bloque de evidencia referenciada completar:

- rol,
- origen,
- conector,
- nombre del archivo,
- ruta o identificador,
- URL externa,
- texto extraido o resumen,
- notas,
- aclaracion.

Usos tipicos:

- SharePoint,
- carpeta compartida,
- OneDrive,
- URL segura,
- API corporativa.

Ventaja:

- no duplicas el binario si ya existe en su repositorio origen.

### 11. Procesar un control

Con el control seleccionado, usar `Procesar este control`.

El sistema intentara:

1. usar el proveedor IA activo,
2. si falla y esta permitido, usar heuristica local.

El resultado muestra:

- estado sugerido,
- confianza,
- fortalezas,
- brechas,
- evidencia faltante,
- recomendacion.

### 12. Procesar toda la evaluacion

Usar `Procesar toda la evaluacion`.

El backend ejecuta el analisis secuencial de todos los controles instanciados.

Uso recomendado:

- cuando ya cargaste un conjunto significativo de evidencias.

### 13. Crear hallazgos

Si un control queda con evidencia debil:

- crear hallazgo manualmente, o
- usar el boton para generarlo desde el control.

Campos habituales:

- titulo,
- descripcion,
- severidad,
- responsable,
- fecha objetivo,
- recomendacion.

Nota:

- algunos hallazgos pueden generarse automaticamente al procesar resultados insuficientes o que requieren validacion humana.

### 14. Gestionar planes de accion

Desde `Hallazgos` abrir el hallazgo y registrar acciones:

- titulo,
- descripcion,
- responsable,
- fecha objetivo,
- estado,
- progreso.

Esto permite dar continuidad al cierre de brechas.

## Interpretacion de resultados IA

### `cumple`

La evidencia parece suficiente para sostener el control.

### `cumple_parcialmente`

Existe cobertura, pero no completa o no totalmente robusta.

### `requiere_validacion_humana`

La IA detecta elementos utiles, pero no suficientes para una conclusion automatica segura.

### `evidencia_insuficiente`

Faltan evidencias o el soporte aportado es demasiado debil.

### `no_cumple`

Estado reservado para escenarios mas concluyentes de incumplimiento.

## Buenas practicas operativas

1. no crear evaluaciones sin haber definido el catalogo real,
2. documentar siempre el origen de la evidencia,
3. diferenciar evidencia principal de compensatoria,
4. usar nombres coherentes para rutas y archivos,
5. completar notas del auditor antes de procesar,
6. validar manualmente la conclusion IA antes del cierre,
7. abrir hallazgo cuando la brecha tenga impacto y requiera seguimiento,
8. mantener actualizados responsables y fechas objetivo.

## Recomendaciones especificas para SharePoint

Cuando uses evidencia referenciada desde SharePoint, intenta registrar:

- nombre del documento,
- ruta o identificador estable,
- URL web,
- sitio o biblioteca mediante el conector,
- resumen textual o extracto relevante si la integracion automatica aun no existe.

Esto mejora trazabilidad y calidad del analisis.

## Limitaciones funcionales actuales

- no existe login real,
- no existe aprobacion formal multiusuario,
- el upload no extrae automaticamente texto de PDF o DOCX,
- SharePoint y otros conectores no se sincronizan en vivo todavia,
- la IA depende de que haya texto util en `extractedText`, `notes` o contenido preparado,
- la configuracion de usuarios es todavia basica.

## Soporte de diagnostico

Si algo falla:

1. revisar `Configuracion` y la bitacora,
2. validar proveedor IA con `Probar conexion`,
3. comprobar que el control tenga evidencia asociada,
4. verificar que el backend este sano con `GET /api/health`,
5. revisar el `requestId` devuelto por el sistema para correlacionar errores.
