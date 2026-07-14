import { z } from "zod";
import { academicAIProvider, AIConfigurationError, AIWorkflowError, type TranscriptInput } from "@/lib/ai/provider";
import { seededTranscriptExtraction } from "@/lib/fixtures";
import { TranscriptIngestionEventSchema, type TranscriptExtraction, type TranscriptIngestionEvent } from "@/lib/domain";

export const runtime = "nodejs";

const JsonRequestSchema = z.object({ mode: z.enum(["seeded", "live"]).default("seeded"), text: z.string().trim().min(1).max(80_000) });
const supportedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const encoder = new TextEncoder();

interface PreparedRequest { mode: "seeded" | "live"; input?: TranscriptInput }

function errorPayload(error: unknown) {
  if (error instanceof AIConfigurationError) return { status: 503, code: "missing_key", message: error.message };
  if (error instanceof AIWorkflowError) return { status: error.category === "rate_limit" ? 429 : 502, code: error.category, message: error.message };
  return { status: 400, code: "invalid_request", message: error instanceof Error ? error.message : "The transcript request could not be processed." };
}

async function prepare(request: Request): Promise<PreparedRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = JsonRequestSchema.parse(await request.json());
    return { mode: body.mode, input: { kind: "text", text: body.text } };
  }
  const form = await request.formData();
  const mode = form.get("mode") === "live" ? "live" : "seeded";
  const text = form.get("text");
  if (typeof text === "string" && text.trim()) return { mode, input: { kind: "text", text: z.string().trim().min(1).max(80_000).parse(text) } };
  const file = form.get("file");
  if (!(file instanceof File)) throw new Error("A transcript text or file is required.");
  if (!supportedTypes.has(file.type) || file.size > 8 * 1024 * 1024) throw new Error("Use a PDF, PNG, JPEG, or WebP file up to 8 MB.");
  if (mode === "seeded") return { mode };
  return { mode, input: { kind: "file", filename: file.name, mimeType: file.type, dataBase64: Buffer.from(await file.arrayBuffer()).toString("base64") } };
}

async function extract(prepared: PreparedRequest): Promise<TranscriptExtraction> {
  if (prepared.mode === "seeded") return seededTranscriptExtraction;
  if (!prepared.input) throw new Error("A transcript input is required for live mode.");
  return academicAIProvider.extractTranscript(prepared.input);
}

function progress(stage: Extract<TranscriptIngestionEvent, { type: "progress" }>["stage"], status: "active" | "complete" | "review", label: string, detail: string, mode: PreparedRequest["mode"]): TranscriptIngestionEvent {
  return { type: "progress", stage, status, label, detail, mode };
}

export async function POST(request: Request) {
  const ndjson = request.headers.get("accept")?.includes("application/x-ndjson") ?? false;
  try {
    const prepared = await prepare(request);
    if (!ndjson) return Response.json({ mode: prepared.mode, extraction: await extract(prepared) });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: TranscriptIngestionEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(TranscriptIngestionEventSchema.parse(event))}\n`));
        try {
          send(progress("reading_document", "active", "Reading document", prepared.mode === "seeded" ? "Playing a sanitized recorded document boundary." : "Loading the supplied document in temporary request memory.", prepared.mode));
          send(progress("reading_document", "complete", "Document ready", "The upload will not be retained after this request.", prepared.mode));
          send(progress("extracting_courses", "active", "Extracting courses", "Identifying only course records visible in the supplied evidence.", prepared.mode));
          const extraction = await extract(prepared);
          send(progress("extracting_courses", "complete", "Courses extracted", `${extraction.courses.length} course rows were returned for student review.`, prepared.mode));
          send(progress("flagging_uncertain_text", extraction.reviewFlags.length ? "review" : "complete", "Flagging uncertain text", `${extraction.reviewFlags.length} item${extraction.reviewFlags.length === 1 ? "" : "s"} need attention.`, prepared.mode));
          send(progress("matching_known_courses", "complete", "Matching known courses", `${extraction.courses.filter((course) => course.normalizedCourseId).length} rows match the bounded College of the Canyons catalog.`, prepared.mode));
          send(progress("reviewing_with_student", "active", "Reviewing with the student", "Nothing is saved until the student confirms these normalized rows.", prepared.mode));
          send({ type: "result", mode: prepared.mode, extraction });
        } catch (error) {
          const payload = errorPayload(error);
          send({ type: "error", code: payload.code, message: payload.message, seededModeAvailable: true });
        } finally { controller.close(); }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) {
    const payload = errorPayload(error);
    return Response.json({ error: payload.code, message: payload.message, seededModeAvailable: true }, { status: payload.status });
  }
}
