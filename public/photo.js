// Shrink a photo in the browser before it is sent: at most 1,600 px on the longest side, as a JPEG.
// A phone photo is several megabytes; the notice is just as readable at this size and sends in a moment.

const MAX_SIDE = 1600;
export const MAX_FILE_BYTES = 12 * 1024 * 1024;

/** @param {Blob} file @returns {Promise<string>} a JPEG data URL */
export async function shrinkPhoto(file) {
  if (!file || !/^image\//.test(file.type || "")) throw new Error("not-an-image");
  if (file.size > MAX_FILE_BYTES) throw new Error("too-big");
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("unreadable-format");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // a transparent PNG would turn black as a JPEG
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.86);
}
