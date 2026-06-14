// src/app.js
import express from "express";
import cors from "cors";
import apiRoutes from "./routes/api.routes.js";
import disposeRoutes from "./routes/dispose.routes.js";
import warehouseRoutes from "../warehouse/routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

// Enable Cross-Origin Resource Sharing
app.use(cors());

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve frontend static assets from public/ folder
app.use(express.static("public"));

// Mount API routes directly at root level
app.use("/", apiRoutes);
app.use("/", disposeRoutes);
app.use("/", warehouseRoutes);

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Register global error handler middleware (must be registered last)
app.use(errorHandler);

export default app;
