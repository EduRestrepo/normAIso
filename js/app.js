const state = {
  frameworks: [],
  evaluations: [],
  connectors: [],
  users: [],
  aiProviders: [],
  settings: [],
  dashboard: null,
  findings: [],
  auditLogs: [],
  selectedEvaluationId: null,
  selectedEvaluation: null,
  controls: [],
  selectedControlId: null,
  selectedControl: null
};

const pageTitles = {
  dashboard: 'Resumen operativo',
  evaluations: 'Gestion de evaluaciones',
  workspace: 'Mesa de control',
  findings: 'Hallazgos y planes de accion',
  connectors: 'Fuentes de evidencia',
  settings: 'Configuracion y gobierno'
};

async function api(path, options = {}) {
  const response = await fetch(path, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error inesperado' }));
    throw new Error(error.error || 'Error inesperado');
  }
  return response.json();
}

function toast(message) {
  const container = document.getElementById('toastContainer');
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  container.appendChild(node);
  setTimeout(() => node.remove(), 3500);
}

function badgeClass(result) {
  if (!result) return 'info';
  if (['cumple', 'cerrado', 'activo'].includes(String(result).toLowerCase())) return 'success';
  if (['cumple_parcialmente', 'parcial', 'en_progreso', 'revision', 'requiere_validacion_humana'].includes(String(result).toLowerCase())) return 'warning';
  if (['evidencia_insuficiente', 'no_cumple', 'alta', 'critica', 'abierto', 'inactivo'].includes(String(result).toLowerCase())) return 'danger';
  return 'info';
}

function safeDate(value) {
  return value ? String(value).slice(0, 10) : '';
}

function renderView(view) {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((section) => section.classList.remove('active'));
  document.getElementById(`${view}View`).classList.add('active');
  document.getElementById('pageTitle').textContent = pageTitles[view];
}

function renderDashboard() {
  const metrics = state.dashboard?.metrics;
  const operational = metrics?.operational || {};
  const dashboardMetrics = document.getElementById('dashboardMetrics');
  dashboardMetrics.innerHTML = '';

  [
    ['Evaluaciones', metrics?.evaluations ?? 0, 'Portafolio activo de auditorias'],
    ['Controles', metrics?.controls ?? 0, 'Controles importados desde tus marcos'],
    ['Hallazgos abiertos', operational.open_findings ?? 0, 'Seguimiento vivo de brechas'],
    ['Planes vencidos', operational.overdue_action_plans ?? 0, 'Compromisos que requieren atencion']
  ].forEach(([label, value, copy]) => {
    const card = document.createElement('article');
    card.className = 'metric-card';
    card.innerHTML = `<p class="eyebrow">${label}</p><strong>${value}</strong><span>${copy}</span>`;
    dashboardMetrics.appendChild(card);
  });

  const frameworkSummary = document.getElementById('frameworkSummary');
  if (!(state.dashboard?.frameworks || []).length) {
    frameworkSummary.innerHTML = '<article class="stack-item"><h4>Sin marcos registrados</h4><p>La plataforma arranca vacia. Registra un marco y sus controles en la seccion de evaluaciones.</p></article>';
    return;
  }

  frameworkSummary.innerHTML = state.dashboard.frameworks.map((framework) => `
    <article class="stack-item">
      <h4>${framework.name}</h4>
      <p>${framework.controls} controles vinculados en evaluaciones y ${framework.assessed} controles ya procesados.</p>
      <div class="meta-row">
        <span class="badge info">Confianza media ${framework.confidence || 0}%</span>
      </div>
    </article>
  `).join('');
}

function renderFrameworkOptions() {
  const selects = [
    document.getElementById('frameworkSelect'),
    document.getElementById('promptFramework'),
    document.getElementById('frameworkControlFramework')
  ];

  selects.forEach((select) => {
    select.innerHTML = '<option value="">Selecciona un marco</option>';
    state.frameworks.forEach((framework) => {
      const option = document.createElement('option');
      option.value = framework.id;
      option.textContent = `${framework.name} ${framework.version}`;
      select.appendChild(option);
    });
  });

  const findingEvaluation = document.getElementById('findingEvaluation');
  findingEvaluation.innerHTML = '<option value="">Selecciona una evaluacion</option>';
  state.evaluations.forEach((evaluation) => {
    const option = document.createElement('option');
    option.value = evaluation.id;
    option.textContent = `${evaluation.name} · ${evaluation.framework_name}`;
    findingEvaluation.appendChild(option);
  });

  const hasFrameworks = state.frameworks.length > 0;
  document.getElementById('frameworkSelect').disabled = !hasFrameworks;
  document.getElementById('frameworkRequiredMessage').classList.toggle('hidden', hasFrameworks);
}

function renderEvaluations() {
  const container = document.getElementById('evaluationsList');
  if (!state.evaluations.length) {
    container.innerHTML = '<p class="muted">Aun no hay evaluaciones creadas.</p>';
    return;
  }

  container.innerHTML = state.evaluations.map((evaluation) => `
    <article class="stack-item">
      <h4>${evaluation.name}</h4>
      <p>${evaluation.framework_name} · ${evaluation.auditee || 'Sin area'} · ${evaluation.period_label || 'Sin periodo'}</p>
      <div class="meta-row">
        <span class="badge info">${evaluation.controls_count} controles</span>
        <span class="badge">${evaluation.evidences_count} evidencias</span>
        <span class="badge">${evaluation.version_label}</span>
      </div>
      <div class="meta-row">
        <button class="btn btn-ghost" data-open-evaluation="${evaluation.id}">Abrir mesa de control</button>
      </div>
    </article>
  `).join('');
}

function renderFindings() {
  const container = document.getElementById('findingsList');
  if (!state.findings.length) {
    container.innerHTML = '<p class="muted">Todavia no hay hallazgos registrados.</p>';
    return;
  }

  container.innerHTML = state.findings.map((finding) => `
    <article class="stack-item">
      <h4>${finding.title}</h4>
      <p>${finding.evaluation_name || 'Sin evaluacion'}${finding.control_code ? ` · ${finding.control_code}` : ''}</p>
      <p class="muted">${finding.description || 'Sin descripcion adicional.'}</p>
      <div class="meta-row">
        <span class="badge ${badgeClass(finding.severity)}">${finding.severity}</span>
        <span class="badge ${badgeClass(finding.status)}">${finding.status}</span>
        <span class="badge info">${finding.action_plans_count} planes</span>
        <span class="badge">${finding.average_progress}% progreso</span>
      </div>
      <div class="meta-row">
        <button class="btn btn-ghost" data-open-action-form="${finding.id}">Nuevo plan</button>
      </div>
      <form class="form-grid hidden finding-action-form" id="finding-action-form-${finding.id}" data-finding-id="${finding.id}">
        <label>
          Titulo del plan
          <input name="title" required placeholder="Plan de remediacion">
        </label>
        <label>
          Responsable
          <input name="ownerName" placeholder="Responsable">
        </label>
        <label>
          Fecha objetivo
          <input name="targetDate" type="date">
        </label>
        <label class="full-span">
          Descripcion
          <textarea name="description" rows="3"></textarea>
        </label>
        <button class="btn btn-secondary" type="submit">Guardar plan de accion</button>
      </form>
    </article>
  `).join('');
}

function renderConnectors() {
  const container = document.getElementById('connectorsList');
  if (!state.connectors.length) {
    container.innerHTML = '<p class="muted">Todavia no hay fuentes registradas.</p>';
    return;
  }

  container.innerHTML = state.connectors.map((connector) => `
    <article class="stack-item">
      <h4>${connector.name}</h4>
      <p>${connector.connector_type} · ${connector.base_url || connector.base_path || 'Sin ubicacion base'}</p>
      <p class="muted">${connector.credentials_hint || 'Sin detalle de credenciales'}</p>
    </article>
  `).join('');
}

function renderSettings() {
  document.getElementById('usersList').innerHTML = state.users.length
    ? state.users.map((user) => `
        <article class="stack-item">
          <h4>${user.full_name}</h4>
          <p>${user.email}</p>
          <div class="meta-row"><span class="badge info">${user.role}</span></div>
        </article>
      `).join('')
    : '<p class="muted">No hay usuarios cargados.</p>';

  document.getElementById('providersList').innerHTML = state.aiProviders.length
    ? state.aiProviders.map((provider) => `
        <article class="stack-item">
          <h4>${provider.name}</h4>
          <p>${provider.provider_kind} · ${provider.provider_type} · ${provider.model_name}</p>
          <p class="muted">${provider.endpoint_url || 'Sin endpoint'}${provider.deployment_name ? ` · deployment ${provider.deployment_name}` : ''}</p>
          <div class="meta-row">
            <span class="badge ${provider.is_active ? 'success' : 'danger'}">${provider.is_active ? 'Activo' : 'Inactivo'}</span>
            <span class="badge info">${provider.api_version || 'Sin api version'}</span>
            <span class="badge">${provider.has_secret ? 'Secret configurado' : 'Sin secret'}</span>
          </div>
          <div class="meta-row">
            <button class="btn btn-ghost" data-test-provider="${provider.id}">Probar conexion</button>
          </div>
        </article>
      `).join('')
    : '<p class="muted">No hay motores IA registrados.</p>';

  document.getElementById('auditLogList').innerHTML = state.auditLogs.length
    ? state.auditLogs.slice(0, 12).map((log) => `
        <article class="stack-item">
          <h4>${log.action}</h4>
          <p>${log.entity_type} · ${log.entity_id}</p>
          <p class="muted">${safeDate(log.created_at)} · ${log.actor_name}</p>
        </article>
      `).join('')
    : '<p class="muted">Todavia no hay actividad registrada.</p>';
}

function renderControls() {
  const list = document.getElementById('controlsList');
  const workspaceTitle = document.getElementById('workspaceTitle');
  const processButton = document.getElementById('processEvaluationBtn');

  if (!state.selectedEvaluation) {
    workspaceTitle.textContent = 'Selecciona una evaluacion';
    processButton.disabled = true;
    list.innerHTML = '';
    return;
  }

  workspaceTitle.textContent = `${state.selectedEvaluation.name} · ${state.selectedEvaluation.framework_name}`;
  processButton.disabled = false;

  list.innerHTML = state.controls.map((control) => `
    <article class="control-item ${control.id === state.selectedControlId ? 'active' : ''}" data-control-id="${control.id}">
      <p class="eyebrow">${control.domain}</p>
      <h4>${control.code} · ${control.title}</h4>
      <p>${control.description}</p>
      <div class="badge-row">
        <span class="badge info">${control.evidence_count} evidencias</span>
        <span class="badge ${badgeClass(control.latest_result)}">${control.latest_result || 'pendiente'}</span>
        <span class="badge">${Math.round((Number(control.latest_confidence) || 0) * 100)}% confianza</span>
        <span class="badge ${control.active_findings_count ? 'warning' : 'info'}">${control.active_findings_count || 0} hallazgos</span>
      </div>
    </article>
  `).join('');
}

function renderControlDetail() {
  const empty = document.getElementById('controlDetailEmpty');
  const detail = document.getElementById('controlDetail');

  if (!state.selectedControl) {
    empty.classList.remove('hidden');
    detail.classList.add('hidden');
    detail.innerHTML = '';
    return;
  }

  empty.classList.add('hidden');
  detail.classList.remove('hidden');

  const control = state.selectedControl;
  detail.innerHTML = `
    <div class="detail-panel">
      <section class="detail-block">
        <p class="eyebrow">${control.domain}</p>
        <h3>${control.code} · ${control.title}</h3>
        <p>${control.description}</p>
        <div class="badge-row">
          <span class="badge ${badgeClass(control.latest_result)}">${control.latest_result || 'pendiente'}</span>
          <span class="badge info">Confianza ${Math.round((Number(control.latest_confidence) || 0) * 100)}%</span>
          <span class="badge">${control.evidence_count} evidencias</span>
          <span class="badge ${control.active_findings_count ? 'warning' : 'info'}">${control.active_findings_count || 0} hallazgos activos</span>
        </div>
      </section>

      <section class="detail-block">
        <h4>Resultado automatico</h4>
        <p>${control.latest_summary || 'Todavia no se ha ejecutado una evaluacion automatica para este control.'}</p>
        <div class="split">
          <div>
            <p class="eyebrow">Fortalezas</p>
            <div class="stack-list">${(control.latest_strengths || []).map((item) => `<div class="evidence-item">${item}</div>`).join('') || '<div class="evidence-item">Sin fortalezas registradas todavia.</div>'}</div>
          </div>
          <div>
            <p class="eyebrow">Brechas</p>
            <div class="stack-list">${(control.latest_missing_evidence || []).map((item) => `<div class="evidence-item">${item}</div>`).join('') || '<div class="evidence-item">Sin brechas registradas todavia.</div>'}</div>
          </div>
        </div>
        <div class="meta-row">
          <button class="btn btn-primary" id="processControlBtn">Procesar este control</button>
          <button class="btn btn-secondary" id="createFindingBtn">Crear hallazgo</button>
        </div>
      </section>

      <section class="detail-block">
        <h4>Registro del auditor</h4>
        <form id="notesForm" class="form-grid">
          <label class="full-span">
            Notas del auditor
            <textarea id="auditorNotes" rows="4">${control.auditor_notes || ''}</textarea>
          </label>
          <label class="full-span">
            Aclaracion o compensatorio
            <textarea id="compensatoryNotes" rows="4">${control.compensatory_notes || ''}</textarea>
          </label>
          <button class="btn btn-secondary" type="submit">Guardar observaciones</button>
        </form>
      </section>

      <section class="detail-block">
        <h4>Adjuntar evidencia</h4>
        <div class="split">
          <form id="uploadEvidenceForm" class="form-grid">
            <label>
              Rol de evidencia
              <select id="uploadEvidenceRole">
                <option value="principal">Principal</option>
                <option value="compensatoria">Compensatoria</option>
              </select>
            </label>
            <label>
              Etiqueta de fuente
              <input id="uploadSourceLabel" value="Carga manual">
            </label>
            <label class="full-span">
              Archivo
              <input id="uploadFile" type="file" required>
            </label>
            <label class="full-span">
              Nota
              <textarea id="uploadNotes" rows="3"></textarea>
            </label>
            <button class="btn btn-primary" type="submit">Subir archivo</button>
          </form>

          <form id="referenceEvidenceForm" class="form-grid">
            <label>
              Rol de evidencia
              <select id="referenceEvidenceRole">
                <option value="principal">Principal</option>
                <option value="compensatoria">Compensatoria</option>
              </select>
            </label>
            <label>
              Origen
              <select id="referenceOriginType">
                <option value="sharepoint">SharePoint</option>
                <option value="filesystem">Filesystem</option>
                <option value="url">URL</option>
                <option value="onedrive">OneDrive</option>
              </select>
            </label>
            <label>
              Conector
              <select id="referenceConnector">
                <option value="">Sin conector</option>
                ${state.connectors.map((connector) => `<option value="${connector.id}">${connector.name}</option>`).join('')}
              </select>
            </label>
            <label>
              Nombre del archivo
              <input id="referenceFileName" required>
            </label>
            <label class="full-span">
              Ruta o identificador
              <input id="referencePath">
            </label>
            <label class="full-span">
              URL
              <input id="referenceUrl">
            </label>
            <label class="full-span">
              Texto extraido o resumen manual
              <textarea id="referenceExtractedText" rows="4"></textarea>
            </label>
            <button class="btn btn-secondary" type="submit">Referenciar evidencia</button>
          </form>
        </div>
      </section>

      <section class="detail-block">
        <h4>Evidencias registradas</h4>
        <div id="controlEvidenceList" class="stack-list"></div>
      </section>
    </div>
  `;

  bindControlDetailEvents();
  loadEvidenceList(control.id);
}

async function loadEvidenceList(controlId) {
  const container = document.getElementById('controlEvidenceList');
  container.innerHTML = '<div class="evidence-item">Cargando evidencias...</div>';
  const evidences = await api(`/api/evaluation-controls/${controlId}/evidences`);
  container.innerHTML = evidences.length
    ? evidences.map((evidence) => `
        <article class="evidence-item">
          <h4>${evidence.file_name || 'Referencia documental'} <span class="muted">· ${evidence.origin_type}</span></h4>
          <p>${evidence.source_label || 'Sin etiqueta'}${evidence.connector_name ? ` · ${evidence.connector_name}` : ''}</p>
          <p class="muted">${evidence.reference_path || evidence.external_url || evidence.stored_path || 'Sin ubicacion registrada'}</p>
          <div class="badge-row">
            <span class="badge ${evidence.evidence_role === 'compensatoria' ? 'warning' : 'info'}">${evidence.evidence_role}</span>
          </div>
        </article>
      `).join('')
    : '<div class="evidence-item">Todavia no hay evidencias asociadas a este control.</div>';
}

async function refreshWorkspaceSelection() {
  if (!state.selectedEvaluationId) return;
  state.selectedEvaluation = state.evaluations.find((item) => item.id === state.selectedEvaluationId) || null;
  state.controls = await api(`/api/evaluations/${state.selectedEvaluationId}/controls`);
  state.selectedControl = state.selectedControlId
    ? state.controls.find((item) => item.id === state.selectedControlId) || null
    : null;
  renderControls();
  renderControlDetail();
}

async function loadAll() {
  const [health, dashboard, frameworks, evaluations, connectors, settings, findings, auditLogs] = await Promise.all([
    api('/api/health'),
    api('/api/dashboard'),
    api('/api/frameworks'),
    api('/api/evaluations'),
    api('/api/connectors'),
    api('/api/settings'),
    api('/api/findings'),
    api('/api/audit-logs')
  ]);

  document.getElementById('connectionBadge').textContent = health.ok ? 'Base conectada' : 'Error de conexion';
  state.dashboard = dashboard;
  state.frameworks = frameworks;
  state.evaluations = evaluations;
  state.connectors = connectors;
  state.settings = settings.settings;
  state.users = settings.users;
  state.aiProviders = settings.aiProviders;
  state.findings = findings;
  state.auditLogs = auditLogs;

  renderDashboard();
  renderFrameworkOptions();
  renderEvaluations();
  renderFindings();
  renderConnectors();
  renderSettings();
}

function bindControlDetailEvents() {
  document.getElementById('notesForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api(`/api/evaluation-controls/${state.selectedControl.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auditorNotes: document.getElementById('auditorNotes').value,
        compensatoryNotes: document.getElementById('compensatoryNotes').value
      })
    });
    toast('Observaciones guardadas');
    await refreshWorkspaceSelection();
  });

  document.getElementById('uploadEvidenceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const file = document.getElementById('uploadFile').files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    formData.append('evidenceRole', document.getElementById('uploadEvidenceRole').value);
    formData.append('sourceLabel', document.getElementById('uploadSourceLabel').value);
    formData.append('notes', document.getElementById('uploadNotes').value);
    formData.append('clarificationText', document.getElementById('compensatoryNotes').value || '');

    const response = await fetch(`/api/evaluation-controls/${state.selectedControl.id}/evidences/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error al subir archivo' }));
      throw new Error(error.error || 'Error al subir archivo');
    }

    toast('Archivo asociado al control');
    await refreshWorkspaceSelection();
  });

  document.getElementById('referenceEvidenceForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api(`/api/evaluation-controls/${state.selectedControl.id}/evidences/reference`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceRole: document.getElementById('referenceEvidenceRole').value,
        originType: document.getElementById('referenceOriginType').value,
        connectorId: document.getElementById('referenceConnector').value || null,
        sourceLabel: document.getElementById('referenceOriginType').selectedOptions[0].textContent,
        fileName: document.getElementById('referenceFileName').value,
        referencePath: document.getElementById('referencePath').value,
        externalUrl: document.getElementById('referenceUrl').value,
        extractedText: document.getElementById('referenceExtractedText').value,
        clarificationText: document.getElementById('compensatoryNotes').value || ''
      })
    });
    toast('Referencia documental registrada');
    await refreshWorkspaceSelection();
  });

  document.getElementById('processControlBtn').addEventListener('click', async () => {
    await api(`/api/evaluation-controls/${state.selectedControl.id}/process`, { method: 'POST' });
    toast('Control procesado');
    await loadAll();
    await refreshWorkspaceSelection();
  });

  document.getElementById('createFindingBtn').addEventListener('click', async () => {
    await api(`/api/evaluation-controls/${state.selectedControl.id}/create-finding`, { method: 'POST' });
    toast('Hallazgo creado o reutilizado para este control');
    await loadAll();
    await refreshWorkspaceSelection();
    renderView('findings');
  });
}

function bindGlobalEvents() {
  document.querySelectorAll('.nav-item').forEach((button) => {
    button.addEventListener('click', () => renderView(button.dataset.view));
  });

  document.getElementById('goToCreateEvaluation').addEventListener('click', () => renderView('evaluations'));

  document.getElementById('frameworkForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/api/frameworks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('frameworkName').value,
        code: document.getElementById('frameworkCode').value,
        version: document.getElementById('frameworkVersion').value,
        description: document.getElementById('frameworkDescription').value
      })
    });
    toast('Marco guardado');
    event.target.reset();
    await loadAll();
  });

  document.getElementById('frameworkControlForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const frameworkId = Number(document.getElementById('frameworkControlFramework').value);
    if (!frameworkId) {
      toast('Selecciona un marco para el control');
      return;
    }
    await api(`/api/frameworks/${frameworkId}/controls`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: document.getElementById('frameworkControlCode').value,
        domain: document.getElementById('frameworkControlDomain').value,
        title: document.getElementById('frameworkControlTitle').value,
        description: document.getElementById('frameworkControlDescription').value,
        objective: document.getElementById('frameworkControlObjective').value
      })
    });
    toast('Control guardado en el marco');
    event.target.reset();
    await loadAll();
  });

  document.getElementById('evaluationForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!state.frameworks.length) {
      toast('Primero registra un marco');
      return;
    }
    await api('/api/evaluations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frameworkId: Number(document.getElementById('frameworkSelect').value),
        name: document.getElementById('evaluationName').value,
        auditee: document.getElementById('evaluationAuditee').value,
        scope: document.getElementById('evaluationScope').value,
        periodLabel: document.getElementById('evaluationPeriod').value,
        versionLabel: document.getElementById('evaluationVersion').value
      })
    });
    toast('Evaluacion creada con sus controles');
    event.target.reset();
    document.getElementById('evaluationVersion').value = 'v1';
    await loadAll();
  });

  document.getElementById('findingForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/api/findings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evaluationId: Number(document.getElementById('findingEvaluation').value),
        title: document.getElementById('findingTitle').value,
        severity: document.getElementById('findingSeverity').value,
        ownerName: document.getElementById('findingOwner').value,
        dueDate: document.getElementById('findingDueDate').value || null,
        description: document.getElementById('findingDescription').value,
        recommendation: document.getElementById('findingRecommendation').value
      })
    });
    toast('Hallazgo registrado');
    event.target.reset();
    await loadAll();
  });

  document.getElementById('findingsList').addEventListener('click', (event) => {
    const button = event.target.closest('[data-open-action-form]');
    if (!button) return;
    const form = document.getElementById(`finding-action-form-${button.dataset.openActionForm}`);
    if (form) form.classList.toggle('hidden');
  });

  document.getElementById('findingsList').addEventListener('submit', async (event) => {
    const form = event.target.closest('.finding-action-form');
    if (!form) return;
    event.preventDefault();
    const findingId = form.dataset.findingId;
    await api(`/api/findings/${findingId}/action-plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: form.elements.title.value,
        ownerName: form.elements.ownerName.value,
        targetDate: form.elements.targetDate.value || null,
        description: form.elements.description.value
      })
    });
    toast('Plan de accion guardado');
    await loadAll();
  });

  document.getElementById('evaluationsList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-open-evaluation]');
    if (!button) return;
    state.selectedEvaluationId = Number(button.dataset.openEvaluation);
    state.selectedControlId = null;
    state.selectedControl = null;
    renderView('workspace');
    await refreshWorkspaceSelection();
  });

  document.getElementById('controlsList').addEventListener('click', async (event) => {
    const item = event.target.closest('[data-control-id]');
    if (!item) return;
    state.selectedControlId = Number(item.dataset.controlId);
    state.selectedControl = state.controls.find((control) => control.id === state.selectedControlId) || null;
    renderControls();
    renderControlDetail();
  });

  document.getElementById('processEvaluationBtn').addEventListener('click', async () => {
    if (!state.selectedEvaluationId) return;
    await api(`/api/evaluations/${state.selectedEvaluationId}/process`, { method: 'POST' });
    toast('Evaluacion completa procesada');
    await loadAll();
    await refreshWorkspaceSelection();
  });

  document.getElementById('connectorForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/api/connectors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('connectorName').value,
        connectorType: document.getElementById('connectorType').value,
        basePath: document.getElementById('connectorPath').value,
        baseUrl: document.getElementById('connectorUrl').value,
        credentialsHint: document.getElementById('connectorHint').value
      })
    });
    toast('Fuente de datos guardada');
    event.target.reset();
    await loadAll();
  });

  document.getElementById('providersList').addEventListener('click', async (event) => {
    const button = event.target.closest('[data-test-provider]');
    if (!button) return;
    const result = await api(`/api/ai-providers/${button.dataset.testProvider}/test`, { method: 'POST' });
    toast(result.message || 'Conexion valida');
  });

  document.getElementById('providerForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    await api('/api/ai-providers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('providerName').value,
        providerType: document.getElementById('providerType').value,
        providerKind: document.getElementById('providerKind').value,
        modelName: document.getElementById('providerModel').value,
        deploymentName: document.getElementById('providerDeployment').value,
        endpointUrl: document.getElementById('providerEndpoint').value,
        apiVersion: document.getElementById('providerApiVersion').value,
        secret: document.getElementById('providerSecret').value,
        secretHint: document.getElementById('providerSecretHint').value
      })
    });
    toast('Motor IA guardado');
    event.target.reset();
    document.getElementById('providerApiVersion').value = '2024-05-01-preview';
    document.getElementById('providerKind').value = 'azure_foundry';
    await loadAll();
  });

  document.getElementById('promptFramework').addEventListener('change', (event) => {
    const framework = state.frameworks.find((item) => item.id === Number(event.target.value));
    if (!framework) return;
    const setting = state.settings.find((item) => item.category === 'prompt' && item.key === framework.code);
    document.getElementById('promptText').value = setting?.value_json?.promptText || '';
  });

  document.getElementById('promptForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const framework = state.frameworks.find((item) => item.id === Number(document.getElementById('promptFramework').value));
    if (!framework) {
      toast('Selecciona un marco');
      return;
    }
    await api('/api/settings/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frameworkCode: framework.code,
        promptText: document.getElementById('promptText').value
      })
    });
    toast('Prompt actualizado');
    await loadAll();
  });
}

async function init() {
  bindGlobalEvents();
  try {
    await loadAll();
    document.getElementById('providerApiVersion').value = '2024-05-01-preview';
    document.getElementById('providerKind').value = 'azure_foundry';
    toast('Backend listo para configuracion de Azure Foundry');
  } catch (error) {
    document.getElementById('connectionBadge').textContent = 'Error de conexion';
    toast(error.message);
  }
}

init();
