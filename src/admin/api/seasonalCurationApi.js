import { apiClient } from "../../api";
import { unwrapAdminResponse } from "./adminApiUtils";

export async function getSeasonalCurations({ page = 0, size = 20, status = "" } = {}) {
  const response = await apiClient.get("/api/admin/seasonal-curations", {
    query: { page, size, status },
  });
  const payload = unwrapAdminResponse(response) || {};

  return {
    content: Array.isArray(payload.content) ? payload.content : [],
    page: Number(payload.page || 0),
    size: Number(payload.size || size),
    totalElements: Number(payload.totalElements || 0),
    totalPages: Math.max(1, Number(payload.totalPages || 1)),
    hasNext: Boolean(payload.hasNext),
  };
}

export async function getSeasonalCuration(id) {
  return unwrapAdminResponse(await apiClient.get(`/api/admin/seasonal-curations/${id}`));
}

export async function createSeasonalCuration(command) {
  return unwrapAdminResponse(await apiClient.post("/api/admin/seasonal-curations", command));
}

export async function uploadSeasonalCurationFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  return unwrapAdminResponse(
    await apiClient.post("/api/admin/seasonal-curations/files", formData)
  );
}

export async function updateSeasonalCuration(id, command) {
  return unwrapAdminResponse(await apiClient.put(`/api/admin/seasonal-curations/${id}`, command));
}

export async function deleteSeasonalCuration(id, version) {
  return unwrapAdminResponse(
    await apiClient.delete(`/api/admin/seasonal-curations/${id}`, {
      query: { version },
    })
  );
}

export async function publishSeasonalCuration(id, version) {
  return unwrapAdminResponse(
    await apiClient.post(`/api/admin/seasonal-curations/${id}/publish`, { version })
  );
}

export async function reorderSeasonalCurations(items) {
  return unwrapAdminResponse(
    await apiClient.patch("/api/admin/seasonal-curations/order", { items })
  );
}

export async function importSeasonalFoods() {
  return unwrapAdminResponse(await apiClient.post("/api/admin/seasonal-curations/import-foods", {}));
}
