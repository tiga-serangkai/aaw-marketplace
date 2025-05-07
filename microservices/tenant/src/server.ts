import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import express_prom_bundle from "express-prom-bundle";

import tenantRoutes from './tenant/tenant.routes';
import { healthCheckService } from './tenant/services/healthCheck.service';

const metricsMiddleware = express_prom_bundle({
  includeMethod: true,
  includePath: true,
  includeStatusCode: true,
  includeUp: true
})

const app = express();
app.use(metricsMiddleware);
app.use(cors());
app.use(express.json());

app.use("/api/tenant", tenantRoutes);

app.get("/", (req, res) => {
  return res.status(200).send("Tenant Microservice is running!");
});

app.get("/health", async (req, res) => {
  const response = await healthCheckService();
  return res.status(response.status).json(response.data);
});

const PORT = process.env.PORT || 8003;
app.listen(PORT, () => {
  console.log(`🚀 Tenant Microservice has started on port ${PORT}`);
});
