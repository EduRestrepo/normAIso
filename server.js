require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 3000);
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PROD = NODE_ENV === 'production';
const DB_URL = process.env.DATABASE_URL || '';
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;
const UPLOAD_DIR = path.join(ROOT_DIR, 'uploads');
const MAX_FILE_SIZE_MB = Number(process.env.MAX_FILE_SIZE_MB || 20);
const MAX_JSON_SIZE = process.env.MAX_JSON_SIZE || '2mb';
const RATE_LIMIT_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000);
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX || 300);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
const AI_FALLBACK_TO_HEURISTIC = process.env.AI_FALLBACK_TO_HEURISTIC !== 'false';
const APP_ENCRYPTION_KEY = process.env.APP_ENCRYPTION_KEY || '';

if (!DB_URL) {
  throw new Error('DATABASE_URL es obligatorio.');
}

if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  dest: UPLOAD_DIR,
  limits: {
    fileSize: MAX_FILE_SIZE_MB * 1024 * 1024
  }
});

const pool = new Pool({
  connectionString: DB_URL,
  max: Number(process.env.DB_POOL_MAX || 20),
  idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
  connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 10000),
  ssl: IS_PROD && process.env.DB_SSL !== 'false' ? { rejectUnauthorized: false } : undefined
});

app.disable('x-powered-by');
app.set('trust proxy', process.env.TRUST_PROXY === 'true');

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

app.use(cors({
  origin(origin, callback) {
    if (!origin || !ALLOWED_ORIGINS.length || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin no permitido por CORS.'));
  }
}));

app.use(rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo mas tarde.' }
}));

app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
});

app.use(bodyParser.json({ limit: MAX_JSON_SIZE }));
app.use(bodyParser.urlencoded({ extended: true, limit: MAX_JSON_SIZE }));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.static(ROOT_DIR));

const defaultUserId = null;

function encryptionEnabled() {
  return APP_ENCRYPTION_KEY.length > 0;
}

function deriveEncryptionKey() {
  return crypto.createHash('sha256').update(APP_ENCRYPTION_KEY).digest();
}

function encryptSecret(plainText) {
  if (!plainText) return '';
  if (!encryptionEnabled()) {
    throw new Error('APP_ENCRYPTION_KEY es obligatorio para guardar secretos de proveedor.');
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', deriveEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

function decryptSecret(cipherText) {
  if (!cipherText) return '';
  if (!encryptionEnabled()) {
    throw new Error('APP_ENCRYPTION_KEY es obligatorio para leer secretos de proveedor.');
  }
  const payload = Buffer.from(cipherText, 'base64');
  const iv = payload.subarray(0, 12);
  const authTag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveEncryptionKey(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

function sanitizeProvider(provider) {
  return {
    id: provider.id,
    name: provider.name,
    provider_type: provider.provider_type,
    provider_kind: provider.provider_kind,
    model_name: provider.model_name,
    deployment_name: provider.deployment_name,
    endpoint_url: provider.endpoint_url,
    api_version: provider.api_version,
    is_active: provider.is_active,
    secret_hint: provider.secret_hint,
    config_json: provider.config_json,
    created_at: provider.created_at,
    has_secret: Boolean(provider.secret_ciphertext)
  };
}

function normalizeEndpoint(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

async function initDatabase() {
  const schemaPath = path.join(ROOT_DIR, 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schema);
}

async function writeAuditLog(entityType, entityId, action, details = {}, actorName = 'system') {
  await pool.query(
    `
      INSERT INTO audit_logs (entity_type, entity_id, action, actor_name, details_json)
      VALUES ($1, $2, $3, $4, $5::jsonb)
    `,
    [entityType, String(entityId), action, actorName, JSON.stringify(details)]
  );
}

function getEvidenceSnapshot(evidence) {
  return {
    id: evidence.id,
    originType: evidence.origin_type,
    evidenceRole: evidence.evidence_role,
    fileName: evidence.file_name,
    sourceLabel: evidence.source_label,
    connectorName: evidence.connector_name,
    referencePath: evidence.reference_path,
    notes: evidence.notes,
    clarification: evidence.clarification_text,
    uploadedAt: evidence.created_at
  };
}

function buildFindingTitle(control) {
  return `Hallazgo ${control.code}: evidencia insuficiente o validacion pendiente`;
}

function buildHeuristicAssessment(control, evidences) {
  const mainEvidence = evidences.filter((item) => item.evidence_role === 'principal');
  const compensatoryEvidence = evidences.filter((item) => item.evidence_role === 'compensatoria');
  const sourceTypes = [...new Set(evidences.map((item) => item.origin_type))];

  let score = 0;
  if (mainEvidence.length) score += 2;
  if (sourceTypes.length > 1) score += 1;
  if (compensatoryEvidence.length || (control.compensatory_notes || '').trim().length > 40) score += 1;
  if (evidences.some((item) => (item.extracted_text || '').length > 300)) score += 1;
  if ((control.auditor_notes || '').trim().length > 60) score += 1;

  let result = 'evidencia_insuficiente';
  let confidence = 0.24;
  if (score >= 5) {
    result = 'cumple';
    confidence = 0.86;
  } else if (score === 4) {
    result = 'cumple_parcialmente';
    confidence = 0.74;
  } else if (score === 3) {
    result = 'requiere_validacion_humana';
    confidence = 0.61;
  } else if (score === 2) {
    result = 'cumple_parcialmente';
    confidence = 0.53;
  }

  const missingEvidence = [];
  if (!mainEvidence.length) missingEvidence.push('Falta al menos una evidencia principal asociada al control.');
  if (!evidences.some((item) => item.origin_type === 'sharepoint' || item.origin_type === 'upload')) {
    missingEvidence.push('Conviene adjuntar un documento formal o referencia documental verificable.');
  }
  if (!compensatoryEvidence.length && !(control.compensatory_notes || '').trim()) {
    missingEvidence.push('No se registran compensatorios o aclaraciones de soporte.');
  }

  const strengths = [];
  if (mainEvidence.length) strengths.push('Existe evidencia principal vinculada al control.');
  if (sourceTypes.length > 1) strengths.push('La evidencia proviene de mas de una fuente, lo que mejora la trazabilidad.');
  if (compensatoryEvidence.length || (control.compensatory_notes || '').trim()) {
    strengths.push('Se documentaron aclaraciones o compensatorios.');
  }

  return {
    provider_name: process.env.AI_PROVIDER_NAME || 'heuristic-fallback',
    model_name: process.env.AI_MODEL_NAME || 'heuristic-audit-evaluator',
    result,
    confidence,
    summary: evidences.length
      ? `Se analizaron ${evidences.length} evidencias para ${control.code} en ${control.framework_name}.`
      : `No se encontraron evidencias asociadas para ${control.code}.`,
    strengths,
    gaps: missingEvidence,
    missing_evidence: missingEvidence,
    recommendation: missingEvidence.length
      ? 'Solicitar evidencia operativa adicional, validar vigencia documental y revisar si el compensatorio cubre el objetivo del control.'
      : 'Revisar la conclusion sugerida y confirmar la suficiencia antes del cierre humano.',
    evidence_snapshot: evidences.map(getEvidenceSnapshot),
    raw_response: {
      mode: 'heuristic-bootstrap',
      score,
      sourceTypes
    }
  };
}

async function getActiveAIProvider() {
  const result = await pool.query(
    `
      SELECT *
      FROM ai_providers
      WHERE is_active = TRUE
      ORDER BY id DESC
      LIMIT 1
    `
  );
  return result.rows[0] || null;
}

async function invokeAzureFoundry(provider, assessmentInput) {
  const apiKey = decryptSecret(provider.secret_ciphertext);
  if (!apiKey) {
    throw new Error('El proveedor Azure Foundry no tiene API key configurada.');
  }

  const endpoint = normalizeEndpoint(provider.endpoint_url);
  const url = `${endpoint}/chat/completions?api-version=${encodeURIComponent(provider.api_version)}`;
  const prompt = [
    'Eres un auditor interno especializado en cumplimiento normativo.',
    'Debes evaluar si la evidencia aportada es suficiente para el control.',
    'Responde estrictamente en JSON con las claves: result, confidence, summary, strengths, gaps, missing_evidence, recommendation.',
    `Marco: ${assessmentInput.frameworkName}`,
    `Control: ${assessmentInput.controlCode} - ${assessmentInput.controlTitle}`,
    `Descripcion: ${assessmentInput.controlDescription}`,
    `Objetivo: ${assessmentInput.controlObjective}`,
    `Notas del auditor: ${assessmentInput.auditorNotes || 'Sin notas.'}`,
    `Compensatorios: ${assessmentInput.compensatoryNotes || 'Sin compensatorios.'}`,
    `Evidencias: ${assessmentInput.evidenceText || 'Sin evidencia textual disponible.'}`
  ].join('\n');

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    body: JSON.stringify({
      model: provider.deployment_name || provider.model_name,
      temperature: 0,
      messages: [
        { role: 'system', content: 'Devuelve solo JSON valido.' },
        { role: 'user', content: prompt }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure Foundry devolvio ${response.status}: ${text.slice(0, 300)}`);
  }

  const data = await response.json();
  const rawContent = data?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new Error('Azure Foundry no devolvio contenido util.');
  }

  let parsed;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    throw new Error('La respuesta de Azure Foundry no fue JSON valido.');
  }

  return {
    provider_name: provider.name,
    model_name: provider.model_name,
    result: parsed.result || 'requiere_validacion_humana',
    confidence: Number(parsed.confidence || 0.5),
    summary: parsed.summary || 'Sin resumen generado.',
    strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
    gaps: Array.isArray(parsed.gaps) ? parsed.gaps : [],
    missing_evidence: Array.isArray(parsed.missing_evidence) ? parsed.missing_evidence : [],
    recommendation: parsed.recommendation || '',
    raw_response: data
  };
}

async function invokeConfiguredAI(assessmentInput) {
  const provider = await getActiveAIProvider();
  if (!provider) return null;

  if (provider.provider_kind === 'azure_foundry') {
    return invokeAzureFoundry(provider, assessmentInput);
  }

  return null;
}

async function createFindingFromAssessment(evaluationControlId) {
  const controlResult = await pool.query(
    `
      SELECT
        ec.id,
        ec.evaluation_id,
        fc.code,
        fc.title,
        fc.description,
        latest.result AS latest_result,
        latest.summary AS latest_summary,
        latest.recommendation AS latest_recommendation
      FROM evaluation_controls ec
      JOIN framework_controls fc ON fc.id = ec.framework_control_id
      LEFT JOIN ai_assessments latest
        ON latest.evaluation_control_id = ec.id
       AND latest.is_latest = TRUE
      WHERE ec.id = $1
    `,
    [evaluationControlId]
  );

  if (!controlResult.rows.length) {
    throw new Error('Control de evaluacion no encontrado');
  }

  const control = controlResult.rows[0];
  const existing = await pool.query(
    `
      SELECT id
      FROM findings
      WHERE evaluation_control_id = $1
        AND status IN ('abierto', 'en_progreso')
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [evaluationControlId]
  );

  if (existing.rows.length) {
    return existing.rows[0];
  }

  const severity =
    control.latest_result === 'evidencia_insuficiente' ? 'alta' :
    control.latest_result === 'requiere_validacion_humana' ? 'media' :
    'media';

  const result = await pool.query(
    `
      INSERT INTO findings (
        evaluation_id,
        evaluation_control_id,
        title,
        description,
        severity,
        status,
        source_type,
        recommendation,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, 'abierto', 'ia', $6, $7)
      RETURNING *
    `,
    [
      control.evaluation_id,
      evaluationControlId,
      buildFindingTitle(control),
      control.latest_summary || control.description || '',
      severity,
      control.latest_recommendation || '',
      defaultUserId
    ]
  );

  await writeAuditLog('finding', result.rows[0].id, 'create_from_assessment', {
    evaluationControlId,
    result: control.latest_result || 'sin_resultado'
  });

  return result.rows[0];
}

async function persistAssessment(evaluationControlId, payload, evidences) {
  await pool.query('UPDATE ai_assessments SET is_latest = FALSE WHERE evaluation_control_id = $1', [evaluationControlId]);

  const insertResult = await pool.query(
    `
      INSERT INTO ai_assessments (
        evaluation_control_id,
        provider_name,
        model_name,
        result,
        confidence,
        summary,
        strengths,
        gaps,
        missing_evidence,
        recommendation,
        evidence_snapshot,
        raw_response,
        is_latest
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9::jsonb, $10, $11::jsonb, $12::jsonb, TRUE)
      RETURNING *
    `,
    [
      evaluationControlId,
      payload.provider_name,
      payload.model_name,
      payload.result,
      payload.confidence,
      payload.summary,
      JSON.stringify(payload.strengths || []),
      JSON.stringify(payload.gaps || []),
      JSON.stringify(payload.missing_evidence || []),
      payload.recommendation || '',
      JSON.stringify(payload.evidence_snapshot || evidences.map(getEvidenceSnapshot)),
      JSON.stringify(payload.raw_response || {})
    ]
  );

  const statusMap = {
    cumple: 'cumple',
    cumple_parcialmente: 'parcial',
    requiere_validacion_humana: 'revision',
    evidencia_insuficiente: 'pendiente',
    no_cumple: 'no_cumple'
  };

  await pool.query(
    `
      UPDATE evaluation_controls
      SET ai_status = $2,
          ai_confidence = $3,
          updated_at = NOW()
      WHERE id = $1
    `,
    [evaluationControlId, statusMap[payload.result] || 'revision', Number(payload.confidence || 0)]
  );

  if (['evidencia_insuficiente', 'requiere_validacion_humana'].includes(payload.result)) {
    await createFindingFromAssessment(evaluationControlId);
  }

  await writeAuditLog('evaluation_control', evaluationControlId, 'process_assessment', {
    result: payload.result,
    confidence: payload.confidence,
    provider: payload.provider_name
  });

  return insertResult.rows[0];
}

async function computeAssessment(evaluationControlId) {
  const controlResult = await pool.query(
    `
      SELECT
        ec.id,
        ec.evaluation_id,
        ec.status,
        ec.auditor_notes,
        ec.compensatory_notes,
        fc.code,
        fc.title,
        fc.description,
        fc.objective,
        f.name AS framework_name
      FROM evaluation_controls ec
      JOIN framework_controls fc ON fc.id = ec.framework_control_id
      JOIN frameworks f ON f.id = fc.framework_id
      WHERE ec.id = $1
    `,
    [evaluationControlId]
  );

  if (!controlResult.rows.length) {
    throw new Error('Control de evaluacion no encontrado');
  }

  const control = controlResult.rows[0];
  const evidenceResult = await pool.query(
    `
      SELECT
        e.*,
        c.name AS connector_name
      FROM evidences e
      LEFT JOIN connectors c ON c.id = e.connector_id
      WHERE e.evaluation_control_id = $1
      ORDER BY e.created_at DESC
    `,
    [evaluationControlId]
  );

  const evidences = evidenceResult.rows;
  const assessmentInput = {
    frameworkName: control.framework_name,
    controlCode: control.code,
    controlTitle: control.title,
    controlDescription: control.description,
    controlObjective: control.objective,
    auditorNotes: control.auditor_notes,
    compensatoryNotes: control.compensatory_notes,
    evidenceText: evidences.map((item) => `${item.file_name || item.source_label}: ${item.extracted_text || item.notes || ''}`).join('\n')
  };

  let payload;
  try {
    payload = await invokeConfiguredAI(assessmentInput);
  } catch (error) {
    await writeAuditLog('ai_provider', 'active', 'invoke_failed', {
      controlId: evaluationControlId,
      message: error.message
    });
    if (!AI_FALLBACK_TO_HEURISTIC) {
      throw error;
    }
  }

  if (!payload) {
    payload = buildHeuristicAssessment(control, evidences);
  } else {
    payload.evidence_snapshot = evidences.map(getEvidenceSnapshot);
  }

  return persistAssessment(evaluationControlId, payload, evidences);
}

async function getDashboardSummary() {
  const evaluations = await pool.query('SELECT COUNT(*)::int AS count FROM evaluations');
  const controls = await pool.query('SELECT COUNT(*)::int AS count FROM evaluation_controls');
  const evidences = await pool.query('SELECT COUNT(*)::int AS count FROM evidences');
  const findings = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE is_latest AND result = 'cumple')::int AS cumple,
      COUNT(*) FILTER (WHERE is_latest AND result = 'cumple_parcialmente')::int AS parcial,
      COUNT(*) FILTER (WHERE is_latest AND result = 'requiere_validacion_humana')::int AS revision,
      COUNT(*) FILTER (WHERE is_latest AND result = 'evidencia_insuficiente')::int AS insuficiente
    FROM ai_assessments
  `);
  const operational = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('abierto', 'en_progreso'))::int AS open_findings,
      COUNT(*) FILTER (WHERE status = 'cerrado')::int AS closed_findings
    FROM findings
  `);
  const plans = await pool.query(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('abierto', 'en_progreso'))::int AS open_action_plans,
      COUNT(*) FILTER (WHERE target_date IS NOT NULL AND target_date < CURRENT_DATE AND status <> 'cerrado')::int AS overdue_action_plans
    FROM action_plans
  `);
  const byFramework = await pool.query(`
    SELECT
      f.name,
      COUNT(ec.id)::int AS controls,
      COUNT(a.id) FILTER (WHERE a.is_latest)::int AS assessed,
      ROUND(AVG(COALESCE(ec.ai_confidence, 0)) * 100, 1) AS confidence
    FROM frameworks f
    LEFT JOIN framework_controls fc ON fc.framework_id = f.id
    LEFT JOIN evaluation_controls ec ON ec.framework_control_id = fc.id
    LEFT JOIN ai_assessments a ON a.evaluation_control_id = ec.id AND a.is_latest
    GROUP BY f.name
    ORDER BY f.name
  `);

  return {
    metrics: {
      evaluations: evaluations.rows[0].count,
      controls: controls.rows[0].count,
      evidences: evidences.rows[0].count,
      findings: findings.rows[0],
      operational: {
        ...operational.rows[0],
        ...plans.rows[0]
      }
    },
    frameworks: byFramework.rows
  };
}

function buildOpenApiSpec() {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Audit Evidence Copilot API',
      version: '3.3.0'
    },
    servers: [{ url: APP_BASE_URL }],
    paths: {
      '/api/health': { get: { summary: 'Estado base' } },
      '/api/readyz': { get: { summary: 'Readiness' } },
      '/api/openapi.json': { get: { summary: 'Especificacion OpenAPI' } },
      '/api/frameworks': { get: { summary: 'Listar marcos' }, post: { summary: 'Crear marco' } },
      '/api/frameworks/{id}/controls': { get: { summary: 'Listar controles de un marco' }, post: { summary: 'Crear control en un marco' } },
      '/api/evaluations': { get: { summary: 'Listar evaluaciones' }, post: { summary: 'Crear evaluacion' } },
      '/api/evaluations/{id}/controls': { get: { summary: 'Listar controles evaluados' } },
      '/api/evaluation-controls/{id}/process': { post: { summary: 'Procesar control' } },
      '/api/ai-providers': { post: { summary: 'Registrar proveedor IA' } },
      '/api/ai-providers/{id}/test': { post: { summary: 'Probar proveedor IA' } }
    }
  };
}

async function testProviderConnection(provider) {
  if (provider.provider_kind !== 'azure_foundry') {
    return { ok: true, message: 'Proveedor no requiere prueba remota especifica.' };
  }
  const apiKey = decryptSecret(provider.secret_ciphertext);
  const endpoint = normalizeEndpoint(provider.endpoint_url);
  const url = `${endpoint}/info?api-version=${encodeURIComponent(provider.api_version)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'api-key': apiKey }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Azure Foundry devolvio ${response.status}: ${text.slice(0, 250)}`);
  }
  const data = await response.json();
  return { ok: true, message: 'Conexion valida', data };
}

app.get('/api/health', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, requestId: req.requestId, database: 'connected', date: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/readyz', async (req, res, next) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, requestId: req.requestId });
  } catch (error) {
    next(error);
  }
});

app.get('/api/openapi.json', (req, res) => {
  res.json(buildOpenApiSpec());
});

app.get('/api/dashboard', async (req, res, next) => {
  try {
    res.json(await getDashboardSummary());
  } catch (error) {
    next(error);
  }
});

app.get('/api/frameworks', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        f.*,
        COUNT(fc.id)::int AS controls_count
      FROM frameworks f
      LEFT JOIN framework_controls fc ON fc.framework_id = f.id
      GROUP BY f.id
      ORDER BY f.name, f.version
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/frameworks', async (req, res, next) => {
  try {
    const { name, code, version, description } = req.body;
    const result = await pool.query(
      'INSERT INTO frameworks (name, code, version, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, code, version, description]
    );
    await writeAuditLog('framework', result.rows[0].id, 'create', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/frameworks/:id/controls', async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT * FROM framework_controls WHERE framework_id = $1 ORDER BY sort_order, code',
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/frameworks/:id/controls', async (req, res, next) => {
  try {
    const {
      code,
      domain,
      title,
      description = '',
      objective = '',
      guidance = [],
      suggestedEvidence = [],
      sortOrder = 0
    } = req.body;
    const result = await pool.query(
      `
        INSERT INTO framework_controls (
          framework_id, code, domain, title, description, objective, guidance, suggested_evidence, sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9)
        RETURNING *
      `,
      [req.params.id, code, domain, title, description, objective, JSON.stringify(guidance), JSON.stringify(suggestedEvidence), sortOrder]
    );
    await writeAuditLog('framework_control', result.rows[0].id, 'create', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/evaluations', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        e.*,
        f.name AS framework_name,
        COUNT(ec.id)::int AS controls_count,
        COUNT(ev.id)::int AS evidences_count
      FROM evaluations e
      LEFT JOIN frameworks f ON f.id = e.framework_id
      LEFT JOIN evaluation_controls ec ON ec.evaluation_id = e.id
      LEFT JOIN evidences ev ON ev.evaluation_control_id = ec.id
      GROUP BY e.id, f.name
      ORDER BY e.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/evaluations', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { frameworkId, name, auditee, scope, periodLabel, versionLabel, status = 'borrador' } = req.body;
    await client.query('BEGIN');
    const evaluationResult = await client.query(
      `
        INSERT INTO evaluations (
          framework_id, name, auditee, scope, period_label, version_label, status, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [frameworkId, name, auditee, scope, periodLabel, versionLabel, status, defaultUserId]
    );
    const evaluation = evaluationResult.rows[0];
    await client.query(
      `
        INSERT INTO evaluation_controls (evaluation_id, framework_control_id, sort_order)
        SELECT $1, fc.id, fc.sort_order
        FROM framework_controls fc
        WHERE fc.framework_id = $2
      `,
      [evaluation.id, frameworkId]
    );
    await client.query('COMMIT');
    await writeAuditLog('evaluation', evaluation.id, 'create', evaluation);
    res.status(201).json(evaluation);
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

app.get('/api/evaluations/:id/controls', async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT
          ec.*,
          fc.code,
          fc.domain,
          fc.title,
          fc.description,
          fc.objective,
          COUNT(ev.id)::int AS evidence_count,
          latest.result AS latest_result,
          latest.confidence AS latest_confidence,
          latest.summary AS latest_summary,
          latest.strengths AS latest_strengths,
          latest.gaps AS latest_gaps,
          latest.missing_evidence AS latest_missing_evidence,
          latest.recommendation AS latest_recommendation,
          COUNT(fd.id) FILTER (WHERE fd.status IN ('abierto', 'en_progreso'))::int AS active_findings_count
        FROM evaluation_controls ec
        JOIN framework_controls fc ON fc.id = ec.framework_control_id
        LEFT JOIN evidences ev ON ev.evaluation_control_id = ec.id
        LEFT JOIN ai_assessments latest ON latest.evaluation_control_id = ec.id AND latest.is_latest = TRUE
        LEFT JOIN findings fd ON fd.evaluation_control_id = ec.id
        WHERE ec.evaluation_id = $1
        GROUP BY
          ec.id, fc.code, fc.domain, fc.title, fc.description, fc.objective,
          latest.result, latest.confidence, latest.summary, latest.strengths, latest.gaps, latest.missing_evidence, latest.recommendation
        ORDER BY ec.sort_order, fc.code
      `,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/evaluation-controls/:id/evidences', async (req, res, next) => {
  try {
    const result = await pool.query(
      `
        SELECT e.*, c.name AS connector_name
        FROM evidences e
        LEFT JOIN connectors c ON c.id = e.connector_id
        WHERE e.evaluation_control_id = $1
        ORDER BY e.created_at DESC
      `,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/evaluation-controls/:id/notes', async (req, res, next) => {
  try {
    const { auditorNotes, compensatoryNotes, reviewerDecision, reviewerJustification } = req.body;
    const result = await pool.query(
      `
        UPDATE evaluation_controls
        SET auditor_notes = COALESCE($2, auditor_notes),
            compensatory_notes = COALESCE($3, compensatory_notes),
            reviewer_decision = COALESCE($4, reviewer_decision),
            reviewer_justification = COALESCE($5, reviewer_justification),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [req.params.id, auditorNotes, compensatoryNotes, reviewerDecision, reviewerJustification]
    );
    await writeAuditLog('evaluation_control', req.params.id, 'update_notes', { hasCompensatoryNotes: Boolean(compensatoryNotes) });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/evaluation-controls/:id/evidences/upload', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Archivo requerido', requestId: req.requestId });

    const { evidenceRole = 'principal', sourceLabel = 'Carga manual', notes = '', clarificationText = '' } = req.body;
    const result = await pool.query(
      `
        INSERT INTO evidences (
          evaluation_control_id, evidence_role, origin_type, source_label, file_name, stored_path,
          mime_type, file_size, extracted_text, notes, clarification_text, created_by
        )
        VALUES ($1, $2, 'upload', $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `,
      [
        req.params.id,
        evidenceRole,
        sourceLabel,
        req.file.originalname,
        `/uploads/${req.file.filename}`,
        req.file.mimetype,
        req.file.size,
        `Archivo cargado: ${req.file.originalname}. Este prototipo no extrae el contenido binario automaticamente, pero deja la referencia lista para procesamiento posterior.`,
        notes,
        clarificationText,
        defaultUserId
      ]
    );
    await writeAuditLog('evidence', result.rows[0].id, 'upload', { evaluationControlId: req.params.id, fileName: req.file.originalname });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/evaluation-controls/:id/evidences/reference', async (req, res, next) => {
  try {
    const { evidenceRole = 'principal', originType, sourceLabel, fileName, referencePath, externalUrl, connectorId, notes = '', clarificationText = '', extractedText = '' } = req.body;
    const result = await pool.query(
      `
        INSERT INTO evidences (
          evaluation_control_id, evidence_role, origin_type, source_label, file_name, reference_path,
          external_url, connector_id, extracted_text, notes, clarification_text, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `,
      [req.params.id, evidenceRole, originType, sourceLabel, fileName, referencePath, externalUrl, connectorId || null, extractedText, notes, clarificationText, defaultUserId]
    );
    await writeAuditLog('evidence', result.rows[0].id, 'reference', { evaluationControlId: req.params.id, fileName });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/evaluation-controls/:id/process', async (req, res, next) => {
  try {
    res.json(await computeAssessment(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.post('/api/evaluation-controls/:id/create-finding', async (req, res, next) => {
  try {
    res.status(201).json(await createFindingFromAssessment(req.params.id));
  } catch (error) {
    next(error);
  }
});

app.post('/api/evaluations/:id/process', async (req, res, next) => {
  try {
    const controls = await pool.query('SELECT id FROM evaluation_controls WHERE evaluation_id = $1 ORDER BY sort_order, id', [req.params.id]);
    const results = [];
    for (const row of controls.rows) {
      results.push(await computeAssessment(row.id));
    }
    await writeAuditLog('evaluation', req.params.id, 'process_full_evaluation', { processed: results.length });
    res.json({ processed: results.length, results });
  } catch (error) {
    next(error);
  }
});

app.get('/api/findings', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT
        f.*,
        e.name AS evaluation_name,
        fc.code AS control_code,
        fc.title AS control_title,
        COUNT(ap.id)::int AS action_plans_count,
        COALESCE(ROUND(AVG(ap.progress), 0), 0)::int AS average_progress
      FROM findings f
      LEFT JOIN evaluations e ON e.id = f.evaluation_id
      LEFT JOIN evaluation_controls ec ON ec.id = f.evaluation_control_id
      LEFT JOIN framework_controls fc ON fc.id = ec.framework_control_id
      LEFT JOIN action_plans ap ON ap.finding_id = f.id
      GROUP BY f.id, e.name, fc.code, fc.title
      ORDER BY f.created_at DESC
    `);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/findings', async (req, res, next) => {
  try {
    const { evaluationId, evaluationControlId = null, title, description = '', severity = 'media', sourceType = 'manual', recommendation = '', ownerName = '', dueDate = null } = req.body;
    const result = await pool.query(
      `
        INSERT INTO findings (
          evaluation_id, evaluation_control_id, title, description, severity, status,
          source_type, recommendation, owner_name, due_date, created_by
        )
        VALUES ($1, $2, $3, $4, $5, 'abierto', $6, $7, $8, $9, $10)
        RETURNING *
      `,
      [evaluationId, evaluationControlId, title, description, severity, sourceType, recommendation, ownerName, dueDate, defaultUserId]
    );
    await writeAuditLog('finding', result.rows[0].id, 'create_manual', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/findings/:id', async (req, res, next) => {
  try {
    const { status, severity, ownerName, dueDate, recommendation } = req.body;
    const result = await pool.query(
      `
        UPDATE findings
        SET status = COALESCE($2, status),
            severity = COALESCE($3, severity),
            owner_name = COALESCE($4, owner_name),
            due_date = COALESCE($5, due_date),
            recommendation = COALESCE($6, recommendation),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [req.params.id, status, severity, ownerName, dueDate, recommendation]
    );
    await writeAuditLog('finding', req.params.id, 'update', req.body);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/findings/:id/action-plans', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM action_plans WHERE finding_id = $1 ORDER BY created_at DESC', [req.params.id]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/findings/:id/action-plans', async (req, res, next) => {
  try {
    const { title, description = '', ownerName = '', targetDate = null, status = 'abierto', progress = 0 } = req.body;
    const result = await pool.query(
      `
        INSERT INTO action_plans (
          finding_id, title, description, owner_name, target_date, status, progress, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [req.params.id, title, description, ownerName, targetDate, status, progress, defaultUserId]
    );
    await writeAuditLog('action_plan', result.rows[0].id, 'create', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.patch('/api/action-plans/:id', async (req, res, next) => {
  try {
    const { status, progress, ownerName, targetDate } = req.body;
    const result = await pool.query(
      `
        UPDATE action_plans
        SET status = COALESCE($2, status),
            progress = COALESCE($3, progress),
            owner_name = COALESCE($4, owner_name),
            target_date = COALESCE($5, target_date),
            updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `,
      [req.params.id, status, progress, ownerName, targetDate]
    );
    await writeAuditLog('action_plan', req.params.id, 'update', req.body);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/audit-logs', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.get('/api/connectors', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM connectors ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

app.post('/api/connectors', async (req, res, next) => {
  try {
    const { name, connectorType, basePath, baseUrl, credentialsHint, config = {} } = req.body;
    const result = await pool.query(
      `
        INSERT INTO connectors (
          name, connector_type, base_path, base_url, credentials_hint, config_json, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        RETURNING *
      `,
      [name, connectorType, basePath, baseUrl, credentialsHint, JSON.stringify(config), defaultUserId]
    );
    await writeAuditLog('connector', result.rows[0].id, 'create', result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.get('/api/settings', async (req, res, next) => {
  try {
    const settings = await pool.query('SELECT category, key, value_json FROM settings ORDER BY category, key');
    const users = await pool.query('SELECT id, full_name, email, role FROM users ORDER BY id');
    const providerRows = await pool.query('SELECT * FROM ai_providers ORDER BY id DESC');
    res.json({
      settings: settings.rows,
      users: users.rows,
      aiProviders: providerRows.rows.map(sanitizeProvider)
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai-providers', async (req, res, next) => {
  try {
    const {
      name,
      providerType,
      providerKind = 'custom',
      modelName,
      deploymentName = '',
      endpointUrl = '',
      apiVersion = '',
      isActive = true,
      secret = '',
      secretHint = '',
      config = {}
    } = req.body;

    const result = await pool.query(
      `
        INSERT INTO ai_providers (
          name, provider_type, provider_kind, model_name, deployment_name, endpoint_url,
          api_version, is_active, secret_ciphertext, secret_hint, config_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        RETURNING *
      `,
      [
        name,
        providerType,
        providerKind,
        modelName,
        deploymentName,
        normalizeEndpoint(endpointUrl),
        apiVersion,
        isActive,
        secret ? encryptSecret(secret) : '',
        secretHint,
        JSON.stringify(config)
      ]
    );

    await writeAuditLog('ai_provider', result.rows[0].id, 'create', sanitizeProvider(result.rows[0]));
    res.status(201).json(sanitizeProvider(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.patch('/api/ai-providers/:id', async (req, res, next) => {
  try {
    const current = await pool.query('SELECT * FROM ai_providers WHERE id = $1', [req.params.id]);
    if (!current.rows.length) {
      return res.status(404).json({ error: 'Proveedor no encontrado', requestId: req.requestId });
    }

    const source = current.rows[0];
    const {
      name = source.name,
      providerType = source.provider_type,
      providerKind = source.provider_kind,
      modelName = source.model_name,
      deploymentName = source.deployment_name,
      endpointUrl = source.endpoint_url,
      apiVersion = source.api_version,
      isActive = source.is_active,
      secret = '',
      secretHint = source.secret_hint,
      config = source.config_json
    } = req.body;

    const result = await pool.query(
      `
        UPDATE ai_providers
        SET name = $2,
            provider_type = $3,
            provider_kind = $4,
            model_name = $5,
            deployment_name = $6,
            endpoint_url = $7,
            api_version = $8,
            is_active = $9,
            secret_ciphertext = $10,
            secret_hint = $11,
            config_json = $12::jsonb
        WHERE id = $1
        RETURNING *
      `,
      [
        req.params.id,
        name,
        providerType,
        providerKind,
        modelName,
        deploymentName,
        normalizeEndpoint(endpointUrl),
        apiVersion,
        isActive,
        secret ? encryptSecret(secret) : source.secret_ciphertext,
        secretHint,
        JSON.stringify(config)
      ]
    );

    await writeAuditLog('ai_provider', req.params.id, 'update', sanitizeProvider(result.rows[0]));
    res.json(sanitizeProvider(result.rows[0]));
  } catch (error) {
    next(error);
  }
});

app.post('/api/ai-providers/:id/test', async (req, res, next) => {
  try {
    const providerResult = await pool.query('SELECT * FROM ai_providers WHERE id = $1', [req.params.id]);
    if (!providerResult.rows.length) {
      return res.status(404).json({ error: 'Proveedor no encontrado', requestId: req.requestId });
    }
    const provider = providerResult.rows[0];
    const testResult = await testProviderConnection(provider);
    await writeAuditLog('ai_provider', req.params.id, 'test_connection', { ok: true });
    res.json(testResult);
  } catch (error) {
    next(error);
  }
});

app.post('/api/settings/prompt', async (req, res, next) => {
  try {
    const { frameworkCode, promptText } = req.body;
    const result = await pool.query(
      `
        INSERT INTO settings (category, key, value_json)
        VALUES ('prompt', $1, $2::jsonb)
        ON CONFLICT (category, key)
        DO UPDATE SET value_json = EXCLUDED.value_json, updated_at = NOW()
        RETURNING *
      `,
      [frameworkCode, JSON.stringify({ promptText })]
    );
    await writeAuditLog('setting', frameworkCode, 'upsert_prompt', { promptTextLength: promptText.length });
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint no encontrado', requestId: req.requestId });
  }
  return next();
});

app.use((req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  console.error(`[${req.requestId}]`, error);
  res.status(status).json({
    error: status >= 500 ? 'Error interno del servidor' : error.message,
    detail: IS_PROD ? undefined : error.message,
    requestId: req.requestId
  });
});

initDatabase()
  .then(async () => {
    await pool.query('SELECT 1');
    app.listen(PORT, () => {
      console.log(`Audit Evidence Copilot running at ${APP_BASE_URL}`);
    });
  })
  .catch((error) => {
    console.error('Error inicializando la base de datos:', error);
    process.exit(1);
  });
