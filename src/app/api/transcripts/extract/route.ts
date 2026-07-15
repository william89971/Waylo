import { z } from "zod";
import { academicAIProvider, AIConfigurationError, AIWorkflowError, type TranscriptInput } from "@/lib/ai/provider";
import { beginLiveRequest, LiveDemoError, type LiveAIRequestContext, type LiveRequestLease } from "@/lib/ai/live-demo";
import { TranscriptIngestionEventSchema, type TranscriptExtraction, type TranscriptIngestionEvent } from "@/lib/domain";
import { seededTranscriptExtraction } from "@/lib/fixtures";
import { createRequestId, jsonWithRequestId, logSanitizedRequest, readLimitedFormData, readLimitedJson, RequestSafetyError } from "@/lib/server/request-safety";
import { TranscriptLimitError, validateTranscriptFile, validateTranscriptText } from "@/lib/server/transcript-limits";

export const runtime = "nodejs";

const JsonRequestSchema = z.object({
  mode: z.enum(["seeded", "live"]).default("seeded"),
  text: z.string().min(1),
}).strict();
const supportedTypes = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);
const encoder = new TextEncoder();

interface PreparedRequest { mode: "seeded" | "live"; input?: TranscriptInput }

function isUploadedFile(item: FormDataEntryValue): item is File {
  return typeof item !== "string" && typeof item.arrayBuffer === "function" && typeof item.size === "number" && typeof item.type === "string";
}

function statusFor(error: unknown) {
  if (error instanceof LiveDemoError || error instanceof RequestSafetyError) return error.status;
  if (error instanceof TranscriptLimitError) return error.code.includes("limit") || error.code.includes("too_large") ? 413 : 400;
  return 400;
}

function codeFor(error: unknown) {
  if (error instanceof LiveDemoError || error instanceof RequestSafetyError || error instanceof TranscriptLimitError) return error.code;
  if (error instanceof AIConfigurationError) return "unavailable";
  if (error instanceof AIWorkflowError) return error.category;
  return "invalid_request";
}

function safeMessage(error: unknown) {
  if (error instanceof LiveDemoError || error instanceof RequestSafetyError || error instanceof TranscriptLimitError || error instanceof AIConfigurationError || error instanceof AIWorkflowError) return error.message;
  return "The transcript request could not be processed.";
}

async function prepare(request: Request): Promise<PreparedRequest> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await readLimitedJson(request, JsonRequestSchema);
    return { mode: body.mode, input: { kind: "text", text: validateTranscriptText(body.text) } };
  }

  const form = await readLimitedFormData(request);
  const mode = form.get("mode") === "live" ? "live" : "seeded";
  const text = form.get("text");
  const files = form.getAll("file").filter((item): item is File => isUploadedFile(item) && item.size > 0);
  if (files.length > 1) throw new TranscriptLimitError("transcript_file_count", "Upload only one transcript image or PDF.");
  if (typeof text === "string" && text.trim()) {
    if (files.length) throw new TranscriptLimitError("transcript_input_count", "Send transcript text or one file, not both.");
    return { mode, input: { kind: "text", text: validateTranscriptText(text) } };
  }
  const file = files[0];
  if (!file) throw new TranscriptLimitError("transcript_required", "A transcript text or file is required.");
  if (!supportedTypes.has(file.type)) throw new TranscriptLimitError("transcript_file_type", "Use a PDF, PNG, JPEG, or WebP file.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  validateTranscriptFile(bytes, file.type);
  if (mode === "seeded") return { mode };
  const filename = file.type === "application/pdf" ? "transcript.pdf" : file.type === "image/png" ? "transcript.png" : file.type === "image/jpeg" ? "transcript.jpg" : "transcript.webp";
  return { mode, input: { kind: "file", filename, mimeType: file.type, dataBase64: Buffer.from(bytes).toString("base64") } };
}

async function runExtraction(prepared: PreparedRequest, liveContext?: LiveAIRequestContext): Promise<{ mode: "seeded" | "live"; extraction: TranscriptExtraction; fallback?: string }> {
  if (prepared.mode === "seeded") return { mode: "seeded", extraction: seededTranscriptExtraction };
  if (!prepared.input || !liveContext) throw new AIConfigurationError();
  try {
    return { mode: "live", extraction: await academicAIProvider.extractTranscript(prepared.input, liveContext) };
  } catch (error) {
    if (!(error instanceof AIConfigurationError) && !(error instanceof AIWorkflowError)) throw error;
    return { mode: "seeded", extraction: seededTranscriptExtraction, fallback: codeFor(error) };
  }
}

function progress(stage: Extract<TranscriptIngestionEvent, { type: "progress" }>["stage"], status: "active" | "complete" | "review", label: string, detail: string, mode: "seeded" | "live"): TranscriptIngestionEvent {
  return { type: "progress", stage, status, label, detail, mode };
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();
  const ndjson = request.headers.get("accept")?.includes("application/x-ndjson") ?? false;
  let lease: LiveRequestLease | undefined;
  let mode: "seeded" | "live" = "seeded";
  try {
    const prepared = await prepare(request);
    mode = prepared.mode;
    if (mode === "live") lease = beginLiveRequest(request, "transcript", requestId);

    if (!ndjson) {
      try {
        const result = await runExtraction(prepared, lease?.context);
        const outcome = result.fallback ? "fallback" : "complete";
        logSanitizedRequest({ requestId, endpoint: "transcript", mode, outcome, category: result.fallback, durationMs: Date.now() - startedAt });
        return jsonWithRequestId({ mode: result.mode, extraction: result.extraction }, requestId, result.fallback ? { headers: { "X-Waylo-Fallback": result.fallback } } : undefined);
      } finally {
        lease?.release();
      }
    }

    const activeLease = lease;
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (event: TranscriptIngestionEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(TranscriptIngestionEventSchema.parse(event))}\n`));
        let fallback: string | undefined;
        try {
          send(progress("reading_document", "active", "Reading document", prepared.mode === "seeded" ? "Playing a sanitized recorded document boundary." : "Loading the supplied document in temporary request memory.", prepared.mode));
          send(progress("reading_document", "complete", "Document ready", "The upload will not be retained after this request.", prepared.mode));
          send(progress("extracting_courses", "active", "Extracting courses", "Identifying only course records visible in the supplied evidence.", prepared.mode));
          const result = await runExtraction(prepared, activeLease?.context);
          fallback = result.fallback;
          if (fallback) send(progress("extracting_courses", "review", "Live extraction unavailable", "Waylo immediately continued with the labeled recorded extraction.", "seeded"));
          const extraction = result.extraction;
          send(progress("extracting_courses", "complete", "Courses extracted", `${extraction.courses.length} course rows were returned for student review.`, result.mode));
          send(progress("flagging_uncertain_text", extraction.reviewFlags.length ? "review" : "complete", "Flagging uncertain text", `${extraction.reviewFlags.length} item${extraction.reviewFlags.length === 1 ? "" : "s"} need attention.`, result.mode));
          send(progress("matching_known_courses", "complete", "Matching known courses", `${extraction.courses.filter((course) => course.normalizedCourseId).length} rows match the bounded College of the Canyons catalog.`, result.mode));
          send(progress("reviewing_with_student", "active", "Reviewing with the student", "Nothing is saved until the student confirms these normalized rows.", result.mode));
          send({ type: "result", mode: result.mode, extraction });
          logSanitizedRequest({ requestId, endpoint: "transcript", mode, outcome: fallback ? "fallback" : "complete", category: fallback, durationMs: Date.now() - startedAt });
        } catch (error) {
          const code = codeFor(error);
          send({ type: "error", code, message: safeMessage(error), seededModeAvailable: true });
          logSanitizedRequest({ requestId, endpoint: "transcript", mode, outcome: "rejected", category: code, durationMs: Date.now() - startedAt });
        } finally {
          activeLease?.release();
          controller.close();
        }
      },
    });
    return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "X-Waylo-Request-Id": requestId } });
  } catch (error) {
    lease?.release();
    const code = codeFor(error);
    logSanitizedRequest({ requestId, endpoint: "transcript", mode, outcome: "rejected", category: code, durationMs: Date.now() - startedAt });
    return jsonWithRequestId({ error: code, message: safeMessage(error), seededModeAvailable: true }, requestId, { status: statusFor(error) });
  }
}
