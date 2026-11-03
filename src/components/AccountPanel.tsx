import React, { useState } from 'react';

type SavedRun = {
  id: string; name: string; preset: string; seed: number; tick: number;
  snapshot: unknown; createdAt?: string; updatedAt?: string;
};

type Props = {
  currentRun: SavedRun;
  onRestore: (run: SavedRun) => void;
};

export function AccountPanel({ currentRun, onRestore }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [runs, setRuns] = useState<SavedRun[]>([]);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function request(path: string, options: RequestInit = {}) {
    const response = await fetch(path, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}), ...options.headers }
    });
    const data = response.status === 204 ? null : await response.json();
    if (!response.ok) throw new Error(data?.error || 'Request failed.');
    return data;
  }

  async function authenticate(mode: 'login' | 'register') {
    setBusy(true); setMessage('');
    try {
      const data = await request('/api/auth/' + mode, { method: 'POST', body: JSON.stringify({ email, password }) });
      setToken(data.token); setUserEmail(data.user.email); setPassword('');
      setMessage('Signed in. Your saved runs are private to this account.');
      const list = await fetch('/api/runs', { headers: { Authorization: 'Bearer ' + data.token } });
      const result = await list.json();
      if (!list.ok) throw new Error(result?.error || 'Could not load saved runs.');
      setRuns(result.runs || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Authentication failed.'); }
    finally { setBusy(false); }
  }

  async function saveCurrent() {
    setBusy(true); setMessage('');
    try {
      await request('/api/runs', { method: 'POST', body: JSON.stringify(currentRun) });
      const events = ((currentRun.snapshot as any)?.interventions || []) as Array<any>;
      for (const event of events) {
        await request('/api/runs/' + encodeURIComponent(currentRun.id) + '/interventions', {
          method: 'POST', body: JSON.stringify({ id: event.id, tick: event.tick, epoch: event.epoch, action: event.action, parameters: event.parameters, recordedAt: event.recordedAt })
        });
      }
      const data = await request('/api/runs');
      setRuns(data.runs || []); setMessage('Run saved to your server-side account.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed.'); }
    finally { setBusy(false); }
  }

  async function loadRun(id: string) {
    setBusy(true); setMessage('');
    try {
      const data = await request('/api/runs/' + encodeURIComponent(id));
      onRestore(data.run); setMessage('Saved run restored.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Restore failed.'); }
    finally { setBusy(false); }
  }

  async function logout() {
    try { await request('/api/auth/logout', { method: 'POST' }); } catch { /* local sign-out still clears the token */ }
    setToken(''); setUserEmail(''); setRuns([]); setMessage('Signed out.');
  }

  return (
    <section className="mx-4 mt-3 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-slate-100">Research account & cloud runs</div>
          <div className="text-xs text-slate-400">Private server-side run storage · HTTPS recommended</div>
        </div>
        {token && <div className="flex items-center gap-2"><span className="text-xs text-emerald-300">{userEmail}</span><button onClick={logout} className="rounded border border-slate-700 px-2 py-1 text-xs">Sign out</button></div>}
      </div>
      {!token ? (
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="min-w-48 flex-1 text-xs text-slate-400">Email<input type="email" value={email} onChange={e => setEmail(e.target.value)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white" autoComplete="email" /></label>
          <label className="min-w-48 flex-1 text-xs text-slate-400">Password (12+ characters)<input type="password" value={password} onChange={e => setPassword(e.target.value)} className="mt-1 w-full rounded border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-white" autoComplete="current-password" /></label>
          <button disabled={busy} onClick={() => authenticate('login')} className="rounded bg-sky-600 px-3 py-2 text-sm font-semibold disabled:opacity-50">Sign in</button>
          <button disabled={busy} onClick={() => authenticate('register')} className="rounded border border-slate-600 px-3 py-2 text-sm disabled:opacity-50">Create account</button>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button disabled={busy} onClick={saveCurrent} className="rounded bg-emerald-700 px-3 py-2 text-sm font-semibold disabled:opacity-50">Save current run to server</button>
          <span className="text-xs text-slate-400">{runs.length} saved runs</span>
          {runs.map(run => <button key={run.id} disabled={busy} onClick={() => loadRun(run.id)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">{run.name} · {run.preset} · tick {run.tick}</button>)}
        </div>
      )}
      {message && <p role="status" className="mt-2 text-xs text-slate-300">{message}</p>}
    </section>
  );
}
