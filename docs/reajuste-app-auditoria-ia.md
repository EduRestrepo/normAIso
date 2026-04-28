# Reajuste de la App: Plataforma de Auditoria con Analisis Automático de Evidencias

## 1. Nueva visión del producto

La aplicación debe evolucionar desde un `tracker` de implementación hacia una plataforma de apoyo a auditoría interna que permita:

- seleccionar un marco de control o norma (`ISO 27001`, `ENS`, `ISO 42001`, etc.),
- desplegar automáticamente sus dominios, controles y criterios de evaluación,
- asociar evidencia documental y evidencia compensatoria por cada control,
- analizar esa evidencia con IA contra el texto del control,
- emitir una evaluación asistida con trazabilidad,
- comparar resultados entre versiones, auditorías, áreas, periodos y normas.

La IA no sustituye al auditor. La IA debe funcionar como `motor de preevaluación`, `copiloto de análisis` y `generador de hallazgos`, mientras la decisión final sigue siendo humana y auditada.

## 2. Propuesta de posicionamiento

Nombre conceptual del sistema:

`Audit Evidence Copilot`

Propuesta de valor:

`Una plataforma que ayuda al auditor interno a centralizar controles, recoger evidencias y obtener una primera evaluación automática, consistente y trazable sobre la suficiencia del cumplimiento.`

## 3. Problema que resuelve mejor que la versión actual

La app actual sirve para registrar controles y seguimiento manual. La versión objetivo debe resolver además:

- dispersión de evidencias en carpetas, correos y equipos,
- análisis manual lento y poco homogéneo,
- dificultad para justificar por qué una evidencia es suficiente o insuficiente,
- poca reutilización de evaluaciones previas,
- falta de comparativas entre ciclos de auditoría,
- dependencia excesiva del criterio individual del auditor.

## 4. Flujo funcional principal

### 4.1 Crear evaluación

El auditor crea una evaluación indicando:

- organización o unidad auditada,
- norma o marco (`ISO 27001`, `ENS`, `ISO 42001`, etc.),
- versión del marco,
- alcance,
- periodo,
- responsable,
- equipo auditor,
- versión de evaluación.

### 4.2 Cargar controles

El sistema debe cargar automáticamente:

- dominios,
- controles,
- subcontroles,
- guías o criterios esperados,
- evidencias sugeridas por control,
- severidad o criticidad,
- mapeos entre marcos si existen.

### 4.3 Gestionar evidencia por control

Cada control debe permitir:

- subir evidencia principal,
- registrar comentario del auditor,
- registrar explicación compensatoria,
- subir evidencia compensatoria,
- etiquetar tipo de evidencia (`política`, `procedimiento`, `registro`, `log`, `captura`, `acta`, `configuración`, etc.),
- indicar fecha de vigencia,
- identificar propietario de la evidencia,
- marcar si la evidencia aplica total o parcialmente.

Formatos mínimos:

- `pdf`
- `docx`
- `xlsx`
- `txt`
- `csv`
- `json`
- `log`
- imágenes (`png`, `jpg`)

### 4.4 Procesar con IA

Al pulsar `Procesar por IA`, el sistema debe:

1. extraer texto y metadatos de cada evidencia,
2. normalizar el contenido,
3. relacionar el contenido con el control específico,
4. enviar a la IA:
   - texto del control,
   - objetivo del control,
   - criterios de suficiencia,
   - evidencia principal,
   - aclaración o compensatorio,
   - historial de evaluaciones previas si aplica,
5. obtener una respuesta estructurada,
6. guardar el resultado como preevaluación.

### 4.5 Mostrar resultado de evaluación

Por cada control la app debe mostrar:

- estado sugerido:
  - `Cumple`
  - `Cumple parcialmente`
  - `No cumple`
  - `Evidencia insuficiente`
  - `Requiere validación humana`
- nivel de confianza,
- resumen ejecutivo de la evidencia analizada,
- fortalezas detectadas,
- vacíos o ausencias,
- mejoras sugeridas,
- evidencias adicionales recomendadas,
- observaciones sobre compensatorios,
- trazabilidad de qué archivos sustentaron la respuesta.

### 4.6 Cierre del auditor

El auditor debe poder:

- aceptar la recomendación de IA,
- ajustarla manualmente,
- registrar justificación final,
- abrir hallazgo o plan de acción,
- clasificar criticidad,
- dejar el control como pendiente de nueva evidencia.

## 5. Módulos objetivo del sistema

## 5.1 Módulo de Marcos Normativos

Debe permitir administrar:

- catálogos de normas,
- versiones,
- dominios y controles,
- guías de evaluación por control,
- prompts base por norma,
- mapeos entre controles de diferentes marcos.

## 5.2 Módulo de Evaluaciones

Debe permitir:

- crear auditorías o campañas,
- fijar alcance y versión,
- asociar controles automáticamente,
- reasignar controles a auditores,
- revisar estado por control.

## 5.3 Módulo de Evidencias

Debe permitir:

- subir archivos,
- clasificar evidencia,
- asociar evidencia a uno o varios controles,
- registrar compensatorios,
- versionar documentos,
- conservar hash, fecha y autor de carga,
- visualizar trazabilidad documental.

## 5.4 Módulo de IA

Debe permitir parametrizar:

- proveedor de IA,
- modelo,
- clave de conexión,
- temperatura o precisión,
- prompt global,
- prompt por norma,
- prompt por tipo de control,
- formato de respuesta estructurada,
- políticas de reintento,
- límites de tamaño de archivo,
- estrategia de particionado de documentos.

## 5.5 Módulo de Hallazgos y Planes de Acción

Debe permitir:

- convertir resultados insuficientes en hallazgos,
- asignar responsables,
- definir fechas objetivo,
- adjuntar plan de remediación,
- seguir cierre y reapertura.

## 5.6 Módulo de Analítica

Debe incluir:

- porcentaje de cumplimiento por norma,
- cumplimiento por dominio,
- tendencia por periodo,
- evolución por versión de auditoría,
- comparación entre áreas o sedes,
- controles más débiles,
- evidencias más frecuentes,
- tiempo medio de cierre de hallazgos.

## 5.7 Módulo de Administración

Debe permitir:

- usuarios,
- roles,
- permisos,
- áreas,
- proveedores de IA,
- parámetros de seguridad,
- bitácora de auditoría del sistema.

## 6. Roles recomendados

- `Administrador`: gestiona usuarios, catálogos, motores IA y configuración global.
- `Líder de Auditoría`: crea evaluaciones, asigna controles, aprueba resultados.
- `Auditor`: sube evidencia, lanza análisis IA, revisa controles.
- `Auditado / Dueño del control`: responde observaciones y sube documentación.
- `Revisor / Compliance`: valida cierres y consistencia metodológica.
- `Consulta`: acceso solo lectura a reportes.

## 7. Modelo de evaluación recomendado

Cada control debería manejar al menos estos campos:

- `estado_final`
- `estado_ia`
- `confianza_ia`
- `justificacion_ia`
- `brechas_detectadas`
- `evidencias_analizadas`
- `evidencias_faltantes`
- `compensatorio_valido`
- `recomendacion`
- `decision_humana`
- `justificacion_humana`
- `fecha_ultima_revision`
- `version_evaluacion`

## 8. Respuesta estructurada esperada de la IA

Conviene que la IA no responda en texto libre, sino en JSON estructurado. Ejemplo:

```json
{
  "control_id": "A.5.1",
  "resultado": "cumple_parcialmente",
  "confianza": 0.81,
  "resumen": "La evidencia muestra la existencia de una política aprobada, pero no demuestra revisión periódica ni comunicación efectiva.",
  "fortalezas": [
    "Existe documento formal aprobado",
    "Se identifica responsable del control"
  ],
  "brechas": [
    "No se evidencia revisión anual",
    "No hay prueba de difusión a personal afectado"
  ],
  "compensatorio": {
    "es_suficiente": false,
    "motivo": "La explicación compensa parcialmente pero no sustituye la evidencia operativa"
  },
  "evidencia_faltante": [
    "Registro de revisión",
    "Evidencia de comunicación o capacitación"
  ],
  "recomendacion_auditor": "Solicitar registros de revisión vigente y evidencia de despliegue."
}
```

Esto facilita:

- mostrar resultados en UI,
- comparar versiones,
- generar reportes,
- reentrenar o mejorar prompts,
- auditar la calidad de respuesta de la IA.

## 9. Prompting recomendado

No conviene un solo prompt genérico. Se recomienda:

- un `prompt del sistema` para definir el rol de evaluador,
- un `prompt por norma` para reflejar criterios específicos,
- un `prompt por tipo de control` si luego quieres mayor precisión,
- un `formato obligatorio de salida JSON`.

Estructura sugerida:

- contexto del marco,
- texto del control,
- objetivo del control,
- criterio de suficiencia,
- evidencia principal,
- evidencia compensatoria,
- instrucciones para no inventar,
- escala de respuesta permitida,
- formato JSON estricto.

## 10. Versionado y comparativas

El sistema debe soportar:

- versión de catálogo normativo,
- versión de evaluación,
- versión de evidencia,
- histórico de decisiones IA,
- histórico de decisiones humanas.

Comparativas clave:

- evaluación actual vs evaluación anterior,
- área A vs área B,
- norma 1 vs norma 2,
- cumplimiento por periodo,
- evolución de un mismo control,
- cierre de brechas a lo largo del tiempo.

## 11. Reportes que sí aportan valor

- informe ejecutivo para dirección,
- informe detallado por control,
- matriz de evidencias,
- matriz de hallazgos,
- reporte comparativo por versión,
- dashboard de tendencias,
- informe de controles críticos sin evidencia suficiente.

## 12. Recomendación técnica sobre la base actual

La base actual es útil como prototipo, pero se queda corta para el objetivo. Para convertirla en una plataforma real recomiendo:

### Corto plazo

- mantener Node.js en backend,
- conservar frontend web,
- reorganizar la app por módulos funcionales,
- dejar de guardar todo en archivos JSON genéricos,
- introducir un modelo de datos más explícito.

### Medio plazo

- migrar a una base de datos relacional (`PostgreSQL` recomendado),
- almacenar archivos en un repositorio de documentos,
- usar procesamiento asíncrono para análisis IA,
- agregar autenticación real y trazabilidad por usuario.

### Largo plazo

- motor de extracción documental,
- OCR,
- chunking y embeddings para evidencias extensas,
- evaluación semántica por control,
- reutilización de evidencias entre auditorías,
- aprendizaje sobre patrones de evidencia insuficiente.

## 13. Arquitectura lógica recomendada

Capas sugeridas:

- `Frontend`
  - dashboard
  - evaluación
  - gestión de evidencias
  - administración
- `API Backend`
  - autenticación
  - evaluaciones
  - controles
  - evidencias
  - resultados IA
  - reportes
- `Servicios`
  - extracción de texto
  - clasificación documental
  - motor de prompts
  - motor de evaluación IA
- `Persistencia`
  - base de datos
  - almacenamiento de archivos
  - bitácora

## 14. Principios clave para que el producto sea confiable

- La IA debe `explicar` por qué concluye algo.
- La IA debe `citar la evidencia usada`.
- La IA debe poder decir `no tengo suficiente información`.
- Toda recomendación IA debe ser `editable` por un auditor.
- Toda evaluación debe quedar `versionada`.
- Todo cambio importante debe quedar en `bitácora`.

## 15. MVP recomendado

Si queremos construir esto por fases, el MVP correcto no debería intentar hacerlo todo a la vez. Recomiendo este alcance inicial:

- selección de norma,
- carga automática de controles,
- carga de evidencia por control,
- campo de aclaración o compensatorio,
- procesamiento IA por control,
- resultado estructurado visible en pantalla,
- cierre humano del control,
- dashboard simple con cumplimiento y brechas,
- configuración básica de usuarios y motor IA.

## 16. Roadmap por fases

### Fase 1. Fundaciones

- rediseño del modelo de datos,
- módulo de normas,
- módulo de evaluaciones,
- módulo de evidencias,
- configuración de IA.

### Fase 2. IA útil

- extracción de texto,
- envío por control a IA,
- salida JSON,
- panel de resultados por control,
- validación humana.

### Fase 3. Trazabilidad y gobierno

- usuarios y roles,
- bitácora,
- versionado,
- historial de decisiones.

### Fase 4. Analítica

- comparativas,
- gráficos de evolución,
- informes,
- ranking de riesgos y brechas.

### Fase 5. Inteligencia avanzada

- OCR,
- análisis de logs,
- reutilización de evidencia,
- mapeo entre marcos,
- sugerencia automática de controles relacionados.

## 17. Redefinición simple de la idea

Una versión más clara y más potente de tu idea sería:

`La aplicación será una plataforma de apoyo a auditoría interna que centraliza controles de distintos marcos normativos, permite cargar evidencias y evidencias compensatorias por control, y usa IA para realizar una preevaluación automática y trazable de la suficiencia del cumplimiento, generando recomendaciones, brechas, comparativas históricas y reportes de evolución para apoyar la decisión final del auditor.`

## 18. Siguiente paso recomendado

Antes de programar funcionalidades nuevas, conviene alinear tres decisiones:

1. si la app será `multi-norma` desde el inicio o empezará con `ISO 27001` y `ISO 42001`,
2. si la IA evaluará solo documentos al principio o también `logs`, `json`, `csv` e imágenes,
3. si quieres evolucionar esta base actual incrementalmente o prefieres reestructurarla ya con módulos y modelo de datos nuevo.
