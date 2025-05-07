import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import express_prom_bundle from "express-prom-bundle";

import wishlistRoutes from "./wishlist/wishlist.routes";
import { healthCheckService } from './wishlist/services/healthCheck.service';

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true,
});

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.use('/api/wishlist', wishlistRoutes);

app.get("/", (req, res) => {
  return res.status(200).send("Wishlist Microservice is running!");
});

app.get("/health", async (req, res) => {
  const response = await healthCheckService();
  return res.status(response.status).json(response.data);
});

const PORT = process.env.PORT || 8004;
app.listen(PORT, () => {
  console.log(`🚀 Wishlist Microservice has started on port ${PORT}`);
});
