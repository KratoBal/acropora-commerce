import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { FoxpostPickupPointsService } from "../../../../services/foxpost-pickup-points";

const foxpostPickupPoints = new FoxpostPickupPointsService();

export const GET = async (_req: MedusaRequest, res: MedusaResponse) => {
  const availability = await foxpostPickupPoints.getAvailability();

  const status =
    availability.available || availability.reason === "missing_configuration"
      ? 200
      : 503;

  res.status(status).json(availability);
};
