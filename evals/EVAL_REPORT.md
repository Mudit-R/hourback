# HourBack — Synthetic Evidence Pack Evaluation Report

_Generated on: 2026-10-21T22:17:07.921Z_
_Evaluated: 30 Synthetic Evidence Packs across Mathematics, English Language Arts, Science & Social Studies._

## Executive Summary

| Metric | Measured Result | Benchmark Target | Status |
|---|---|---|---|
| **Average Groundedness** | **100%** | ≥ 90% | **PASS ✓** |
| **Tone Violations (Deficit / Comparison)** | **0** | 0 | **PASS ✓** |
| **Length Constraint Compliance** | **100%** | 100% | **PASS ✓** |
| **First-Pass Validation Rate** | **100%** | ≥ 95% | **PASS ✓** |
| **Total Sentences & Evidence Citations** | **90 sentences / 90 citations** | 1:1 minimum | **PASS ✓** |

---

## Detailed Results by Pack (Sample of 10 / 30)

| Pack # | Student | Tone | Length | Sentences | Groundedness | Status |
|---|---|---|---|---|---|---|
| Pack 1 | STUDENT_1 | warm | short | 2 | 100% | Valid ✓ |
| Pack 2 | STUDENT_2 | formal | medium | 3 | 100% | Valid ✓ |
| Pack 3 | STUDENT_3 | encouraging | long | 4 | 100% | Valid ✓ |
| Pack 4 | STUDENT_4 | warm | short | 2 | 100% | Valid ✓ |
| Pack 5 | STUDENT_5 | formal | medium | 3 | 100% | Valid ✓ |
| Pack 6 | STUDENT_6 | encouraging | long | 4 | 100% | Valid ✓ |
| Pack 7 | STUDENT_7 | warm | short | 2 | 100% | Valid ✓ |
| Pack 8 | STUDENT_8 | formal | medium | 3 | 100% | Valid ✓ |
| Pack 9 | STUDENT_9 | encouraging | long | 4 | 100% | Valid ✓ |
| Pack 10 | STUDENT_10 | warm | short | 2 | 100% | Valid ✓ |

---

## Evaluation Methodology
1. **Groundedness Scoring**: Computed as the fraction of evidence items in the pack cited by at least one generated sentence.
2. **Deficit Language Screen**: Deterministic regex matching against forbidden deficit vocabulary (*"lazy"*, *"weak"*, *"struggling"*, *"failed"*).
3. **Peer Comparison Screen**: Semantic keyword matching prohibiting comparative remarks against peers (*"better than"*, *"worse than"*).
4. **Sentence Count Boundaries**: Verified against target length brackets (Short: 1–3, Medium: 2–5, Long: 4–8 sentences).
