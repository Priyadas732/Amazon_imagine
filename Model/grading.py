"""
grading.py — the deterministic grading engine.

This is the heart of the system and it is COMPLETELY GENERIC.
It knows nothing about phones, sofas, or jackets. It only knows how to read
a profile + a set of detected values and compute a grade by applying caps.

Final grade = the WORST (lowest) cap across every attribute.
This is what makes results consistent, explainable, and auditable:
the same evidence always yields the same grade, and you can see exactly why.
"""

from typing import Any

# Lower number = worse grade. Grade is the minimum cap across attributes.
GRADE_RANK = {"A": 3, "B": 2, "C": 1, "D": 0}
RANK_GRADE = {v: k for k, v in GRADE_RANK.items()}

# If a vision attribute's confidence is below this, send the item to a human.
CONFIDENCE_THRESHOLD = 0.6


def _normalize(detected_value: Any) -> dict:
    """Accept either a bare value or {"value":..., "confidence":...}."""
    if isinstance(detected_value, dict) and "value" in detected_value:
        return {"value": detected_value["value"],
                "confidence": detected_value.get("confidence", 1.0)}
    return {"value": detected_value, "confidence": 1.0}


def _cap_for_attribute(attr: dict, value: Any) -> str:
    """Resolve the maximum grade this attribute's value allows."""
    if value is None:
        # No evidence collected -> can't claim top condition; flag for review.
        return "C"

    if "grade_caps_numeric" in attr:
        try:
            num = float(value)
        except (TypeError, ValueError):
            return "C"
        # Bands sorted highest-min first; first band the value clears wins.
        for band in sorted(attr["grade_caps_numeric"], key=lambda b: b["min"], reverse=True):
            if num >= band["min"]:
                return band["cap"]
        return "D"

    caps = attr.get("grade_caps", {})
    key = str(value).lower() if isinstance(value, bool) else str(value)
    return caps.get(key, "C")  # unknown value -> conservative cap


def grade_item(profile: dict, detected: dict) -> dict:
    """
    profile  : a loaded category profile (see profiles/*.json)
    detected : { attribute_id: value }  OR  { attribute_id: {"value", "confidence"} }
               Values come from vision, questionnaire, lookup, or diagnostics.

    Returns the grade, the per-attribute caps, human-readable reasons, and flags.
    """
    caps: dict[str, str] = {}
    reasons: list[str] = []
    resale_blocked = False
    needs_review = False

    for attr in profile["attributes"]:
        aid = attr["id"]
        raw = detected.get(aid)
        norm = _normalize(raw)
        value, confidence = norm["value"], norm["confidence"]

        cap = _cap_for_attribute(attr, value)
        caps[aid] = cap

        if value is None:
            needs_review = True
            reasons.append(f"{attr['label']}: no data -> capped at C, needs review")
        else:
            reasons.append(f"{attr['label']} = {value} -> max grade {cap}")

        # Low-confidence vision result -> human review.
        if attr.get("source") == "vision" and confidence < CONFIDENCE_THRESHOLD:
            needs_review = True
            reasons.append(f"{attr['label']}: low confidence ({confidence:.2f}), needs review")

        # Legal / practical resale block (e.g. blacklisted IMEI).
        if value is not None and str(value) in attr.get("blocks_resale", []):
            resale_blocked = True
            reasons.append(f"{attr['label']} = {value} -> resale blocked")

    worst_rank = min((GRADE_RANK[c] for c in caps.values()), default=0)
    final_grade = RANK_GRADE[worst_rank]

    return {
        "grade": final_grade,
        "caps": caps,
        "reasons": reasons,
        "flags": {"resale_blocked": resale_blocked, "needs_review": needs_review},
    }
