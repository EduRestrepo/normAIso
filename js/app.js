console.log('js/app.js cargado correctamente');
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

// Export for inline scripts IMMEDIATELY
window.state = state;
window.api = api;
window.toast = toast;
window.loadAll = loadAll;
window.renderView = renderView;
window.switchView = renderView;
window.renderFrameworks = () => { console.log('Llamando a renderFrameworks desde window'); renderFrameworks(); };
window.renderFrameworkOptions = renderFrameworkOptions;
window.renderDashboard = renderDashboard;
window.renderEvaluations = renderEvaluations;
window.renderFindings = renderFindings;
window.renderConnectors = renderConnectors;
window.renderSettings = renderSettings;
window.viewFrameworkControls = viewFrameworkControls;

function renderView(view) {
  document.querySelectorAll('.cf-nav-item').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === view);
  });
  document.querySelectorAll('.view').forEach((section) => section.classList.remove('active'));
  const target = document.getElementById(`${view}View`);
  if (target) target.classList.add('active');
  const title = document.getElementById('pageTitle');
  if (title) title.textContent = pageTitles[view] || 'Gestión';
  if (window.lucide) lucide.createIcons();
}

function renderDashboard() {
  const metrics = state.dashboard?.metrics;
  const operational = metrics?.operational || {};
  const dashboardMetrics = document.getElementById('dashboardMetrics');
  if (!dashboardMetrics) return;
  dashboardMetrics.innerHTML = '';
  [
    ['Evaluaciones', metrics?.evaluations ?? 0, 'Portafolio activo de auditorias'],
    ['Controles', metrics?.controls ?? 0, 'Controles importados desde tus marcos'],
    ['Cumplimiento Global', `${metrics?.compliance?.score ?? 0}%`, `Basado en ${metrics?.compliance?.totalAssessed ?? 0} controles evaluados`],
    ['Hallazgos abiertos', operational.open_findings ?? 0, 'Seguimiento vivo de brechas'],
    ['Planes vencidos', operational.overdue_action_plans ?? 0, 'Compromisos que requieren atencion']
  ].forEach(([label, value, copy]) => {
    const card = document.createElement('article');
    card.className = 'cf-kpi';
    card.innerHTML = `<span>${label}</span><strong>${value}</strong><p>${copy}</p>`;
    dashboardMetrics.appendChild(card);
  });

  const frameworkSummary = document.getElementById('frameworkSummary');
  if (!frameworkSummary) return;
  if (!(state.dashboard?.frameworks || []).length) {
    frameworkSummary.innerHTML = '<article class="cf-item"><h4>Sin marcos registrados</h4><p>La plataforma arranca vacia.</p></article>';
    return;
  }

  frameworkSummary.innerHTML = state.dashboard.frameworks.map((framework) => `
    <article class="cf-item">
      <h4>${framework.name}</h4>
      <p>${framework.controls} controles vinculados y ${framework.assessed} ya procesados.</p>
    </article>
  `).join('');
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
    <article class="cf-item ${control.id === state.selectedControlId ? 'active' : ''}" 
             data-control-id="${control.id}"
             style="${control.is_auditable ? '' : 'opacity: 0.5; filter: grayscale(1);'}">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <span class="muted" style="font-size: 0.7rem; font-weight: 800; text-transform: uppercase;">${control.domain}</span>
          <h4 style="margin: 4px 0;">${control.code} · ${control.title}</h4>
        </div>
        ${control.is_auditable ? '' : '<span class="badge" style="background: #334155;">N/A</span>'}
      </div>
      <div class="meta-row">
        <span class="badge badge-info">${control.evidence_count} evidencias</span>
        <span class="badge ${badgeClass(control.latest_result) === 'success' ? 'badge-success' : (badgeClass(control.latest_result) === 'danger' ? 'badge-danger' : 'badge-info')}">${control.latest_result || 'pendiente'}</span>
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
    <div class="cf-panel" style="animation: cf-fade 0.3s ease;">
      <div class="cf-panel-header">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
            <div>
                <span class="text-accent" style="font-size: 0.8rem; font-weight: 800;">${control.domain}</span>
                <h2 style="margin-top: 4px;">${control.code} · ${control.title}</h2>
            </div>
            <div style="text-align: right;">
                <label class="switch-container" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <span class="muted" style="font-size: 0.75rem;">AUDITABLE</span>
                    <input type="checkbox" id="toggleAuditable" ${control.is_auditable ? 'checked' : ''} style="width: 16px; height: 16px; cursor: pointer;">
                </label>
            </div>
        </div>
      </div>
      
      <p class="muted" style="margin-bottom: 24px; border-left: 2px solid var(--accent-color); padding-left: 16px;">${control.description}</p>

      <div class="cf-grid two">
        <div class="cf-item">
            <span class="muted">RESULTADO IA</span>
            <h3 style="margin: 8px 0;" class="${badgeClass(control.latest_result) === 'success' ? 'text-accent' : ''}">${control.latest_result || 'Pendiente'}</h3>
            <p>${Math.round((Number(control.latest_confidence) || 0) * 100)}% de confianza</p>
        </div>
        <div class="cf-item">
            <span class="muted">EVIDENCIAS</span>
            <h3 style="margin: 8px 0;">${control.evidence_count}</h3>
            <p>Soportes vinculados</p>
        </div>
      </div>

      <div class="cf-list" style="margin-top: 32px;">
        <div class="cf-panel-header"><h4><i data-lucide="file-text"></i> Gestión de Evidencias</h4></div>
        <div class="cf-grid two">
            <form id="uploadEvidenceForm" class="cf-list">
                <div class="form-group">
                    <label>Carga Directa</label>
                    <input id="uploadFile" type="file" required>
                </div>
                <button class="btn btn-primary" type="submit">Subir Archivo</button>
            </form>
            <form id="referenceEvidenceForm" class="cf-list">
                <div class="form-group">
                    <label>Referencia Externa (SP / URL)</label>
                    <input id="referenceFileName" placeholder="Nombre" required>
                    <input id="referenceUrl" placeholder="URL" style="margin-top: 8px;">
                </div>
                <button class="btn btn-ghost" type="submit">Vincular</button>
            </form>
        </div>
      </div>

      <div class="cf-list" style="margin-top: 32px;">
         <div class="cf-panel-header"><h4><i data-lucide="history"></i> Lista de Evidencias</h4></div>
         <div id="controlEvidenceList" class="cf-list"></div>
      </div>

      <div class="meta-row" style="margin-top: 40px; padding-top: 24px; border-top: 1px solid var(--glass-border);">
        <button class="btn btn-primary" id="processControlBtn">Procesar con IA</button>
        <button class="btn btn-ghost" id="createFindingBtn">Generar Hallazgo</button>
      </div>
    </div>
  `;

  bindControlDetailEvents();
  loadEvidenceList(control.id);
}

async function loadEvidenceList(controlId) {
  const container = document.getElementById('controlEvidenceList');
  if (!container) return;
  container.innerHTML = '<div class="cf-item muted">Cargando evidencias...</div>';
  const evidences = await api(`/api/evaluation-controls/${controlId}/evidences`);
  container.innerHTML = evidences.length
    ? evidences.map((evidence) => `
        <div class="cf-item" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h4 style="margin: 0;">${evidence.file_name || 'Referencia'}</h4>
            <span class="muted" style="font-size: 0.8rem;">${evidence.origin_type} · ${evidence.source_label || ''}</span>
          </div>
          <span class="badge badge-info">${evidence.evidence_role}</span>
        </div>
      `).join('')
    : '<div class="cf-item muted">Sin evidencias registradas.</div>';
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
  console.log('--- Iniciando carga total de datos ---');
  try {
    const [health, dashboard, frameworks, evaluations, connectors, settings, findings, auditLogs, trend] = await Promise.all([
      api('/api/health'),
      api('/api/dashboard'),
      api('/api/frameworks'),
      api('/api/evaluations'),
      api('/api/connectors'),
      api('/api/settings'),
      api('/api/findings'),
      api('/api/audit-logs'),
      api('/api/dashboard/trend')
    ]);

    console.log('API Response - Trend:', trend);
    console.table(frameworks);
    
    const badge = document.getElementById('connectionBadge');
    if (badge) badge.textContent = health.ok ? 'Base conectada' : 'Error de conexion';
    
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
    renderFrameworks();
    renderEvaluations();
    renderFindings();
    renderConnectors();
    renderSettings();
    renderTrendChart(trend);
    console.log('--- Renderizado completo ---');
  } catch (error) {
    console.error('Error fatal en loadAll:', error);
    alert('Error al cargar datos: ' + error.message);
  }
}

let trendChart = null;
function renderTrendChart(trendData) {
  const ctx = document.getElementById('complianceTrendChart');
  if (!ctx || !trendData) return;

  if (trendChart) trendChart.destroy();

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.map(d => safeDate(d.date)),
      datasets: [{
        label: 'Cumplimiento Global (%)',
        data: trendData.map(d => d.score),
        borderColor: '#38bdf8',
        backgroundColor: 'rgba(56, 189, 248, 0.1)',
        borderWidth: 3,
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#38bdf8',
        pointBorderColor: '#fff',
        pointHoverRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          grid: { color: 'rgba(255, 255, 255, 0.05)' },
          ticks: { color: '#94a3b8' }
        },
        x: {
          grid: { display: false },
          ticks: { color: '#94a3b8' }
        }
      }
    }
  });
}

function renderFrameworks() {
  const container = document.getElementById('frameworksList');
  if (!container) return;
  container.style.display = 'block';
  const detail = container.nextElementSibling;
  if (detail && detail.tagName === 'DIV') detail.remove();

  console.log('Renderizando frameworks list. Count:', state.frameworks.length);
  if (!state.frameworks.length) {
    container.innerHTML = '<p class="muted">No hay marcos normativos registrados en la DB.</p>';
    return;
  }
  container.innerHTML = state.frameworks.map(fw => `
    <div class="cf-item" style="cursor: pointer;" onclick="window.viewFrameworkControls(${fw.id}, '${fw.name}')">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h4 style="margin: 0; color: var(--accent-color);">${fw.name}</h4>
          <p class="muted" style="font-size: 0.8rem; margin-top: 4px;">Código: ${fw.code} · Versión: ${fw.version}</p>
        </div>
        <div style="text-align: right;">
            <span class="badge badge-info">${fw.controls_count || 0} Controles</span>
            <div class="muted" style="font-size: 0.7rem; margin-top: 4px;">Clic para ver detalle</div>
        </div>
      </div>
      <p style="font-size: 0.85rem; margin-top: 12px; color: var(--text-secondary); line-height: 1.4;">${fw.description || 'Sin descripción.'}</p>
    </div>
  `).join('');
}

async function viewFrameworkControls(id, name) {
  const container = document.getElementById('frameworksList');
  const controls = await api(`/api/frameworks/${id}/controls`);
  
  const modalHtml = `
    <div class="cf-panel-detail" style="margin-top: 0;">
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--glass-border); padding-bottom: 20px; margin-bottom: 20px;">
            <div>
                <h3 style="color: var(--accent-color); margin: 0;">${name}</h3>
                <p class="muted" style="font-size: 0.85rem; margin-top: 4px;">Explorando ${controls.length} puntos de control definidos</p>
            </div>
            <button class="btn btn-ghost" onclick="window.renderFrameworks()">
                <i data-lucide="arrow-left"></i> Volver a la Lista
            </button>
        </div>
        <div class="cf-list" style="max-height: 600px; overflow-y: auto; padding-right: 10px;">
            ${controls.map(c => `
                <div class="cf-item" style="border-left: 3px solid var(--accent-color); background: rgba(56, 189, 248, 0.03);">
                    <div style="display: flex; gap: 16px; align-items: flex-start;">
                        <span class="badge badge-info" style="font-family: monospace; font-size: 0.9rem; padding: 6px 10px;">${c.code}</span>
                        <div style="flex: 1;">
                            <h4 style="margin: 0; font-size: 1.1rem;">${c.title}</h4>
                            <p class="muted" style="font-size: 0.8rem; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;">DOMINIO: ${c.domain}</p>
                            <p style="margin-top: 12px; line-height: 1.5; color: var(--text-primary);">${c.description}</p>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
  `;
  container.insertAdjacentHTML('afterend', modalHtml);
  container.style.display = 'none';
  lucide.createIcons();
}
window.viewFrameworkControls = viewFrameworkControls;

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

  on('toggleAuditable', 'change', async (event) => {
    const isAuditable = event.target.checked;
    await api(`/api/evaluation-controls/${state.selectedControl.id}/auditable`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isAuditable })
    });
    toast(isAuditable ? 'Control marcado como auditable' : 'Control marcado como No Aplicable (N/A)');
    await refreshWorkspaceSelection();
    await loadAll();
  });
}

function on(id, event, callback) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, callback);
}

function bindGlobalEvents() {
  on('goToCreateEvaluation', 'click', () => renderView('evaluations'));

  on('frameworkForm', 'submit', async (event) => {
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

  on('frameworkControlForm', 'submit', async (event) => {
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

  on('evaluationForm', 'submit', async (event) => {
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
        versionLabel: document.getElementById('evaluationVersion').value,
        participants: Array.from(document.querySelectorAll('.participant-row')).map(row => ({
          name: row.querySelector('.p-name').value,
          email: row.querySelector('.p-email').value,
          role: row.querySelector('.p-role').value
        }))
      })
    });
    toast('Evaluacion creada con sus controles e interesados');
    event.target.reset();
    document.getElementById('participantsContainer').innerHTML = '';
    document.getElementById('evaluationVersion').value = 'v1';
    await loadAll();
  });

  window.addParticipantRow = () => {
    const container = document.getElementById('participantsContainer');
    const row = document.createElement('div');
    row.className = 'participant-row';
    row.style = 'display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 8px; align-items: center;';
    row.innerHTML = `
      <input class="p-name" placeholder="Nombre" required style="padding: 8px;">
      <input class="p-email" placeholder="Correo" style="padding: 8px;">
      <input class="p-role" placeholder="Rol" style="padding: 8px;">
      <button type="button" class="btn btn-ghost btn-sm text-danger" onclick="this.parentElement.remove()" style="padding: 4px;">
        <i data-lucide="trash-2" size="16"></i>
      </button>
    `;
    container.appendChild(row);
    if (window.lucide) lucide.createIcons();
  };

  on('evaluationsList', 'click', (event) => {
    const editBtn = event.target.closest('[data-edit-evaluation]');
    if (editBtn) {
      const id = Number(editBtn.dataset.editEvaluation);
      const evalItem = state.evaluations.find(e => e.id === id);
      if (evalItem) {
        document.getElementById('editEvaluationId').value = evalItem.id;
        document.getElementById('editEvaluationName').value = evalItem.name;
        document.getElementById('editEvaluationAuditee').value = evalItem.auditee || '';
        document.getElementById('editEvaluationPeriod').value = evalItem.period_label || '';
        document.getElementById('editEvaluationModal').classList.remove('hidden');
      }
    }
  });

  on('editEvaluationForm', 'submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('editEvaluationId').value;
    await api(`/api/evaluations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('editEvaluationName').value,
        auditee: document.getElementById('editEvaluationAuditee').value,
        periodLabel: document.getElementById('editEvaluationPeriod').value
      })
    });
    toast('Auditoría actualizada correctamente');
    document.getElementById('editEvaluationModal').classList.add('hidden');
    await loadAll();
  });

  on('findingForm', 'submit', async (event) => {
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

  on('findingsList', 'click', (event) => {
    const button = event.target.closest('[data-open-action-form]');
    if (!button) return;
    const form = document.getElementById(`finding-action-form-${button.dataset.openActionForm}`);
    if (form) form.classList.toggle('hidden');
  });

  on('findingsList', 'submit', async (event) => {
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

  on('seedFrameworkBtn', 'click', async () => {
    try {
      const frameworks = [
        { name: 'ISO/IEC 27001', code: 'ISO27001', version: '2022', desc: 'Estándar internacional para la Seguridad de la Información.' },
        { name: 'ENS (Esquema Nacional de Seguridad)', code: 'ENS', version: 'v3', desc: 'Regulación de seguridad en la administración pública española.' },
        { name: 'ISO/IEC 42001', code: 'ISO42001', version: '2023', desc: 'Sistema de Gestión de Inteligencia Artificial.' }
      ];

      for (const fw of frameworks) {
        const createdFw = await api('/api/frameworks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: fw.name, code: fw.code, version: fw.version, description: fw.desc })
        });

        let controls = [];
        if (fw.code === 'ISO27001') {
          controls = [
            { code: 'A.5.1', domain: 'Políticas', title: 'Políticas para la seguridad de la información' },
            { code: 'A.8.10', domain: 'Criptografía', title: 'Controles criptográficos' }
          ];
        } else if (fw.code === 'ENS') {
          controls = [
            { code: 'op.exp.1', domain: 'Operacional', title: 'Explotación - Planificación' },
            { code: 'mp.com.2', domain: 'Medidas de Protección', title: 'Comunicaciones - Protección' }
          ];
        } else if (fw.code === 'ISO42001') {
          controls = [
            { code: 'B.5.2', domain: 'Gobernanza AI', title: 'Política de Inteligencia Artificial' },
            { code: 'B.7.1', domain: 'Gestión de Datos', title: 'Calidad de datos para sistemas AI' }
          ];
        }

        for (const ctrl of controls) {
          await api(`/api/frameworks/${createdFw.id}/controls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...ctrl, description: `Requisito normativo para ${fw.name}`, objective: 'Validar cumplimiento' })
          });
        }
      }

      toast('Marcos normativos (ISO 27001, ENS, ISO 42001) cargados correctamente');
      await loadAll();
    } catch (e) {
      toast('Error al cargar ejemplos: ' + e.message);
    }
  });

  on('evaluationsList', 'click', async (event) => {
    const button = event.target.closest('[data-open-evaluation]');
    if (!button) return;
    state.selectedEvaluationId = Number(button.dataset.openEvaluation);
    state.selectedControlId = null;
    state.selectedControl = null;
    renderView('workspace');
    await refreshWorkspaceSelection();
  });

  on('controlsList', 'click', async (event) => {
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
        evaluationId: Number(document.getElementById('connectorEvaluation').value),
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

  on('providersList', 'click', async (event) => {
    const button = event.target.closest('[data-test-provider]');
    if (!button) return;
    const result = await api(`/api/ai-providers/${button.dataset.testProvider}/test`, { method: 'POST' });
    toast(result.message || 'Conexion valida');
  });

  on('providerForm', 'submit', async (event) => {
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

  on('testConnectionBtn', 'click', async () => {
    try {
      const data = {
        name: document.getElementById('providerName').value,
        providerType: document.getElementById('providerType').value,
        providerKind: document.getElementById('providerKind').value,
        modelName: document.getElementById('providerModel').value,
        deploymentName: document.getElementById('providerDeployment').value,
        endpointUrl: document.getElementById('providerEndpoint').value,
        apiVersion: document.getElementById('providerApiVersion').value,
        secret: document.getElementById('providerSecret').value
      };
      
      toast('Probando conexión con Azure Foundry...');
      const result = await api('/api/ai-providers/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      toast(result.message || 'Conexión exitosa');
    } catch (e) {
      toast('Error de conexión: ' + e.message);
    }
  });

  on('promptFramework', 'change', (event) => {
    const framework = state.frameworks.find((item) => item.id === Number(event.target.value));
    if (!framework) return;
    const setting = state.settings.find((item) => item.category === 'prompt' && item.key === framework.code);
    document.getElementById('promptText').value = setting?.value_json?.promptText || '';
  });

  on('promptForm', 'submit', async (event) => {
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

  on('frameworkForm', 'submit', async (event) => {
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
    toast('Marco normativo guardado');
    event.target.reset();
    await loadAll();
  });

  on('frameworkControlForm', 'submit', async (event) => {
    event.preventDefault();
    const frameworkId = document.getElementById('frameworkControlFramework').value;
    if (!frameworkId) return toast('Selecciona un marco');
    
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
    toast('Punto de control añadido');
    event.target.reset();
    await loadAll();
  });
}

function renderFrameworkOptions() {
  console.log('Ejecutando renderFrameworkOptions. Frameworks en state:', state.frameworks.length);
  const selects = [
    document.getElementById('frameworkSelect'),
    document.getElementById('promptFramework'),
    document.getElementById('frameworkControlFramework')
  ];

  selects.forEach((select) => {
    if (!select) {
        console.warn('Select no encontrado en el DOM');
        return;
    }
    console.log('Actualizando select:', select.id);
    select.innerHTML = '<option value="">Seleccione un marco...</option>' + 
      state.frameworks.map(fw => `<option value="${fw.id}">${fw.name} (${fw.version})</option>`).join('');
  });
  
  const connectorEvaluation = document.getElementById('connectorEvaluation');
  if (connectorEvaluation) {
    connectorEvaluation.innerHTML = '<option value="">Seleccione una auditoría...</option>' +
      state.evaluations.map(e => `<option value="${e.id}">${e.name} · ${e.framework_name}</option>`).join('');
  }
  
  const findingEvaluation = document.getElementById('findingEvaluation');
  if (findingEvaluation) {
    findingEvaluation.innerHTML = '<option value="">Selecciona una evaluacion</option>' +
      state.evaluations.map(e => `<option value="${e.id}">${e.name} · ${e.framework_name}</option>`).join('');
  }
}

function renderEvaluations() {
  const container = document.getElementById('evaluationsList');
  if (!container) return;
  if (!state.evaluations.length) {
    container.innerHTML = '<div class="cf-item muted">No hay auditorías activas.</div>';
    return;
  }
  container.innerHTML = state.evaluations.map(e => `
    <div class="cf-item">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h4 style="margin: 0;">${e.name}</h4>
          <span class="muted" style="font-size: 0.8rem;">Marco: ${e.framework_name} · Entidad: ${e.auditee}</span>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px;">
        <div style="font-size: 0.85rem; color: var(--text-secondary);">
          <strong>${e.controls_count}</strong> Controles · <strong>${e.evidences_count}</strong> Evidencias
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-ghost btn-sm text-danger" onclick="window.deleteEvaluation(${e.id})"><i data-lucide="trash-2"></i></button>
          <button class="btn btn-ghost btn-sm" data-edit-evaluation="${e.id}">Editar</button>
          <button class="btn btn-primary btn-sm" data-open-evaluation="${e.id}">Gestionar Auditoría</button>
        </div>
      </div>
    </div>
  `).join('');
}

function renderFindings() {
  const container = document.getElementById('findingsList');
  if (!container) return;
  if (!state.findings.length) {
    container.innerHTML = '<div class="cf-item muted">No se han detectado hallazgos.</div>';
    return;
  }
  container.innerHTML = state.findings.map(f => `
    <div class="cf-item">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <h4 style="margin: 0;">${f.title}</h4>
          <p class="muted" style="font-size: 0.8rem; margin-top: 4px;">Severidad: <span class="badge badge-${badgeClass(f.severity)}">${f.severity}</span></p>
        </div>
        <span class="badge badge-${badgeClass(f.status)}">${f.status}</span>
      </div>
      <p style="font-size: 0.85rem; margin-top: 12px;">${f.description}</p>
    </div>
  `).join('');
}

function renderConnectors() {
  const container = document.getElementById('connectorsList');
  if (!container) return;
  if (!state.connectors.length) {
    container.innerHTML = '<div class="cf-item muted">No hay fuentes de datos configuradas.</div>';
    return;
  }
  const listHtml = state.connectors.map(c => `
    <div class="cf-item">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="margin: 0;">${c.name}</h4>
                <span class="muted" style="font-size: 0.8rem;">${c.connector_type} · ${c.base_path || c.base_url}</span>
                ${c.evaluation_name ? `<br><span class="badge badge-info" style="margin-top: 5px;">Auditoría: ${c.evaluation_name}</span>` : ''}
            </div>
            <div style="display: flex; align-items: center; gap: 12px;">
                <span class="badge badge-success">Activo</span>
                <button class="btn btn-ghost btn-sm text-danger" onclick="window.deleteConnector(${c.id})"><i data-lucide="trash-2"></i></button>
            </div>
        </div>
    </div>
  `).join('');

  if (container) container.innerHTML = listHtml;
  const settingsContainer = document.getElementById('settingsConnectorsList');
  if (settingsContainer) settingsContainer.innerHTML = listHtml;
  if (window.lucide) lucide.createIcons();
}

window.deleteConnector = async (id) => {
  if (!confirm('¿Seguro que quieres eliminar esta fuente de evidencia? Se desvinculará de su auditoría.')) return;
  await api(`/api/connectors/${id}`, { method: 'DELETE' });
  toast('Fuente de evidencia eliminada');
  await loadAll();
};

window.deleteEvaluation = async (id) => {
  if (!confirm('¿Seguro que quieres eliminar esta auditoría? Se perderán todos los avances y evidencias vinculadas.')) return;
  await api(`/api/evaluations/${id}`, { method: 'DELETE' });
  toast('Auditoría eliminada');
  await loadAll();
};

function renderSettings() {
  const providerList = document.getElementById('providersList');
  if (providerList) {
    providerList.innerHTML = state.aiProviders.map(p => `
      <div class="cf-item">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <h4 style="margin: 0;">${p.name}</h4>
                <span class="muted" style="font-size: 0.8rem;">${p.model_name} · ${p.provider_kind}</span>
            </div>
            <button class="btn btn-ghost btn-sm" data-test-provider="${p.id}">Probar</button>
        </div>
      </div>
    `).join('');
  }
}

async function init() {
  console.log('normAIso v1.0 | Initializing UI...');
  bindGlobalEvents();

  // Navegación lateral
  document.querySelectorAll('.cf-nav-item').forEach(item => {
    item.addEventListener('click', () => {
      renderView(item.dataset.view);
    });
  });

  // Lógica de pestañas en Configuración
  document.querySelectorAll('.cf-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.cf-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.dataset.tab;
      ['frameworks', 'connectors-config', 'ia', 'prompts', 'logs'].forEach(id => {
        const el = document.getElementById(`tab-${id}`);
        if (el) el.classList.toggle('hidden', id !== target);
      });
    });
  });

  try {
    await loadAll();
    const versionEl = document.getElementById('providerApiVersion');
    if (versionEl) versionEl.value = '2024-05-01-preview';
    const kindEl = document.getElementById('providerKind');
    if (kindEl) kindEl.value = 'azure_foundry';
    toast('Backend listo para configuracion de Azure Foundry');
  } catch (error) {
    const badge = document.getElementById('connectionBadge');
    if (badge) badge.textContent = 'Error de conexion';
    toast(error.message);
  }
}

window.addEventListener('DOMContentLoaded', init);
