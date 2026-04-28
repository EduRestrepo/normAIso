# Audit Evidence Copilot

Plataforma web para auditoria interna orientada a marcos como `ISO 42001`, `ISO 27001`, `ENS` y futuros catalogos de control, con evidencia multi-origen, evaluacion automatica por control, hallazgos y trazabilidad documental.

## Estado del proyecto

La base actual ya incluye:

- backend `Node.js + Express`,
- persistencia en `PostgreSQL`,
- despliegue con `Docker Compose`,
- gestion de marcos y controles sin datos de ejemplo,
- creacion de evaluaciones,
- asociacion de evidencia por `upload` o por `referencia`,
- configuracion de conectores,
- configuracion de motores IA,
- configuracion de `Azure AI Foundry`,
- prompts por marco,
- hallazgos y planes de accion,
- bitacora,
- evaluacion automatica con proveedor configurado o fallback heuristico.

La base arranca vacia. No se crean usuarios demo, marcos precargados ni conectores ficticios.

## Documentacion incluida

- [Mapa de datos](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\data-map.md)
- [Manual de usuario](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\manual-usuario.md)
- [Manual de integracion](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\manual-integracion.md)
- [Roadmap tecnico](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\roadmap-tecnico.md)
- [Especificacion OpenAPI](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\openapi.json)
- [Reajuste funcional del producto](C:\Users\ERQ\Desarrollos\ISO-42001-WebApp\docs\reajuste-app-auditoria-ia.md)

## Estructura principal

- `server.js`: API backend endurecida para produccion.
- `db/schema.sql`: esquema relacional y alteraciones evolutivas.
- `index.html`: interfaz principal.
- `styles.css`: estilos.
- `js/app.js`: logica frontend.
- `uploads/`: archivos subidos manualmente.
- `docker-compose.yml`: stack local de app + PostgreSQL.
- `.env.example`: variables de entorno base.

## Arranque con Docker

Requisitos:

- Docker Desktop activo
- Docker Compose disponible

Comando:

```bash
docker compose up -d --build
```

Acceso:

- [http://localhost:3000](http://localhost:3000)

## Arranque local sin Docker

1. Crear `.env` a partir de `.env.example`.
2. Ajustar `DATABASE_URL`, `APP_ENCRYPTION_KEY` y `ALLOWED_ORIGINS`.
3. Instalar dependencias:

```bash
npm install
```

En PowerShell puedes usar:

```bash
npm.cmd install
```

4. Iniciar la app:

```bash
npm start
```

## Variables de entorno

```env
NODE_ENV=production
PORT=3000
APP_BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://audit:audit@localhost:5432/auditcopilot
APP_ENCRYPTION_KEY=change-this-with-a-strong-secret
ALLOWED_ORIGINS=http://localhost:3000
AI_PROVIDER_NAME=azure-foundry
AI_MODEL_NAME=configurar-modelo
```

## Azure AI Foundry

La configuracion de `Azure AI Foundry` se realiza desde la UI en `Configuracion`.

Campos soportados:

- nombre
- tipo de proveedor
- clase `azure_foundry`
- modelo
- deployment
- endpoint base
- api version
- api key
- pista de secreto

La API key se cifra en base de datos usando `APP_ENCRYPTION_KEY`.

## Flujo funcional recomendado

1. Registrar un marco normativo.
2. Registrar sus controles.
3. Registrar conectores de evidencia.
4. Registrar motores IA.
5. Configurar prompts por marco.
6. Crear una evaluacion.
7. Adjuntar evidencia principal o compensatoria.
8. Procesar controles o la evaluacion completa.
9. Revisar la salida automatica y completar decision humana.
10. Convertir brechas en hallazgos y activar planes de accion.

## Endurecimiento de backend incluido

- `helmet`
- rate limiting
- `X-Request-Id`
- endpoints `health` y `readyz`
- manejo centralizado de errores
- cifrado de secretos de proveedores IA
- CORS parametrizable
- pool de base de datos configurable

## Limitaciones actuales

- No hay autenticacion real ni RBAC completo.
- SharePoint, OneDrive y otras fuentes estan modeladas, pero no sincronizan en vivo todavia.
- La extraccion de texto de binarios aun no esta implementada.
- El proveedor Azure Foundry ya se puede configurar, pero el sistema aun no incluye colas, OCR ni parsing documental avanzado.

## Nota sobre bases antiguas

Si ya existia una base o volumen Docker con datos precargados de versiones anteriores, esos datos no se eliminan solos. Para arrancar realmente vacio deberas limpiar la base o recrear el volumen de PostgreSQL.
