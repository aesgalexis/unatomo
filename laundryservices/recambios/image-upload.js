const MAX_FILE_BYTES = 8 * 1024 * 1024;
const MAX_PREPARED_IMAGE_BYTES = 2.5 * 1024 * 1024;
const MAX_TOTAL_PREPARED_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function setupImageInput({ input, preview, error, translate, onChange }) {
  let urls = [];

  input.addEventListener("change", () => {
    urls.forEach(URL.revokeObjectURL);
    urls = [];
    preview.replaceChildren();
    error.hidden = true;
    const files = Array.from(input.files || []);
    let message = "";
    if (files.length > 4) message = translate("images_too_many");
    else if (files.some((file) => file.size > MAX_FILE_BYTES)) message = translate("image_too_large");
    else if (files.some((file) => !ACCEPTED_TYPES.has(file.type))) message = translate("image_wrong_type");
    if (message) {
      input.value = "";
      error.textContent = message;
      error.hidden = false;
      return;
    }
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      urls.push(url);
      const figure = document.createElement("figure");
      figure.className = "image-preview";
      const image = document.createElement("img");
      image.src = url;
      image.alt = file.name;
      figure.append(image);
      preview.append(figure);
    });
    onChange();
  });
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image-load-failed"));
    };
    image.src = url;
  });
}

function canvasToBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("image-compression-failed"));
    }, "image/jpeg", quality);
  });
}

async function prepareImage(file, index) {
  if (file.size <= MAX_PREPARED_IMAGE_BYTES) {
    return { blob: file, name: file.name, type: file.type };
  }
  const image = await loadImage(file);
  const maxDimension = 2200;
  const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas-unavailable");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  let blob = await canvasToBlob(canvas, 0.84);
  if (blob.size > MAX_PREPARED_IMAGE_BYTES) blob = await canvasToBlob(canvas, 0.68);
  if (blob.size > MAX_PREPARED_IMAGE_BYTES) throw new Error("images-too-large");
  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]/g, "-");
  return {
    blob,
    name: `${baseName || `placa-${index + 1}`}.jpg`,
    type: "image/jpeg",
  };
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error || new Error("file-read-failed"));
    reader.readAsDataURL(blob);
  });
}

export async function prepareImages(input) {
  const files = Array.from(input.files || []);
  const prepared = await Promise.all(files.map(prepareImage));
  const totalBytes = prepared.reduce((sum, image) => sum + image.blob.size, 0);
  if (totalBytes > MAX_TOTAL_PREPARED_BYTES) throw new Error("images-too-large");
  return Promise.all(prepared.map(async (image) => ({
    name: image.name,
    type: image.type,
    content: await blobToBase64(image.blob),
  })));
}
