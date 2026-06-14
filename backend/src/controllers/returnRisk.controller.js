// backend/src/controllers/returnRisk.controller.js
import { predictReturnRisk } from "../services/predictReturnRisk.js";

/**
 * Controller to handle return risk predictions for a user, product, and size.
 */
export async function checkReturnRiskController(req, res, next) {
  try {
    const { userId, productId, chosenSize } = req.body || {};

    if (!productId) {
      return res.status(400).json({ error: "productId is required" });
    }
    if (!chosenSize) {
      return res.status(400).json({ error: "chosenSize is required" });
    }

    // Default to Priya (u1) if no user specified, to facilitate easy demo testing
    const activeUserId = userId || "u1";
    const result = predictReturnRisk(activeUserId, productId, chosenSize);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    console.error("❌ Error in checkReturnRiskController:", err);
    next(err);
  }
}
