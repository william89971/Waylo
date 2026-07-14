import { NextResponse } from "next/server";
import { z } from "zod";
import { RouteCandidateSchema } from "@/lib/domain";
import { programById } from "@/lib/academic-data";
import { compareControlledRequirementVersions } from "@/lib/requirement-change-detector";

const RequestSchema = z.object({
  pathwayId: z.string(),
  activeRoute: RouteCandidateSchema.optional(),
}).strict();

export async function POST(request: Request) {
  try {
    const input = RequestSchema.parse(await request.json());
    if (!programById.has(input.pathwayId)) return NextResponse.json({ error: "unsupported_pathway" }, { status: 400 });
    return NextResponse.json(compareControlledRequirementVersions(input.pathwayId, input.activeRoute));
  } catch (error) {
    return NextResponse.json({ error: "invalid_request", message: error instanceof Error ? error.message : "Invalid request" }, { status: 400 });
  }
}
