"""
detection.py — turns photos into structured defect evidence.

KEY IDEA (unchanged): never ask the model "what grade is this?". Ask it to
detect each cosmetic attribute in the profile and return strict JSON of
severities + confidence. The deterministic engine (grading.py) decides the grade.

This version supports TWO backends — switch with the VLM_PROVIDER env var:

  VLM_PROVIDER=ollama     -> local open-source model, FREE + private, no rate limit
                             (needs Ollama installed: https://ollama.com)
  VLM_PROVIDER=gemini     -> Google Gemini free tier, FREE to start (rate-limited)
                             (needs GEMINI_API_KEY, free from AI Studio)

Nothing else in the pipeline changes — grading.py, routing.py, profiles, and
main.py are all model-agnostic.
"""

import base64
import json
import os

PROVIDER = os.getenv("VLM_PROVIDER", "ollama")  # default: free + local

# --- Per-provider model names (override via env). Verify current names: -------
#   Ollama library: https://ollama.com/library   (run `ollama list`)
#   Gemini models : https://ai.google.dev/gemini-api/docs/rate-limits
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2-vision")
# Tip: `ollama pull qwen2.5vl` then set OLLAMA_MODEL=qwen2.5vl for better
#      structured/defect reading. Moondream is the lightest for weak hardware.
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")      # free tier

OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")


def _vision_attributes(profile: dict) -> list[dict]:
    return [a for a in profile["attributes"] if a.get("source") == "vision"]


def build_instructions(profile: dict) -> str:
    """Build the rubric + output contract from the profile (no item-specific code)."""
    lines = [
        f"You inspect photos of a used item (category: {profile['category']}).",
        "Assess ONLY the attributes listed below from what is visible in the photos.",
        "Do NOT decide an overall grade. For each attribute, choose exactly one",
        "severity level and give a confidence from 0 to 1.",
        "",
        "Attributes:",
    ]
    for a in _vision_attributes(profile):
        levels = " | ".join(a.get("severity_levels", []))
        lines.append(f'- "{a["id"]}" ({a["label"]}): one of [{levels}]')
    lines += [
        "",
        "Return ONLY a JSON object, no prose, no markdown fences, of the form:",
        '{ "<attribute_id>": { "value": "<level>", "confidence": 0.0-1.0 }, ... }',
    ]
    return "\n".join(lines)


def _b64(path: str) -> str:
    with open(path, "rb") as f:
        return base64.standard_b64encode(f.read()).decode("utf-8")


# --- Provider implementations: each returns the raw model text (should be JSON) --
def _call_ollama(system: str, image_paths: list[str], user_text: str) -> str:
    import requests  # pip install requests
    payload = {
        "model": OLLAMA_MODEL,
        "format": "json",          # forces valid JSON output
        "stream": False,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_text,
             "images": [_b64(p) for p in image_paths]},
        ],
    }
    r = requests.post(f"{OLLAMA_HOST}/api/chat", json=payload, timeout=300)
    r.raise_for_status()
    return r.json()["message"]["content"]


def _call_gemini(system: str, image_paths: list[str], user_text: str) -> str:
    import google.generativeai as genai  # pyrefly: ignore  # pip install google-generativeai
    from PIL import Image                  # pip install pillow
    genai.configure(api_key=os.environ["GEMINI_API_KEY"])
    model = genai.GenerativeModel(GEMINI_MODEL, system_instruction=system)
    parts = [user_text] + [Image.open(p) for p in image_paths]
    resp = model.generate_content(
        parts, generation_config={"response_mime_type": "application/json"}
    )
    return resp.text


_PROVIDERS = {"ollama": _call_ollama, "gemini": _call_gemini}


def detect_cosmetic(profile: dict, image_paths: list[str]) -> dict:
    """
    Returns { attribute_id: {"value": severity, "confidence": float} } for every
    vision attribute. Uses whichever backend VLM_PROVIDER selects — the rest of
    the pipeline neither knows nor cares which model produced this.
    """
    call = _PROVIDERS.get(PROVIDER)
    if call is None:
        raise ValueError(f"Unknown VLM_PROVIDER '{PROVIDER}'. Use: {list(_PROVIDERS)}")

    system = build_instructions(profile)
    raw = call(system, image_paths, "Inspect the item per the instructions.").strip()
    raw = raw.removeprefix("```json").removeprefix("```").removesuffix("```").strip()

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Unparseable -> flag every attribute for human review.
        return {a["id"]: {"value": None, "confidence": 0.0}
                for a in _vision_attributes(profile)}


def merge_evidence(vision: dict, questionnaire: dict, lookups: dict) -> dict:
    """
    Combine the three channels into one detected dict for grading.py.
    questionnaire/lookups values get confidence 1.0 (self-reported / authoritative).
    """
    detected = dict(vision)
    for source in (questionnaire, lookups):
        for k, v in source.items():
            detected[k] = {"value": v, "confidence": 1.0}
    return detected
