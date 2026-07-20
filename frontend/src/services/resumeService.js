import aiApi from "./aiApi.js";

/**
 * POST /api/resume/analyze
 */
export async function analyzeResume(
  file,
  {
    jobId = null,
    latitude = null,
    longitude = null,
    radiusKm = null,
    onProgress = null,
  } = {}
) {
  const formData = new FormData();

  formData.append("file", file);

  if (jobId) {
    formData.append("jobId", jobId);
  }

  if (
    latitude !== null &&
    latitude !== undefined &&
    Number.isFinite(Number(latitude))
  ) {
    formData.append("latitude", String(latitude));
  }

  if (
    longitude !== null &&
    longitude !== undefined &&
    Number.isFinite(Number(longitude))
  ) {
    formData.append("longitude", String(longitude));
  }

  if (
    radiusKm !== null &&
    radiusKm !== undefined &&
    Number.isFinite(Number(radiusKm))
  ) {
    formData.append("radiusKm", String(radiusKm));
  }

  const response = await aiApi.post(
    "/resume/analyze",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },

      onUploadProgress: onProgress
        ? (event) => {
            if (!event.total) return;

            const percentage = Math.round(
              (event.loaded / event.total) * 100
            );

            onProgress(percentage);
          }
        : undefined,
    }
  );

  return response.data;
}
