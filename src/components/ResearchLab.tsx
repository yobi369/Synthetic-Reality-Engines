import React, { useEffect, useRef, useState } from 'react';
import type { BatchExperimentReport } from '../../research/batch-runner';
import type { WorldPresetId } from '../types/simulation';

type WorkerReply = { ok: true; report: BatchExperimentReport } | { ok: false; error: string };

const metrics: Array<{ key: keyof BatchExperimentReport['aggregate']; label: string; unit: string }> = [
  { key: 'population', label: 'Final population', unit: 'agents' },
  { key: 'totalWealth', label: 'Total agent wealth', unit: 'credits' },
  { key: 'averageHealth', label: 'Average health', unit: 'points' },
  { key: 'resourceAbundance', label: 'Resource abundance', unit: 'units' },
  { key: 'ticksPerSecond', label: 'Throughput', unit: 'ticks/s' },
];

export function ResearchLab() {
  const [preset, setPreset] = useState<WorldPresetId>('civilization');
  const [seedsText, setSeedsText] = useState('11, 22, 33, 44, 55');
  const [ticksText, setTicksText] = useState('1000');
  const [report, setReport] = useState<BatchExperimentReport | null>(null);
  const [status, setStatus] = useState('Configure a repeatable batch and run it off the main UI thread.');
  const [busy, setBusy] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  function runBatch() {
    const seeds = seedsText.split(',').map(value => Number(value.trim()));
    const ticks = Number(ticksText);
    if (seeds.length < 2 || seeds.length > 100 || seeds.some(seed => !Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) || new Set(seeds).size !== seeds.length) {
      setStatus('Enter 2–100 unique unsigned 32-bit seeds, separated by commas.'); return;
    }
    if (!Number.isSafeInteger(ticks) || ticks < 1 || ticks > 100_000) {
      setStatus('Tick horizon must be between 1 and 100,000.'); return;
    }
    workerRef.current?.terminate();
    setReport(null); setBusy(true); setStatus('Running independent seeded simulations…');
    const worker = new Worker(new URL('../../research/batch-worker.ts', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerReply>) => {
      worker.terminate(); workerRef.current = null; setBusy(false);
      if (event.data.ok) { setReport(event.data.report); setStatus('Completed ' + event.data.report.runs.length + ' runs at ' + event.data.report.requestedTicks.toLocaleString() + ' requested ticks each.'); }
      else setStatus(event.data.error);
    };
    worker.onerror = () => { worker.terminate(); workerRef.current = null; setBusy(false); setStatus('Batch worker failed. Check the browser console for details.'); };
    worker.postMessage({ preset, seeds, ticks });
  }

  function cancelBatch() {
    workerRef.current?.terminate(); workerRef.current = null; setBusy(false); setStatus('Batch cancelled.');
  }

  function downloadReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'sre-batch-' + report.preset + '-' + report.requestedTicks + '-ticks.json'; link.click(); URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-400">Research workspace</div>
          <h2 className="mt-1 text-xl font-bold text-white">Multi-seed experiment laboratory</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-400">Run independent simulations with controlled seeds, summarize outcome distributions and export a reproducible report. Runs execute in a Web Worker so the main interface remains responsive.</p>
        </div>
        <span className="rounded-full border border-sky-500/30 bg-sky-950/40 px-3 py-1 text-xs text-sky-300">Research / experimental</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-medium text-slate-400">World preset
          <select value={preset} onChange={event => setPreset(event.target.value as WorldPresetId)} disabled={busy} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white">
            <option value="civilization">Civilization</option><option value="wasteland">Wasteland</option><option value="galactic">Galactic</option><option value="microbial">Microbial</option><option value="sandbox">Sandbox</option>
          </select>
        </label>
        <label className="text-xs font-medium text-slate-400">Random seeds (comma-separated)
          <input value={seedsText} onChange={event => setSeedsText(event.target.value)} disabled={busy} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-white" />
        </label>
        <label className="text-xs font-medium text-slate-400">Ticks per run
          <input type="number" min="1" max="100000" value={ticksText} onChange={event => setTicksText(event.target.value)} disabled={busy} className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 font-mono text-sm text-white" />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button onClick={runBatch} disabled={busy} className="rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-500 disabled:opacity-50">Run batch experiment</button>
        {busy && <button onClick={cancelBatch} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300">Cancel</button>}
        {report && <button onClick={downloadReport} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-200">Export JSON report</button>}
        <p role="status" className="text-xs text-slate-400">{status}</p>
      </div>

      {report && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {metrics.map(metric => {
              const value = report.aggregate[metric.key];
              return <div key={metric.key} className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                <div className="text-xs text-slate-400">{metric.label}</div>
                <div className="mt-1 text-xl font-semibold tabular-nums text-white">{value.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                <div className="mt-1 text-[11px] text-slate-500">95% CI: {value.confidence95.lower.toLocaleString(undefined, { maximumFractionDigits: 2 })} – {value.confidence95.upper.toLocaleString(undefined, { maximumFractionDigits: 2 })} {metric.unit}</div>
                <div className="mt-1 text-[11px] text-slate-500">Sample SD: {value.sampleStandardDeviation.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
              </div>;
            })}
          </div>
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="bg-slate-900 text-slate-400"><tr><th className="px-3 py-2">Seed</th><th className="px-3 py-2">Ticks</th><th className="px-3 py-2">Population</th><th className="px-3 py-2">Wealth</th><th className="px-3 py-2">Avg. health</th><th className="px-3 py-2">Ticks/sec</th></tr></thead>
              <tbody>{report.runs.map(run => <tr key={run.seed} className="border-t border-slate-800 text-slate-200"><td className="px-3 py-2 font-mono">{run.seed}</td><td className="px-3 py-2 tabular-nums">{run.ticks.toLocaleString()}</td><td className="px-3 py-2 tabular-nums">{run.population.toLocaleString()}</td><td className="px-3 py-2 tabular-nums">{run.totalWealth.toFixed(1)}</td><td className="px-3 py-2 tabular-nums">{run.averageHealth.toFixed(1)}</td><td className="px-3 py-2 tabular-nums">{run.ticksPerSecond.toFixed(1)}</td></tr>)}</tbody>
            </table>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">Intervals summarize variation across the selected seeds; they are not proof of empirical validity or predictive accuracy. Throughput depends on the machine and runtime executing the batch. Report generated {new Date(report.createdAt).toLocaleString()}.</p>
        </>
      )}
    </section>
  );
}
