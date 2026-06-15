# Generic condition grader + smart router

A grading system for **any** used item (phones, laptops, furniture, clothing, …).
The engine is generic; each item type is just a JSON **profile**. To support a new
category you add a file — you never touch the engine.

## How it works

```
photos + answers + IMEI/lookups
        │
        ▼
  detect evidence ──► merge ──► GRADE (deterministic rules) ──► ROUTE
   (vision model)               A / B / C / D                  resell / refurbish
                                                                / recycle / donate
```

The one rule that makes grading accurate: **the AI only detects individual
defects; plain rules decide the grade.** Two identical items always get the same
grade, and every grade comes with the reasons that produced it.

## Files

| File | What it is |
|------|-----------|
| `profiles/profile_schema.json` | The contract every profile follows |
| `profiles/phone.json` | Example profile (vision + questionnaire + IMEI) |
| `profiles/furniture.json` | Example profile — different attributes, same shape |
| `profiles/generic_fallback.json` | Universal profile for unrecognized items |
| `grading.py` | The deterministic grading engine (generic) |
| `detection.py` | Vision call: profile-driven JSON schema → defect severities |
| `routing.py` | Expected-value decision over the four routes |
| `main.py` | FastAPI app wiring it together |

## Run it

Pick a vision backend with `VLM_PROVIDER` — the rest of the pipeline is identical.

**Free + local (recommended, private, no rate limit, no bill):**
```bash
# 1. install Ollama from https://ollama.com, then pull a vision model:
ollama pull llama3.2-vision      # or: ollama pull qwen2.5vl  (better for defects)
# 2. run the API:
pip install fastapi uvicorn requests
export VLM_PROVIDER=ollama
uvicorn main:app --reload
```

**Free tier (cloud, no GPU needed, rate-limited):**
```bash
pip install fastapi uvicorn google-generativeai pillow
export VLM_PROVIDER=gemini
export GEMINI_API_KEY=...          # free from Google AI Studio, no card
uvicorn main:app --reload
```


Grade an item (vision runs only if you pass image paths; omit them to test the rules):

```bash
curl -X POST localhost:8000/grade -H 'content-type: application/json' -d '{
  "category": "phone",
  "questionnaire": { "powers_on": true, "battery_health": 86 },
  "lookups": { "imei_status": "clean" },
  "reference_price": 800
}'
```

Get the photos + questions your UI should show for a category:

```bash
curl localhost:8000/profiles/phone
```

## Add a new category

Write one JSON file in `profiles/`. List each thing to inspect as an attribute
with its severity levels and a `grade_caps` map (the max grade each level allows).
That's the whole job — the engine, the API, and the router pick it up automatically.

## Recommended build order

1. **Rules first, no AI.** Build the engine + 1 profile and drive it with the
   questionnaire only. Confirm grades and routes make sense. (You just saw this
   pass for 5 cases without any model call.)
2. **Add vision with a VLM.** Use `detection.py` as-is — structured JSON output,
   no training data needed. Ship.
3. **Add a quality gate** on capture (reject blurry / glare / missing angles)
   and a **confidence threshold** — low-confidence detections go to a human.
4. **Collect corrections.** Every human re-grade becomes labeled data.
5. **Specialize** your highest-volume categories: train a small detector
   (e.g. YOLO for cracks/dents) on that data and swap it behind `detect_cosmetic`.
   The engine never changes.

## Replace before production

- `routing.estimate_value` / `estimate_refurb_cost` are **placeholders**. Plug in
  real resale prices (completed listings) and repair-cost data. Until you do, a
  badly broken item can occasionally show "refurbish" because the placeholder
  repair cost is too low — real numbers fix this.
- `imei_status` should come from a real IMEI/blacklist API.
- Add auth, rate limiting, and image storage for a real deployment.
