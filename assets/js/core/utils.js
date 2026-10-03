export function parseJsonArray(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed;
    } catch (_error) {
      // Dữ liệu cũ không hợp lệ được đưa về mảng rỗng để giao diện vẫn hoạt động.
    }
  }

  return [];
}

export function parseJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch (_error) {
      // Dữ liệu cũ không hợp lệ được đưa về object rỗng.
    }
  }

  return {};
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function getPublicStoragePath(publicUrl, bucketName) {
  if (!publicUrl) return null;

  const marker = `/storage/v1/object/public/${bucketName}/`;
  const markerIndex = publicUrl.indexOf(marker);
  if (markerIndex === -1) return null;

  return decodeURIComponent(
    publicUrl.slice(markerIndex + marker.length).split("?")[0],
  );
}

export function parseVietnameseDate(value) {
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(value)) return null;

  const [day, month, year] = value.split("/").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    year >= 1900 &&
    year <= new Date().getFullYear();

  if (!isValid) return null;

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatExamDuration(seconds, compact = false) {
  const duration = Number(seconds);
  if (!Number.isFinite(duration) || duration < 0) return "Chưa ghi nhận";

  const rounded = Math.round(duration);
  const hours = Math.floor(rounded / 3600);
  const minutes = Math.floor((rounded % 3600) / 60);
  const remainingSeconds = rounded % 60;

  if (compact) {
    if (hours > 0) return `${hours}g ${minutes}p`;
    return `${minutes}p ${String(remainingSeconds).padStart(2, "0")}s`;
  }

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}
