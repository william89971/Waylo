import type { z } from "zod";
import { ApiError } from "@/lib/server/api-errors";

export async function parseJson<TSchema extends z.ZodType>(request: Request, schema: TSchema): Promise<z.infer<TSchema>> {
  try {
    return schema.parse(await request.json());
  } catch {
    throw new ApiError("invalid_request", "Check the submitted information and try again.", 400);
  }
}
