import { runBatchExperiments } from './batch-runner';
import type { WorldPresetId } from '../src/types/simulation';

type BatchRequest = { preset: WorldPresetId; seeds: number[]; ticks: number };
const workerScope = self as unknown as {
  onmessage: ((event: MessageEvent<BatchRequest>) => void) | null;
  postMessage: (message: unknown) => void;
};

workerScope.onmessage = event => {
  try {
    const report = runBatchExperiments(event.data);
    workerScope.postMessage({ ok: true, report });
  } catch (error) {
    workerScope.postMessage({ ok: false, error: error instanceof Error ? error.message : 'Batch experiment failed.' });
  }
};
