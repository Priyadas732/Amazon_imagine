// src/routes/api.routes.js
import { Router } from "express";
import multer from "multer";
import { requireRole } from "../middleware/auth.js";
import { gradeItem } from "../controllers/grade.controller.js";
import { getUploadUrl } from "../controllers/upload.controller.js";
import { getItemById, updateItemById } from "../controllers/item.controller.js";
import { getCategoryRequirements } from "../controllers/requirements.controller.js";
import { checkPurchaseRisk } from "../controllers/preventionEngine.js";
import { checkReturnRiskController } from "../controllers/returnRisk.controller.js";
import { downloadBuffer } from "../services/s3.service.js";

const router = Router();

// Multer memory storage configuration for multipart image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// POST /grade - Evaluate returns grade using S3 keys
router.post("/grade", requireRole("seller", "donor", "ngo", "admin"), gradeItem);

// POST /upload - Generate presigned S3 URL
router.post("/upload", requireRole("seller", "donor", "ngo", "admin"), getUploadUrl);

// GET /item/:id - Retrieve return item by ID
router.get("/item/:id", requireRole("buyer", "seller", "donor", "ngo", "admin"), getItemById);

// PUT /item/:id - Update return item by ID
router.put("/item/:id", requireRole("buyer", "seller", "donor", "ngo", "admin"), updateItemById);

// GET /requirements - Retrieve dynamic requirements list
router.get("/requirements", getCategoryRequirements);

// POST /evaluate-risk - Assess purchase risk dynamically
router.post("/evaluate-risk", requireRole("buyer", "seller", "donor", "ngo", "admin"), checkPurchaseRisk);

// POST /predict-return - Predict purchase return risk based on telemetry data
router.post("/predict-return", requireRole("buyer", "seller", "donor", "ngo", "admin"), checkReturnRiskController);

// GET /image/:itemId/:filename - Serve private S3 images directly
router.get("/image/:itemId/:filename", async (req, res, next) => {
  try {
    const { itemId, filename } = req.params;
    const key = `${itemId}/${filename}`;
    const { buffer, contentType } = await downloadBuffer(key);
    res.setHeader("Content-Type", contentType || "image/jpeg");
    res.send(buffer);
  } catch (err) {
    console.error("Failed to serve image from S3:", err);
    res.status(404).send("Image not found");
  }
});

export default router;
