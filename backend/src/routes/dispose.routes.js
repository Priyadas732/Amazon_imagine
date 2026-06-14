import { Router } from "express";
import { routeItem } from "../services/routeItem.js";

const router = Router();

router.post("/dispose", (req, res) => {
  const { productName, category, grade, originalPrice, region } = req.body || {};
  if (!grade || !originalPrice) {
    return res.status(400).json({ error: "grade and originalPrice are required" });
  }
  const result = routeItem({ 
    productName, 
    category,
    grade, 
    originalPrice: Number(originalPrice),
    region: region || "Bangalore"
  });
  res.json(result);
});

export default router;
