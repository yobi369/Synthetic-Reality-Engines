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

This distinction matters. The current interactive microbial preset is a spatial, agent-based ecosystem with abstract energy/metabolism, food resources, mutation, predation and reproduction. It does not currently implement the LTEE's daily serial-transfer protocol, ancestral-vs-evolved competition assay, or a calibrated mapping from agent genetics to measured relative fitness. Therefore this dataset cannot honestly validate the whole SimulationEngine or its current microbial preset. The new analysis is a narrow empirical benchmark for published adaptation-curve families and a foundation for a future, explicitly specified LTEE subsystem. It is not evidence that the game simulation predicts real microbial evolution.

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
7. Report per-population holdout errors so a good pooled score cannot conceal a failed replicate population.

The script prints machine-readable JSON including source citation, row counts, cutoffs, selected parameters, all candidate metrics, bootstrap intervals and per-population errors. Its bootstrap interval quantifies variation across the 12 population clusters for the fitted curves; it is not a full parameter uncertainty interval and does not correct for every source of experimental measurement error.

## Interpretation rules

- A curve winning on calibration data is not automatically considered scientifically superior. Its temporal holdout metrics and per-population errors must also be inspected.
- The LTEE observations are repeated competition assays, not 12 independent single observations at each generation. Do not treat every replicate row as an independent population.
- Missingness, truncated trajectories and unequal measurement schedules must remain visible in reports.
- Do not use holdout data to tune parameter grids, model families, or split points.
- A poor holdout score is a valid result and must not be hidden by retuning on the holdout.
- A successful curve fit validates only this narrow empirical relationship under this dataset and protocol. It does not validate spatial dynamics, resource regeneration, species interactions, speciation, climate effects, or other presets.
- The analysis is a reference-model benchmark. Connecting it to SimulationEngine requires a separate scientific design: explicit heritable fitness traits, an experimentally faithful transfer/competition protocol, measurable outputs, parameter calibration, and a preregistered evaluation split.

## Remaining scientific gates

1. Have an independent researcher reproduce the analysis and confirm the data interpretation.
2. Compare the reported fitness statistic with alternative defensible encodings and document sensitivity to assay design.
3. Add parameter uncertainty and sensitivity analysis beyond the fixed-grid fit.
4. Define a model-level mapping and a separate LTEE-style experimental protocol before claiming that any engine component is empirically validated.
5. Retain this dataset's provenance, license and immutable version/hash in every exported benchmark report.
