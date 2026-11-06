import { randomUUID } from 'node:crypto';

const baseUrl = (process.env.SRE_ACCEPTANCE_BASE_URL || '').replace(/\/$/, '');
const email = process.env.SRE_ACCEPTANCE_EMAIL || '';
const password = process.env.SRE_ACCEPTANCE_PASSWORD || '';
const secondEmail = process.env.SRE_ACCEPTANCE_SECOND_EMAIL || '';
const secondPassword = process.env.SRE_ACCEPTANCE_SECOND_PASSWORD || '';

if (!baseUrl || !email || !password) {
  throw new Error('Set SRE_ACCEPTANCE_BASE_URL, SRE_ACCEPTANCE_EMAIL and SRE_ACCEPTANCE_PASSWORD.');
}

async function api<T = any>(path: string, init: RequestInit = {}, token?: string): Promise<{ response: Response; data: T }> {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const raw = response.status === 204 ? '' : await response.text();
  let data: any = null;
  if (raw) { try { data = JSON.parse(raw); } catch { data = raw; } }
  return { response, data };
}
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const health = await api('/api/health');
assert(health.response.ok && health.data?.status === 'ok', 'Hosted health check failed.');
assert(health.data?.storageBackend === 'postgresql', 'Hosted server is not using the shared PostgreSQL backend.');

const login = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
assert(login.response.ok && typeof login.data?.token === 'string', 'Acceptance account login failed.');
const token = login.data.token as string;
const runId = `hosted-acceptance-${randomUUID()}`;
let secondToken = '';
try {
  const saved = await api('/api/runs', {
    method: 'POST',
    body: JSON.stringify({
      id: runId, name: 'Hosted storage acceptance', preset: 'civilization',
      seed: 37, tick: 0, snapshot: { tick: 0, acceptance: true },
    }),
  }, token);
  assert(saved.response.ok && saved.data?.run?.id === runId, 'Could not create an acceptance run.');

  const fetched = await api(`/api/runs/${encodeURIComponent(runId)}`, {}, token);
  assert(fetched.response.ok && fetched.data?.run?.snapshot?.acceptance === true, 'Saved run snapshot did not round-trip.');

  const event = await api(`/api/runs/${encodeURIComponent(runId)}/interventions`, {
    method: 'POST',
    body: JSON.stringify({
      id: 'acceptance-event', tick: 1, epoch: 1,
      action: 'acceptance.probe', parameters: { source: 'hosted-acceptance' },
      recordedAt: new Date().toISOString(),
    }),
  }, token);
  assert(event.response.ok, 'Could not persist an intervention event.');
  const events = await api(`/api/runs/${encodeURIComponent(runId)}/interventions`, {}, token);
  assert(events.response.ok && events.data?.interventions?.some((item: any) => item.id === 'acceptance-event'), 'Intervention event did not round-trip.');

  if (secondEmail && secondPassword) {
    const otherLogin = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: secondEmail, password: secondPassword }) });
    assert(otherLogin.response.ok && typeof otherLogin.data?.token === 'string', 'Second acceptance account login failed.');
    secondToken = otherLogin.data.token;
    const isolated = await api(`/api/runs/${encodeURIComponent(runId)}`, {}, secondToken);
    assert(isolated.response.status === 404, 'Cross-account run isolation check failed.');
  }

  console.log('Hosted PostgreSQL acceptance passed: health, backend selection, authenticated run CRUD, snapshot persistence, intervention persistence' + (secondToken ? ', and cross-account isolation.' : '.'));
} finally {
  await api(`/api/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' }, token).catch(() => undefined);
  await api('/api/auth/logout', { method: 'POST' }, token).catch(() => undefined);
  if (secondToken) await api('/api/auth/logout', { method: 'POST' }, secondToken).catch(() => undefined);
}
