"""
routing.py — decides what to do with the item once it's graded.

Generic for all categories. The DECISION logic is fixed; only the numbers
(resale value, refurb cost) come from category-specific data you plug in.

Replace estimate_value() and estimate_refurb_cost() with real market data
(your pricing tables, completed-listing scrapes, repair-cost sheets).
"""

# ---- Placeholder economics. Swap these for real data sources. -----------------
# Rough resale value by grade, as a fraction of a "like-new" reference price.
_GRADE_VALUE_FRACTION = {"A": 0.85, "B": 0.65, "C": 0.40, "D": 0.10}


def estimate_value(category: str, grade: str, reference_price: float) -> float:
    """Estimated resale price at this grade. Replace with your pricing model."""
    return round(reference_price * _GRADE_VALUE_FRACTION.get(grade, 0.1), 2)


def estimate_refurb_cost(category: str, grade: str, reference_price: float) -> float:
    """Estimated cost to refurbish one grade up. Replace with repair-cost data."""
    # Cheap to lift C->B, expensive to lift D->C.
    return round(reference_price * (0.30 if grade == "D" else 0.12), 2)


def _next_grade_up(grade: str) -> str:
    return {"D": "C", "C": "B", "B": "A", "A": "A"}[grade]


# ---- The generic routing decision --------------------------------------------
def route_item(profile: dict, grade_result: dict, reference_price: float = 100.0) -> dict:
    """
    Picks the route with the highest expected value among allowed routes,
    respecting hard constraints (resale blocks, allowed_routes in the profile).
    """
    category = profile["category"]
    grade = grade_result["grade"]
    flags = grade_result["flags"]
    allowed = list(profile["routing"]["allowed_routes"])

    # A resale block (e.g. blacklisted IMEI) kills resell AND refurbish:
    # refurbishing only pays off by reselling, which is forbidden.
    if flags.get("resale_blocked"):
        for r in ("resell", "refurbish"):
            if r in allowed:
                allowed.remove(r)

    # Expected monetary value of each candidate route.
    options: dict[str, float] = {}

    # Resell only makes sense for usable grades — never a dead/major-damage item.
    if "resell" in allowed and grade in ("A", "B", "C"):
        options["resell"] = estimate_value(category, grade, reference_price)

    # Refurbish only applies to damaged-but-fixable items (not already-good ones).
    if "refurbish" in allowed and grade in ("C", "D"):
        lifted = _next_grade_up(grade)
        cost = estimate_refurb_cost(category, grade, reference_price)
        options["refurbish"] = estimate_value(category, lifted, reference_price) - cost

    if "recycle" in allowed:
        # Small but reliable material-recovery value; also the compliant exit.
        options["recycle"] = round(reference_price * 0.05, 2)

    # Donate is monetarily ~0 but valid when the item is usable and other
    # options are barely profitable. Treat it as the chosen path when the best
    # monetary option is below a small floor and the item still works (>= C).
    best_route = max(options, key=options.get) if options else None
    best_value = options.get(best_route, 0.0)

    monetary_floor = reference_price * 0.08
    item_usable = grade in ("A", "B", "C")
    if "donate" in allowed and item_usable and best_value < monetary_floor:
        best_route = "donate"
        rationale = "Low resale upside but still usable — donate for impact/tax benefit."
    elif best_route == "refurbish":
        rationale = "Refurbishing lifts the grade enough to beat selling as-is."
    elif best_route == "resell":
        rationale = "Sells profitably at current grade with no rework."
    elif best_route == "recycle":
        rationale = "Not economical to repair or resell — recover materials."
    else:
        best_route = "recycle"
        rationale = "No viable resale/donate path — recycle."

    return {
        "route": best_route,
        "rationale": rationale,
        "economics": {k: round(v, 2) for k, v in options.items()},
        "considered": allowed,
    }
