# Empirical validation: first microbial reference study

## Decision and scope

The first empirical reference is the *Escherichia coli* Long-Term Evolution Experiment (LTEE), using the competition-assay fitness trajectories published by Wiser, Ribeck and Lenski. The public dataset contains 928 competition records across 12 independently evolving populations; six records have missing fitness values and are excluded from quantitative fitting. The checked-in CSV is a reproducible, CC0 reference-data copy sourced from the public Dryad record and the authors' linked data mirror.

- Dataset DOI: https://doi.org/10.5061/dryad.0hc2m
- Canonical dataset record: https://datadryad.org/dataset/doi:10.5061/dryad.0hc2m
- Public CSV mirror: https://github.com/benjaminhgood/LTEE-metagenomic/blob/master/additional_data/Concatenated.LTEE.data.all.csv
- Primary study: Wiser, M. J., Ribeck, N. & Lenski, R. E. (2013), *Long-Term Dynamics of Adaptation in Asexual Populations*, Science 342(6164), 1364–1367. https://doi.org/10.1126/science.1243357
- Dataset citation: Wiser, M. J., Ribeck, N. & Lenski, R. E. (2014). Data from: Long-term dynamics of adaptation in asexual populations. Dryad. https://doi.org/10.5061/dryad.0hc2m
- Reuse: the dataset is indexed as CC0. Preserve the citation and source links when redistributing the data.

## What the observations measure

The dataset records relative fitness from competition assays between evolved *E. coli* populations and an oppositely marked ancestral strain. It is not a direct time series of absolute population abundance, nutrient concentration, mutation rate, or an organism-by-organism phenotype. The Fitness column is the reported relative-fitness measurement; rows are repeated competition replicates associated with a population and generation.

This distinction matters. The existing interactive microbial preset remains explicitly **UNVALIDATED**: it is a spatial, agent-based ecosystem with abstract energy/metabolism, food resources, mutation, predation and reproduction. It does not implement the LTEE protocol and is not calibrated to this dataset. A separate LTEE-specific population-genetics subsystem now exists under `src/research/ltee/`; it must not be conflated with the interactive preset or the whole SimulationEngine.

## LTEE-specific mechanistic subsystem

Run the forward-time model, calibration and untouched holdout evaluation with:

~~~bash
bun run research:ltee-mechanistic
~~~

The implementation is in `src/research/ltee/engine.ts` and `scripts/ltee-mechanistic-validation.ts`. It uses the six complete non-mutator populations (Ara - 5, Ara - 6, Ara + 1, Ara + 2, Ara + 4 and Ara + 5). Mutator populations are excluded because the first model assumes a shared constant beneficial-mutation process; Ara - 3 is also a special citrate-using lineage and is not included in this narrow glucose-limited model.

The forward model stores heritable fitness classes, applies selection during each batch-growth interval, introduces beneficial mutations at the end of the growth phase with a background-dependent exponential distribution of effects, and applies a Poissonized fixed-size bottleneck to approximate the daily 1:100 transfer. The forward simulation uses an aggregate fitness-class representation and a Poissonized fixed-size bottleneck of 5,000,000 cells, matching the scale used in published LTEE population-genetic simulations. It does not enumerate individual cells; lineages are aggregated into a capped set of fitness classes, and the Poisson sampling is an approximation to multinomial sampling.

Each archived population sample is then mixed computationally against its marked ancestor using the observed initial competitor counts and ancestor log-fold-change. The assay derives the same per-generation logit statistic as the published LTEE W statistic, plus alternative per-cycle and log-encoded measures. Calibration uses only the earliest 80% of each selected population's time series; the later 20% is evaluated after parameter selection.

The initial 27-point grid exposed a boundary optimum for diminishing returns. It was expanded using calibration-only profile information to 100 combinations of beneficial mutation rate, mean beneficial effect and diminishing-returns coefficient. The expanded mutation-rate grid is scaled to the 5,000,000-cell bottleneck. Each encoding is fitted independently on equal-weighted population-specific calibration RMSE. The workflow reports holdout errors, population-cluster bootstrap intervals, parameter-selection stability, profile-sensitivity curves, and same-cohort power-law/saturating/constant curve comparators. The grid is deliberately small and should be expanded only through calibration-only preregistered refinement—not by tuning on the holdout.

**Model limitations:** this is a minimal asexual, beneficial-mutation-only, diminishing-returns model. It does not explicitly represent citrate innovation, cross-feeding, evolved mutator status, deleterious mutations, exact census-size demography, resource depletion/lag physiology, or the complete genotype-level DFE. The non-mutator subset reduces—but does not eliminate—these limitations. Passing software tests or outperforming a baseline does not establish predictive validity.

## Reproducible analysis

Run:

~~~bash
bun run research:ltee
~~~

The implementation is in scripts/empirical-ltee-validation.ts; the pinned source data is research/data/ltee_fitness.csv.

Protocol:

1. Parse the published competition records and exclude rows with missing/non-finite fitness.
2. Average replicate competition measurements within each population-generation pair; populations remain separate clusters.
3. For each population independently, place its earliest 80% of its observed generation range in calibration and its latest 20% in the untouched temporal holdout. The split is performed before model fitting.
4. Fit three prespecified curve families to calibration data only:
   - constant ancestral baseline: F(g)=1;
   - power law: F(g)=1+a g^b, with a>=0 and b selected on a fixed grid;
   - saturating curve: F(g)=1+a g/(1+cg), with a,c>=0 and c selected on a fixed grid.
5. Select the candidate with lowest calibration RMSE. Report calibration RMSE, temporal-holdout RMSE and MAE for every candidate, not just the selected curve.
6. Estimate 95% intervals for holdout RMSE by 1,000 deterministic cluster-bootstrap resamples of populations. This preserves within-population temporal dependence better than resampling individual rows.
7. Separately bootstrap the calibration populations 250 times, refitting all candidate families on each resample. Report model-selection frequencies and conditional parameter intervals; these intervals are conditional on each curve family and do not represent uncertainty over all possible model structures.
8. Report per-population holdout errors so a good pooled score cannot conceal a failed replicate population.

The script prints machine-readable JSON including source citation, row counts, cutoffs, selected parameters, all candidate metrics, bootstrap intervals and per-population errors. Its bootstrap interval quantifies variation across the 12 population clusters for the fitted curves; it is not a full parameter uncertainty interval and does not correct for every source of experimental measurement error.


## First benchmark execution

The benchmark command was added to CI and completed successfully on commit `fe0a5b029d5f766ca8af05a5a22abe158f3856e7` (typecheck, tests, empirical benchmark and production build all passed). The pinned dataset file's Git blob SHA is `919b048da2a461a267f58050078f6083b8fc88bc`.

The initial run produced the following metrics. RMSE and MAE are in relative-fitness units.

| Candidate | Calibration RMSE | Holdout RMSE | Holdout MAE | Population-cluster bootstrap 95% interval for holdout RMSE |
|---|---:|---:|---:|---:|
| Constant baseline | 0.481220 | 0.661943 | 0.642050 | [0.591305, 0.728614] |
| Power law | **0.102984** | 0.155534 | 0.127620 | [0.128091, 0.186032] |
| Saturating | 0.107625 | **0.149893** | **0.111413** | [0.109036, 0.190535] |

Calibration selects the power-law candidate, but the saturating curve has a slightly lower temporal holdout RMSE (difference 0.005641) and MAE. The two population-cluster bootstrap intervals overlap substantially. This run therefore does not establish a clear predictive winner between the two non-constant curves. It does show that both adaptation curves outperform the constant ancestral baseline on this split, while the small holdout difference between power-law and saturating fits is uncertain.


### Calibration-cluster bootstrap

A 250-resample calibration bootstrap (seed 20261104), refitting every candidate curve on each resampled set of population clusters, selected the power-law family in 250/250 resamples (100%); the constant and saturating families were selected in 0/250 resamples. Conditional 95% parameter intervals were:

- Power-law exponent (b): [0.29, 0.36]; amplitude (a): [0.01661, 0.03203].
- Saturating parameter (c): [0.000188, 0.000317]; amplitude (a): [0.0001398, 0.0002046].

This indicates that the power-law family is stable under the chosen calibration-cluster resampling procedure. It does not resolve the small holdout advantage for the saturating curve: model-selection frequency measures calibration stability, while the temporal holdout is the separate test of later-generation generalization. The bootstrap intervals are conditional on the specified family and fixed candidate grids.

Per-population holdout RMSE for the calibration-selected power-law curve:

| LTEE population | Holdout points | RMSE |
|---|---:|---:|
| Ara - 1 | 5 | 0.102926 |
| Ara - 2 | 3 | 0.146860 |
| Ara - 3 | 4 | 0.129442 |
| Ara - 4 | 5 | 0.128020 |
| Ara - 5 | 5 | 0.113374 |
| Ara - 6 | 5 | 0.160365 |
| Ara + 1 | 5 | 0.255569 |
| Ara + 2 | 5 | 0.196622 |
| Ara + 3 | 5 | 0.138377 |
| Ara + 4 | 5 | 0.157452 |
| Ara + 5 | 5 | 0.145434 |
| Ara + 6 | 2 | 0.027304 |

The uneven holdout sample sizes reflect the source experiment's truncated and unequal time series. Ara + 1 and Ara + 2 have noticeably larger errors than several other populations, so pooled performance should not be treated as uniform across replicates.

These values are a first reference-curve benchmark, not validation of the Synthetic Reality Engine's microbial preset. The curve parameters were fit to aggregated LTEE observations; they are not engine parameters. The holdout bootstrap intervals resample population clusters with fitted curves held fixed. A separate calibration cluster bootstrap now refits the candidate curves and reports conditional parameter intervals and model-selection frequencies; it still does not represent uncertainty over unconsidered model families.

## Interpretation rules

- A curve winning on calibration data is not automatically considered scientifically superior. Its temporal holdout metrics and per-population errors must also be inspected.
- The LTEE observations are repeated competition assays, not 12 independent single observations at each generation. Do not treat every replicate row as an independent population.
- Missingness, truncated trajectories and unequal measurement schedules must remain visible in reports.
- Do not use holdout data to tune parameter grids, model families, or split points.
- A poor holdout score is a valid result and must not be hidden by retuning on the holdout.
- A successful curve fit validates only this narrow empirical relationship under this dataset and protocol. It does not validate spatial dynamics, resource regeneration, species interactions, speciation, climate effects, or other presets.
- The analysis is a reference-model benchmark. Connecting it to SimulationEngine requires a separate scientific design: explicit heritable fitness traits, an experimentally faithful transfer/competition protocol, measurable outputs, parameter calibration, and a preregistered evaluation split.

## Remaining scientific gates

1. Obtain a named external researcher to independently reproduce the mechanistic run and confirm data interpretation; the repository now contains a deterministic independent run protocol, but no external replication has yet occurred.
2. Expand the fitness-encoding analysis and verify alternative encodings against the complete assay-level raw data and the current literature.
3. Expand parameter uncertainty beyond the finite grid and evaluate sensitivity to the scaled bottleneck and model structure.
4. Compare against independent population-genetic implementations and benchmark published power-law / two-epoch alternatives.
5. Define a model-level mapping before connecting this subsystem to the existing agent-based microbial preset.
6. Retain dataset provenance, license and immutable hash in every exported report.
