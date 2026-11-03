#!/usr/bin/env python3
"""Independent standard-library replay of the selected LTEE model fits.

This intentionally does not call or import the TypeScript implementation. It
reparses the pinned assay data, independently simulates the selected parameter
sets, and recomputes calibration/holdout metrics for cross-language checking.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
import sys
from collections import defaultdict
from pathlib import Path

DT = math.log2(100.0)
BIN_WIDTH = 0.0001
ENCODINGS = [
    "original-relative-growth-ratio",
    "logit-per-generation",
    "logit-per-cycle",
    "log-per-cycle",
    "log-per-generation",
]
POPULATIONS = ["Ara - 5", "Ara - 6", "Ara + 1", "Ara + 2", "Ara + 4", "Ara + 5"]


def u32(value: int) -> int:
    return value & 0xFFFFFFFF


def imul(a: int, b: int) -> int:
    return u32(a * b)


def mulberry32(seed: int):
    state = u32(seed)

    def random() -> float:
        nonlocal state
        state = u32(state + 0x6D2B79F5)
        value = state
        value = imul(value ^ (value >> 15), value | 1)
        value ^= u32(value + imul(value ^ (value >> 7), value | 61))
        value = u32(value)
        return u32(value ^ (value >> 14)) / 4294967296.0

    return random


def hash_seed(seed: int, label: str) -> int:
    value = u32(seed)
    for char in label:
        value = imul(value ^ ord(char), 16777619)
    return value


def poisson(lam: float, random) -> int:
    if not lam > 0:
        return 0
    if lam < 30:
        threshold = math.exp(-lam)
        product = 1.0
        count = 0
        while True:
            count += 1
            product *= max(random(), float.fromhex("0x0.0000000000001p-1022"))
            if not product > threshold:
                break
        return count - 1
    u1 = max(random(), float.fromhex("0x0.0000000000001p-1022"))
    u2 = random()
    normal = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
    return max(0, math.floor(lam + math.sqrt(lam) * normal + 0.5))


def merge_class_limit(classes: dict[int, float], limit: int) -> None:
    while len(classes) > limit:
        rarest_key = None
        rarest_count = math.inf
        for key, count in classes.items():
            if count < rarest_count:
                rarest_count = count
                rarest_key = key
        del classes[rarest_key]
        nearest_key = None
        nearest_distance = math.inf
        for key in classes:
            distance = abs(key - rarest_key)
            if distance < nearest_distance:
                nearest_distance = distance
                nearest_key = key
        if nearest_key is None:
            classes[rarest_key] = rarest_count
        else:
            classes[nearest_key] = classes.get(nearest_key, 0.0) + rarest_count


def normalize_bottleneck(classes: dict[int, float], size: int, random) -> None:
    sampled: dict[int, int] = {}
    total = 0
    largest_key = None
    largest_count = -1
    for key, count in classes.items():
        draw = poisson(count, random)
        if draw > 0:
            sampled[key] = draw
            total += draw
            if draw > largest_count:
                largest_count = draw
                largest_key = key
    if total == 0:
        sampled = {0: size}
    else:
        adjusted = sampled.get(largest_key, 0) + size - total
        if adjusted > 0:
            sampled[largest_key] = adjusted
        else:
            key = sorted(sampled, key=lambda item: sampled[item], reverse=True)[0]
            sampled[key] = max(1, sampled.get(key, 0) + size - total)
    classes.clear()
    for key, count in sampled.items():
        if count > 0:
            classes[key] = count
    corrected = sum(classes.values())
    if corrected != size:
        key = sorted(classes, key=lambda item: classes[item], reverse=True)[0]
        classes[key] = classes.get(key, 0) + size - corrected


def interpolate(before, after, generation):
    if after["generation"] == before["generation"]:
        return after
    alpha = (generation - before["generation"]) / (after["generation"] - before["generation"])
    frequencies: dict[int, float] = {}
    for item in before["classes"]:
        key = math.floor(item["selectionCoefficient"] * 1e6 + 0.5)
        frequencies[key] = item["frequency"] * (1 - alpha)
    for item in after["classes"]:
        key = math.floor(item["selectionCoefficient"] * 1e6 + 0.5)
        frequencies[key] = frequencies.get(key, 0.0) + item["frequency"] * alpha
    return {
        "generation": generation,
        "transfer": before["transfer"] + (after["transfer"] - before["transfer"]) * alpha,
        "classes": [
            {"selectionCoefficient": key / 1e6, "frequency": freq}
            for key, freq in frequencies.items() if freq > 0
        ],
    }


def simulate(population, sample_generations, params, seed=20261103):
    targets = sorted(set(sample_generations))
    random = mulberry32(hash_seed(seed, population))
    size = int(params["effectiveBottleneck"])
    classes: dict[int, float] = {0: float(size)}
    result = {}
    generation = 0.0
    transfer = 0
    target_index = 0
    previous = {
        "generation": 0.0,
        "transfer": 0.0,
        "classes": [{"selectionCoefficient": 0.0, "frequency": 1.0}],
    }
    while target_index < len(targets) and targets[target_index] == 0:
        result[0] = previous
        target_index += 1
    max_generation = targets[-1] if targets else 0
    while generation < max_generation:
        maximum_coefficient = max(classes) * BIN_WIDTH
        weights = {
            key: count * math.exp((key * BIN_WIDTH - maximum_coefficient) * DT)
            for key, count in classes.items()
        }
        weight_total = sum(weights.values())
        selected = {
            key: (weight / weight_total * size if weight_total > 0 else 0.0)
            for key, weight in weights.items()
        }
        mutated: dict[int, float] = {}
        mutation_probability = 1 - math.exp(-params["beneficialMutationRate"] * DT)
        for key, count in selected.items():
            mutation_count = min(math.floor(count), poisson(count * mutation_probability, random))
            remaining = max(0.0, count - mutation_count)
            if remaining > 0:
                mutated[key] = mutated.get(key, 0.0) + remaining
            for _ in range(mutation_count):
                parent = key * BIN_WIDTH
                mean_effect = params["meanBeneficialEffect"] * math.exp(
                    -params["diminishingReturns"] * max(0.0, parent)
                )
                effect = -mean_effect * math.log(max(random(), float.fromhex("0x0.0000000000001p-1022")))
                mutant_key = max(key + 1, math.floor((parent + effect) / BIN_WIDTH + 0.5))
                mutated[mutant_key] = mutated.get(mutant_key, 0.0) + 1
        merge_class_limit(mutated, int(params["maxFitnessClasses"]))
        normalize_bottleneck(mutated, size, random)
        classes = mutated
        before_generation = generation
        generation += DT
        transfer += 1
        current = {
            "generation": generation,
            "transfer": transfer,
            "classes": [
                {"selectionCoefficient": key * BIN_WIDTH, "frequency": count / size}
                for key, count in classes.items()
            ],
        }
        while target_index < len(targets) and targets[target_index] <= generation:
            target = targets[target_index]
            result[target] = interpolate(previous, current, max(before_generation, target))
            target_index += 1
        previous = current
    return result


def parse_assays(csv_path: Path):
    raw = []
    with csv_path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            if not row["Fitness"]:
                continue
            population = row["Population"]
            red_evolved = row["Red.Pop"] == population
            white_evolved = row["White.Pop"] == population
            if red_evolved == white_evolved:
                raise AssertionError(f"ambiguous marker direction: {population}")
            red0, white0 = int(row["Red.0"]), int(row["White.0"])
            red1, white1 = int(row["Red.1"]), int(row["White.1"])
            evolved0, ancestor0 = (red0, white0) if red_evolved else (white0, red0)
            evolved1, ancestor1 = (red1, white1) if red_evolved else (white1, red1)
            d0, d1 = int(row["D.0"]), int(row["D.1"])
            evolved_lfc = math.log(evolved1 * d1 / (evolved0 * d0))
            ancestor_lfc = math.log(ancestor1 * d1 / (ancestor0 * d0))
            logit_cycle = math.log(evolved1 / ancestor1) - math.log(evolved0 / ancestor0)
            original = evolved_lfc / ancestor_lfc
            if abs(original - float(row["Fitness"])) > 1e-5:
                raise AssertionError("fitness reconstruction mismatch")
            f0 = evolved0 / (evolved0 + ancestor0)
            f1 = evolved1 / (evolved1 + ancestor1)
            log_cycle = math.log(f1) - math.log(f0)
            raw.append({
                "population": population,
                "generation": int(row["Generation"]),
                "mutator": row["Mutator.Ever"] == "Yes",
                "assay": {
                    "initialEvolvedCount": evolved0,
                    "initialAncestorCount": ancestor0,
                    "ancestorLogFoldChange": ancestor_lfc,
                },
                "observed": {
                    "original-relative-growth-ratio": original,
                    "logit-per-generation": original - 1,
                    "logit-per-cycle": logit_cycle,
                    "log-per-cycle": log_cycle,
                    "log-per-generation": log_cycle / ancestor_lfc,
                },
            })
    return raw


def predict_assay(snapshot, assay):
    lfc = assay["ancestorLogFoldChange"]
    exponents = [
        math.log(item["frequency"]) + item["selectionCoefficient"] * lfc
        for item in snapshot["classes"]
    ]
    maximum = max(exponents)
    fold = sum(math.exp(value - maximum) for value in exponents)
    logit_cycle = maximum + math.log(fold)
    logit_generation = logit_cycle / lfc
    initial_frequency = assay["initialEvolvedCount"] / (
        assay["initialEvolvedCount"] + assay["initialAncestorCount"]
    )
    initial_logit = math.log(initial_frequency / (1 - initial_frequency))
    final_logit = initial_logit + logit_cycle
    if final_logit >= 0:
        final_frequency = 1 / (1 + math.exp(-final_logit))
    else:
        exp_value = math.exp(final_logit)
        final_frequency = exp_value / (1 + exp_value)
    log_cycle = math.log(final_frequency) - math.log(initial_frequency)
    return {
        "original-relative-growth-ratio": 1 + logit_generation,
        "logit-per-generation": logit_generation,
        "logit-per-cycle": logit_cycle,
        "log-per-cycle": log_cycle,
        "log-per-generation": log_cycle / lfc,
    }


def mean(values):
    return sum(values) / len(values)


def population_rmse(points, encoding):
    populations = sorted({point["population"] for point in points})
    return mean([
        math.sqrt(mean([
            (point["predicted"][encoding] - point["observed"][encoding]) ** 2
            for point in points if point["population"] == population
        ]))
        for population in populations
    ])


def population_mae(points, encoding):
    populations = sorted({point["population"] for point in points})
    return mean([
        mean([
            abs(point["predicted"][encoding] - point["observed"][encoding])
            for point in points if point["population"] == population
        ])
        for population in populations
    ])


def bootstrap_holdout(points, encoding, seed=20261105, iterations=1000):
    by_population = defaultdict(list)
    for point in points:
        by_population[point["population"]].append(
            (point["predicted"][encoding] - point["observed"][encoding]) ** 2
        )
    populations = list(by_population)
    random = mulberry32(seed)
    samples = []
    for _ in range(iterations):
        chosen = [populations[math.floor(random() * len(populations))] for _ in populations]
        errors = [error for population in chosen for error in by_population[population]]
        samples.append(math.sqrt(mean(errors)))
    samples.sort()
    return {
        "lower95": samples[math.floor(iterations * 0.025)],
        "upper95": samples[min(iterations - 1, math.floor(iterations * 0.975))],
    }


def main():
    report_path = Path(sys.argv[1])
    report = json.loads(report_path.read_text(encoding="utf-8"))
    root = Path(__file__).resolve().parents[2]
    csv_path = root / "research" / "data" / "ltee_fitness.csv"
    source = csv_path.read_bytes()
    digest = hashlib.sha256(source).hexdigest()
    if digest != report["dataset"]["sha256"]:
        raise AssertionError("pinned LTEE data SHA-256 differs from TypeScript report")

    all_rows = parse_assays(csv_path)
    rows = [row for row in all_rows if not row["mutator"]]
    if sorted({row["population"] for row in rows}) != sorted(POPULATIONS):
        raise AssertionError("non-mutator cohort differs from the declared six populations")

    grouped = defaultdict(list)
    for row in rows:
        grouped[(row["population"], row["generation"])].append(row)
    points = []
    for (population, generation), group in grouped.items():
        observed = {
            encoding: mean([row["observed"][encoding] for row in group])
            for encoding in ENCODINGS
        }
        points.append({
            "population": population,
            "generation": generation,
            "observed": observed,
            "predicted": {},
        })
    maxima = {
        population: max(point["generation"] for point in points if point["population"] == population)
        for population in POPULATIONS
    }
    train = [p for p in points if p["generation"] <= maxima[p["population"]] * 0.8]
    test = [p for p in points if p["generation"] > maxima[p["population"]] * 0.8]

    verified = []
    for metric in report["metrics"]:
        encoding = metric["encoding"]
        params = metric["selectedParameters"]
        for population in POPULATIONS:
            population_rows = [row for row in rows if row["population"] == population]
            generations = sorted({row["generation"] for row in population_rows})
            snapshots = simulate(population, generations, params)
            for generation in generations:
                assay_rows = [row for row in population_rows if row["generation"] == generation]
                predicted = [
                    predict_assay(snapshots[generation], row["assay"])
                    for row in assay_rows
                ]
                point = next(p for p in points if p["population"] == population and p["generation"] == generation)
                point["predicted"][encoding] = mean([item[encoding] for item in predicted])

        train_metric = population_rmse(train, encoding)
        holdout_metric = population_rmse(test, encoding)
        holdout_mae = population_mae(test, encoding)
        interval = bootstrap_holdout(test, encoding)
        for name, actual, expected in [
            ("calibration RMSE", train_metric, metric["calibrationRmse"]),
            ("holdout RMSE", holdout_metric, metric["holdoutRmse"]),
            ("holdout MAE", holdout_mae, metric["holdoutMae"]),
            ("bootstrap lower 95%", interval["lower95"], metric["holdoutClusterBootstrap95"]["lower95"]),
            ("bootstrap upper 95%", interval["upper95"], metric["holdoutClusterBootstrap95"]["upper95"]),
        ]:
            if abs(actual - expected) > 2e-7:
                raise AssertionError(f"{encoding} {name} mismatch: Python={actual}, TypeScript={expected}")
        verified.append({
            "encoding": encoding,
            "selectedParameters": params,
            "calibrationRmse": train_metric,
            "holdoutRmse": holdout_metric,
            "holdoutMae": holdout_mae,
            "bootstrap95": interval,
            "result": "matched",
        })
    print(json.dumps({
        "independentImplementation": "Python standard-library reference replay",
        "datasetSha256": digest,
        "completeAssays": len(all_rows),
        "calibrationPopulations": POPULATIONS,
        "verifiedSelectedFits": verified,
        "scope": "Independent cross-language replay of selected fitted parameter sets and holdout metrics; not an external researcher replication or independent grid-search implementation."
    }, indent=2))


if __name__ == "__main__":
    main()
