# Iso42001-WebApp

# ISO/IEC 42001 Tracker

Aplicación web para **gestionar, registrar, analizar y reportar** el estado de implementación de la norma **ISO/IEC 42001** en una organización.

![Logo](./assets/logo.png)

Creado por Eduardo Restrepo
eduardo.restrepo@protonmail.ch

---

## 🚀 Características principales

- **Dashboard interactivo**
  - KPIs: cumplimiento medio, madurez media, % de controles implementados y riesgos.
  - Gráficas: distribución por estado (torta), seguimiento horizontal (0–100%) y evolución temporal.
  - Botones: guardar snapshots y exportar reporte en PDF.

- **Gestión de controles ISO/IEC 42001**
  - Lista base de controles predefinidos.
  - Crear, editar y eliminar controles.
  - Campos: estado, fechas, cumplimiento %, madurez %, anotaciones.
  - Exportar/Importar en CSV y JSON.

- **Configuración**
  - Definir empresa, responsables y anotaciones generales.
  - Eliminar toda la información (con confirmación).
  - Cambiar el modo del Dashboard (Torta + Línea o Solo Línea).

- **Acerca de**
  - Autor: **Eduardo Restrepo**.
  - Control de versiones con changelog.

- **Roles (RBAC)**
  - `viewer`: solo lectura.
  - `auditor`: editar controles.
  - `admin`: acceso completo y reinicio de datos.

---

## 📊 Reportes en PDF

El botón **Exportar Reporte (PDF)** genera un documento con:

1. **Portada**: logo, empresa, fecha, responsables.
2. **Dashboard completo** como imagen.
3. **Hallazgos (Top 5)**: controles con menor promedio de cumplimiento + madurez.

---

## 🛠️ Tecnologías utilizadas

- **HTML5 / CSS3 / JavaScript**
- **Chart.js** – para gráficos.
- **html2canvas** – para capturas.
- **jsPDF** – para generación de PDF.
- **LocalStorage** – persistencia de datos local.

---

## 📂 Estructura del proyecto

```bash
├── index.html       # Página principal
├── styles.css       # Estilos
├── app.js           # Lógica de la aplicación
├── assets/
│   └── logo.png     # Logo corporativo
└── docs/
    └── Manual_Usuario_ISO42001.pdf  # Manual de Usuario


