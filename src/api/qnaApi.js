import { apiClient } from "./index";

export async function fetchQna({ category, statusCode, page = 0, size = 10 } = {}) {
  return apiClient.get("/api/qna", {
    query: {
      category,
      statusCode,
      page,
      size,
    },
    withAuth: false,
  });
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

export async function updateQna(qnaId, payload) {
  return apiClient.patch(`/api/qna/${qnaId}`, payload);
}
