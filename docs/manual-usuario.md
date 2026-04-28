# Manual de Usuario

## Objetivo

Este manual explica cómo operar la aplicación desde la interfaz para configurar el catálogo, crear evaluaciones y analizar evidencias.

## Perfil objetivo

Pensado para:

- auditor interno,
- lider de auditoria,
- administrador funcional.

## Antes de empezar

La aplicacion arranca sin datos cargados. Antes de crear una auditoria debes:

1. registrar un marco,
2. registrar al menos un control dentro del marco,
3. opcionalmente registrar conectores,
4. opcionalmente registrar motores IA,
5. opcionalmente registrar prompts por marco.

## Navegacion principal

### `Resumen`

Muestra:

- total de evaluaciones,
- total de controles evaluados,
- total de evidencias,
- controles insuficientes,
- estado del repositorio normativo.

### `Evaluaciones`

Permite:

- registrar marcos,
- registrar controles,
- crear evaluaciones,
- consultar evaluaciones existentes.

### `Mesa de control`

Permite:

- abrir una evaluacion,
- ver cada control,
- subir evidencia,
- asociar referencias externas,
- registrar notas y compensatorios,
- procesar controles o toda la evaluacion.

### `Fuentes`

Permite:

- registrar conectores documentales o tecnicos.

### `Configuracion`

Permite:

- visualizar usuarios disponibles,
- registrar motores IA,
- editar prompts por marco.

## Flujo paso a paso

## 1. Registrar un marco normativo

Ir a `Evaluaciones`.

Completar en `Registrar marco`:

- nombre del marco,
- codigo,
- version,
- descripcion.

Pulsar `Guardar marco`.

Resultado esperado:

- el marco queda disponible para asociarle controles y crear evaluaciones.

## 2. Registrar controles del marco

En la misma sección, usar `Registrar control`.

Completar:

- marco,
- codigo del control,
- dominio,
- titulo,
- descripcion,
- objetivo.

Pulsar `Guardar control`.

Repetir por cada control que quieras incorporar al catálogo.

## 3. Registrar fuentes de evidencia

Ir a `Fuentes`.

Completar:

- nombre,
- tipo,
- ruta base,
- URL base,
- pista de credenciales.

Pulsar `Guardar fuente`.

Esto permite luego referenciar evidencias desde:

- SharePoint,
- filesystem,
- URL,
- OneDrive,
- futuras integraciones.

## 4. Registrar motores IA

Ir a `Configuracion`.

En `Motores IA`, completar:

- nombre,
- tipo,
- modelo.

Pulsar `Guardar motor IA`.

Nota:

- hoy la app guarda la configuracion, pero la evaluacion automatica sigue usando una logica heuristica base.

## 5. Configurar prompt por marco

Ir a `Configuracion`.

En `Prompts objetivo`:

- seleccionar el marco,
- escribir el prompt,
- guardar.

## 6. Crear una evaluacion

Ir a `Evaluaciones`.

En `Crear auditoria`, completar:

- marco,
- nombre de la evaluacion,
- area u organizacion auditada,
- alcance,
- periodo,
- version.

Pulsar `Crear evaluacion e importar controles`.

Resultado esperado:

- el sistema crea la evaluacion,
- importa automaticamente los controles del marco.

## 7. Abrir la mesa de control

Dentro de `Evaluaciones`, en la lista de evaluaciones:

- pulsar `Abrir mesa de control`.

El sistema mostrara:

- lista de controles de la evaluacion,
- detalle del control seleccionado.

## 8. Registrar notas del auditor

Seleccionar un control.

En `Registro del auditor` completar:

- notas del auditor,
- aclaracion o compensatorio.

Pulsar `Guardar observaciones`.

## 9. Subir evidencia manual

En el bloque `Adjuntar evidencia`:

- elegir rol de evidencia,
- indicar etiqueta de fuente,
- seleccionar archivo,
- agregar nota,
- pulsar `Subir archivo`.

El archivo queda asociado al control.

## 10. Referenciar evidencia externa

En el formulario de referencia:

- elegir rol,
- elegir origen,
- seleccionar conector si existe,
- indicar nombre del archivo,
- indicar ruta o identificador,
- indicar URL si aplica,
- opcionalmente pegar texto extraido o resumen,
- pulsar `Referenciar evidencia`.

Esto sirve cuando no quieres duplicar el archivo y solo quieres vincularlo desde su origen real.

## 11. Procesar un control

Con un control seleccionado:

- pulsar `Procesar este control`.

El sistema genera:

- resultado sugerido,
- confianza,
- fortalezas,
- brechas,
- evidencia faltante,
- recomendacion.

## 12. Procesar toda la evaluacion

Dentro de `Mesa de control`:

- pulsar `Procesar toda la evaluacion`.

Esto recorre todos los controles de la evaluacion.

## Interpretacion de resultados

Estados esperados:

- `cumple`
- `cumple_parcialmente`
- `requiere_validacion_humana`
- `evidencia_insuficiente`

La confianza se muestra en porcentaje y sirve como apoyo, no como reemplazo del juicio del auditor.

## Buenas practicas de uso

- no crear evaluaciones sin haber cargado controles reales,
- completar siempre notas del auditor,
- usar evidencia compensatoria solo cuando corresponda,
- mantener una nomenclatura consistente para archivos y rutas,
- documentar claramente el origen de la evidencia,
- revisar la conclusion automatica antes de darla por valida.

## Limitaciones actuales para el usuario

- no existe login real aun,
- no hay workflow formal de aprobacion,
- no hay OCR,
- no hay lectura automatica real de SharePoint,
- el analisis IA actual es una base heuristica.
