import { apiClient } from "./index";
import { unwrapAdminResponse } from "../admin/api/adminApiUtils";

export async function fetchQna({ category, statusCode, page = 0, size = 10, adminMode = false } = {}) {
  const response = await apiClient.get(adminMode ? "/api/admin/qna" : "/api/qna", {
    query: {
      category,
      statusCode,
      page,
      size,
    },
    withAuth: adminMode,
  });
  return adminMode ? unwrapAdminResponse(response) : response;
}

export async function fetchQnaDetail(qnaId) {
  return apiClient.get(`/api/qna/${qnaId}`, {
    withAuth: false,
  });
}

export async function createQna(payload) {
  return apiClient.post("/api/qna", payload, {
    withAuth: false,
  });
}

export async function updateQna(qnaId, payload, adminMode = false) {
  const response = await apiClient.patch(`${adminMode ? "/api/admin/qna" : "/api/qna"}/${qnaId}`, payload);
  return adminMode ? unwrapAdminResponse(response) : response;
}
