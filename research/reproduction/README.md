# LTEE independent reproduction package

This folder contains a separately implemented Python reference replay for the LTEE mechanistic experiment.

## Reproduce the repository's selected-fit results

From the repository root:

~~~bash
bun run research:ltee-mechanistic > /tmp/ltee-mechanistic-report.json
python3 research/reproduction/verify_ltee_reference.py /tmp/ltee-mechanistic-report.json
~~~

The Python program uses only the Python standard library. It independently:

1. Reads the pinned raw CSV and checks its SHA-256 against the report.
2. Reconstructs the evolved and ancestral marker counts from the Ara marker columns.
3. Recomputes the original LTEE relative-growth statistic from colony counts and plate-dilution factors.
4. Reimplements the serial-transfer fitness-class simulator and ancestor competition assay.
5. Replays each selected parameter set for all six calibration populations.
6. Recomputes calibration RMSE, untouched temporal-holdout RMSE/MAE and population-cluster bootstrap intervals.
7. Fails if any result differs from the TypeScript run by more than the declared numeric tolerance.

This is an independent cross-language computational replay of the selected fits. It does **not** independently repeat the 100-point parameter grid search, independently choose the selected parameters, or replace an external scientific review. The TypeScript workflow remains the authoritative calibration and sensitivity-analysis implementation.

## Data and cohort

- Dataset: Wiser, Ribeck & Lenski (2014), Dryad DOI [10.5061/dryad.0hc2m](https://doi.org/10.5061/dryad.0hc2m)
- Pinned CSV: `research/data/ltee_fitness.csv`
- Analysis cohort: six complete non-mutator populations (Ara - 5, Ara - 6, Ara + 1, Ara + 2, Ara + 4, Ara + 5)
- Holdout: latest 20% of each population's observed generation range; no holdout observations enter parameter selection.

## External independent replication still required

An external microbial-evolution researcher should independently verify the source-data interpretation, repeat the parameter search in a separate codebase, and report any discrepancies. The Python replay is a reproducibility safeguard, not evidence that an independent scientist has reviewed or endorsed the model.
