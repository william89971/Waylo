export const TRANSCRIPT_TEXT_MAX_CHARACTERS = 12_000;
export const TRANSCRIPT_FILE_MAX_BYTES = 2 * 1024 * 1024;
export const TRANSCRIPT_IMAGE_MAX_PIXELS = 4_200_000;
export const TRANSCRIPT_PDF_MAX_PAGES = 2;

export class TranscriptLimitError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "TranscriptLimitError";
  }
}

function pngDimensions(bytes: Uint8Array) {
  if (bytes.byteLength < 24 || ![137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function jpegDimensions(bytes: Uint8Array) {
  if (bytes.byteLength < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let offset = 2;
  while (offset + 8 < bytes.byteLength) {
    if (bytes[offset] !== 0xff) { offset += 1; continue; }
    const marker = bytes[offset + 1];
    const standalone = marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7);
    if (standalone) { offset += 2; continue; }
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + length + 2 > bytes.byteLength) return null;
    if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
      return { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
    }
    offset += length + 2;
  }
  return null;
}

function webpDimensions(bytes: Uint8Array) {
  const ascii = (start: number, length: number) => String.fromCharCode(...bytes.slice(start, start + length));
  if (bytes.byteLength < 30 || ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WEBP") return null;
  const chunk = ascii(12, 4);
  if (chunk === "VP8X") {
    return {
      width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16),
      height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16),
    };
  }
  if (chunk === "VP8 " && bytes.byteLength >= 30) {
    return { width: (bytes[26] | (bytes[27] << 8)) & 0x3fff, height: (bytes[28] | (bytes[29] << 8)) & 0x3fff };
  }
  if (chunk === "VP8L" && bytes.byteLength >= 25 && bytes[20] === 0x2f) {
    const bits = bytes[21] | (bytes[22] << 8) | (bytes[23] << 16) | (bytes[24] << 24);
    return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
  }
  return null;
}

function countPdfPages(bytes: Uint8Array) {
  const text = new TextDecoder("latin1").decode(bytes);
  if (!text.startsWith("%PDF-")) return 0;
  return text.match(/\/Type\s*\/Page\b/g)?.length ?? 0;
}

export function validateTranscriptText(text: string) {
  const normalized = text.trim();
  if (!normalized) throw new TranscriptLimitError("transcript_required", "Transcript text is required.");
  if (normalized.length > TRANSCRIPT_TEXT_MAX_CHARACTERS) {
    throw new TranscriptLimitError("transcript_text_too_large", `Transcript text is limited to ${TRANSCRIPT_TEXT_MAX_CHARACTERS.toLocaleString()} characters.`);
  }
  return normalized;
}

export function validateTranscriptFile(bytes: Uint8Array, mimeType: string) {
  if (bytes.byteLength > TRANSCRIPT_FILE_MAX_BYTES) {
    throw new TranscriptLimitError("transcript_file_too_large", "Transcript files are limited to 2 MB.");
  }
  if (mimeType === "application/pdf") {
    const pages = countPdfPages(bytes);
    if (pages < 1 || pages > TRANSCRIPT_PDF_MAX_PAGES) {
      throw new TranscriptLimitError("pdf_page_limit", "Use a readable PDF with no more than two pages.");
    }
    return { kind: "pdf" as const, pages };
  }
  const dimensions = mimeType === "image/png" ? pngDimensions(bytes) : mimeType === "image/jpeg" ? jpegDimensions(bytes) : mimeType === "image/webp" ? webpDimensions(bytes) : null;
  if (!dimensions || dimensions.width < 1 || dimensions.height < 1) {
    throw new TranscriptLimitError("image_dimensions_unavailable", "Use a readable PNG, JPEG, or WebP image.");
  }
  if (dimensions.width * dimensions.height > TRANSCRIPT_IMAGE_MAX_PIXELS) {
    throw new TranscriptLimitError("image_pixel_limit", "Transcript images are limited to approximately four megapixels.");
  }
  return { kind: "image" as const, ...dimensions };
}
