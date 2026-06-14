import { Router } from "express";
import { routeItem } from "../services/routeItem.js";

const router = Router();

router.post("/dispose", (req, res) => {
  const { productName, grade, originalPrice } = req.body || {};
  if (!grade || !originalPrice) {
    return res.status(400).json({ error: "grade and originalPrice are required" });
  }
  const result = routeItem({ productName, grade, originalPrice: Number(originalPrice) });
  res.json(result);
});

export default router;
