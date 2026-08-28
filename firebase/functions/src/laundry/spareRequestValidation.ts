import {HttpsError} from "firebase-functions/v2/https";
import {
  ImageInput,
  LaundryLanguage,
  SpareRequest,
} from "./spareRequestTypes";

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_TOTAL_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const LANGUAGES = new Set<LaundryLanguage>(["es", "en", "it", "el"]);

export const clean = (value: unknown, max: number) =>
  (value || "").toString().trim().replace(/\s+/g, " ").slice(0, max);

const cleanMultiline = (value: unknown, max: number) =>
  (value || "").toString().trim().replace(/\r\n/g, "\n").slice(0, max);

export const escapeHtml = (value: unknown) => (value || "").toString()
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;")
  .replace(/'/g, "&#039;");

const normalizeEmail = (value: unknown) => clean(value, 320).toLowerCase();
const isEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizeLanguage = (value: unknown): LaundryLanguage => {
  const normalized = clean(value, 2).toLowerCase() as LaundryLanguage;
  return LANGUAGES.has(normalized) ? normalized : "es";
};

const normalizeImageName = (value: unknown, index: number) => {
  const fallback = `placa-${index + 1}.jpg`;
  const name = clean(value, 120).replace(/[^a-zA-Z0-9._-]/g, "-");
  return name && !name.startsWith(".") ? name : fallback;
};

export const normalizeRequest = (
  data: Record<string, unknown>,
): SpareRequest => ({
  submissionId: clean(data.submissionId, 80),
  language: normalizeLanguage(data.language),
  manufacturer: clean(data.manufacturer, 120),
  allianceBrand: clean(data.allianceBrand, 120),
  category: clean(data.category, 120),
  model: clean(data.model, 160),
  spareName: clean(data.spareName, 200),
  partReference: clean(data.partReference, 160),
  quantity: Math.min(99, Math.max(1, Number(data.quantity) || 1)),
  description: cleanMultiline(data.description, 3000),
  contactName: clean(data.contactName, 160),
  email: normalizeEmail(data.email),
  phone: clean(data.phone, 80),
  legalName: clean(data.legalName, 200),
  taxId: clean(data.taxId, 80),
  country: clean(data.country, 120),
  fiscalAddress: clean(data.fiscalAddress, 240),
  postalCode: clean(data.postalCode, 40),
  city: clean(data.city, 120),
  province: clean(data.province, 120),
  privacyAccepted: data.privacyAccepted === true,
  images: Array.isArray(data.images) ? data.images.map((image, index) => {
    const candidate = image && typeof image === "object" ?
      image as Record<string, unknown> : {};
    return {
      name: normalizeImageName(candidate.name, index),
      type: clean(candidate.type, 80).toLowerCase(),
      content: (candidate.content || "").toString(),
    };
  }) : [],
});

export const assertRequiredFields = (request: SpareRequest) => {
  const required = [
    request.submissionId,
    request.manufacturer,
    request.category,
    request.model,
    request.spareName,
    request.contactName,
    request.email,
    request.legalName,
    request.taxId,
    request.country,
    request.fiscalAddress,
    request.postalCode,
    request.city,
  ];
  if (required.some((value) => !value) || !request.privacyAccepted) {
    throw new HttpsError("invalid-argument", "required-fields-missing");
  }
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(request.submissionId) ||
      !isEmail(request.email)) {
    throw new HttpsError("invalid-argument", "invalid-request-data");
  }
};

const hasExpectedSignature = (buffer: Buffer, type: string) => {
  if (type === "image/jpeg") {
    return buffer.length >= 3 && buffer[0] === 0xff &&
      buffer[1] === 0xd8 && buffer[2] === 0xff;
  }
  if (type === "image/png") {
    return buffer.length >= 8 &&
      buffer.subarray(0, 8).equals(Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]));
  }
  return buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP";
};

export const validateImages = (images: ImageInput[]) => {
  if (!images.length || images.length > MAX_IMAGES) {
    throw new HttpsError("invalid-argument", "invalid-image-count");
  }
  let totalBytes = 0;
  images.forEach((image) => {
    const maxBase64Length = Math.ceil(MAX_IMAGE_BYTES / 3) * 4 + 4;
    if (!ALLOWED_IMAGE_TYPES.has(image.type) ||
        !image.content || image.content.length > maxBase64Length ||
        !/^[a-zA-Z0-9+/]+={0,2}$/.test(image.content)) {
      throw new HttpsError("invalid-argument", "invalid-image");
    }
    const buffer = Buffer.from(image.content, "base64");
    if (!buffer.length || buffer.length > MAX_IMAGE_BYTES ||
        !hasExpectedSignature(buffer, image.type)) {
      throw new HttpsError("invalid-argument", "invalid-image");
    }
    totalBytes += buffer.length;
  });
  if (totalBytes > MAX_TOTAL_IMAGE_BYTES) {
    throw new HttpsError("invalid-argument", "images-too-large");
  }
};
