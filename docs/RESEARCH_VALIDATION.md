# Research validation and benchmark protocol

## Scope and claims

These checks establish computational properties of the implementation. They do **not** establish that the model represents real societies, ecosystems, economies, evolution, or physical processes. Empirical validity requires a defined target domain, independently sourced observations, pre-registered hypotheses, and comparison against credible reference models.

## Reproducibility contract

Every reported experiment should retain:
- repository commit and engine version;
- preset and complete configuration;
- seed and ordered intervention ledger;
- tick horizon and simulation speed/operation sequence;
- exported run snapshot and analysis script version;
- hardware/runtime details when performance is reported.

A seed alone is insufficient if interventions, configuration edits, or call ordering differ.

## Automated computational baselines

The test suite checks:
1. identical trajectories for the same preset, seed and step sequence;
2. finite agent state and non-negative bounded resources over short horizons;
3. bounded population against the configured maximum;
4. distinguishable initial conditions for different seeds;
5. ordered intervention records embedded in snapshots;
6. all built-in presets under the same reproducibility protocol.

These are regression tests, not proof of scientific validity. Their time horizons are deliberately small and should be extended in scheduled benchmark jobs.

## Required empirical validation before scientific claims

1. Select one narrow domain and state a falsifiable hypothesis.
2. Identify a public, licensed, versioned reference dataset and its provenance.
3. Freeze a training/calibration split and an untouched evaluation split.
4. Define baseline models and metrics before inspecting evaluation results.
5. Estimate parameter uncertainty and sensitivity; report confidence intervals and effect sizes.
6. Run repeated seeds and report distributions, not only best runs.
7. Perform ablations and stress tests; document failed hypotheses.
8. Have an independent reviewer reproduce the analysis from exported artifacts.

## Benchmark report template

For each preset and commit, report runtime, ticks/second, peak memory, population trajectory, resource totals, event counts, seed, and environment. Compare changes using identical seeds and operation sequences. Never compare a different seed or altered intervention schedule as though it were a controlled performance comparison.

## Known limitations

The engine currently has no independently validated empirical dataset mapping, calibration procedure, uncertainty model, or domain-specific acceptance thresholds. Consequently the repository may report deterministic computational behavior and measured software performance, but must not claim predictive accuracy or validated scientific simulation.
