import { z } from "zod";
import { academicAIProvider, AIConfigurationError, AIWorkflowError } from "@/lib/ai/provider";
import { seededTranscriptExtraction } from "@/lib/fixtures";

export const runtime = "nodejs";

const JsonRequestSchema = z.object({
  mode: z.enum(["seeded", "live"]).default("seeded"),
  text: z.string().trim().min(1).max(80_000),
});
const supportedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

function errorResponse(error: unknown) {
  if (error instanceof AIConfigurationError) return Response.json({ error: "missing_key", message: error.message, seededModeAvailable: true }, { status: 503 });
  if (error instanceof AIWorkflowError) return Response.json({ error: error.category, message: error.message, seededModeAvailable: true }, { status: error.category === "rate_limit" ? 429 : 502 });
  return Response.json({ error: "invalid_request", message: "The transcript request could not be processed.", seededModeAvailable: true }, { status: 400 });
}

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = JsonRequestSchema.parse(await request.json());
      if (body.mode === "seeded") return Response.json({ mode: "seeded", extraction: seededTranscriptExtraction });
      const extraction = await academicAIProvider.extractTranscript({ kind: "text", text: body.text });
      return Response.json({ mode: "live", extraction });
    }

    const form = await request.formData();
    const mode = form.get("mode") === "live" ? "live" : "seeded";
    if (mode === "seeded") return Response.json({ mode: "seeded", extraction: seededTranscriptExtraction });
    const text = form.get("text");
    if (typeof text === "string" && text.trim()) {
      const extraction = await academicAIProvider.extractTranscript({ kind: "text", text: z.string().trim().min(1).max(80_000).parse(text) });
      return Response.json({ mode: "live", extraction });
    }
    const file = form.get("file");
    if (!(file instanceof File)) throw new Error("A transcript text or file is required.");
    if (!supportedTypes.has(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Use a PDF, PNG, JPEG, or WebP file up to 8 MB.");
    const dataBase64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const extraction = await academicAIProvider.extractTranscript({ kind: "file", filename: file.name, mimeType: file.type, dataBase64 });
    return Response.json({ mode: "live", extraction });
  } catch (error) {
    return errorResponse(error);
  }
}
