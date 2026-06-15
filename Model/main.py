"""
main.py — wires the pipeline into one API endpoint.

Flow:  select profile (by category)  ->  detect cosmetic (vision)
       ->  merge questionnaire + lookups  ->  grade (rules)  ->  route.

Run:   pip install -r requirements.txt
       uvicorn main:app --reload
"""

import json
from pathlib import Path

from fastapi import FastAPI
from pydantic import BaseModel

import detection
import grading
import routing

app = FastAPI(title="Condition grader")
PROFILE_DIR = Path(__file__).parent / "profiles"


def load_profile(category: str) -> dict:
    """Load the profile for a category, or fall back to the universal profile."""
    path = PROFILE_DIR / f"{category}.json"
    if not path.exists():
        path = PROFILE_DIR / "generic_fallback.json"
    return json.loads(path.read_text())


class GradeRequest(BaseModel):
    category: str                       # e.g. "phone" (or anything -> fallback)
    image_paths: list[str] = []         # local paths or URLs you fetch first
    questionnaire: dict = {}            # { attribute_id: value } from the user
    lookups: dict = {}                  # { attribute_id: value } e.g. imei_status
    reference_price: float = 100.0      # like-new price for this exact model


@app.post("/grade")
def grade(req: GradeRequest):
    profile = load_profile(req.category)

    # 1. Vision evidence (skip if no images yet — useful for testing the rules).
    vision = detection.detect_cosmetic(profile, req.image_paths) if req.image_paths else {}

    # 2. Combine all three evidence channels.
    detected = detection.merge_evidence(vision, req.questionnaire, req.lookups)

    # 3. Deterministic grade.
    result = grading.grade_item(profile, detected)

    # 4. Smart routing.
    decision = routing.route_item(profile, result, req.reference_price)

    return {
        "category": profile["category"],
        "grade": result["grade"],
        "reasons": result["reasons"],
        "flags": result["flags"],
        "routing": decision,
    }


@app.get("/profiles/{category}")
def get_profile(category: str):
    """Return the questionnaire + required photos the UI should show for a category."""
    profile = load_profile(category)
    return {
        "category": profile["category"],
        "capture_angles": profile["capture_angles"],
        "questions": [
            {"id": a["id"], "label": a["label"], "question": a.get("question")}
            for a in profile["attributes"] if a.get("source") == "questionnaire"
        ],
    }
