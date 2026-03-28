import { apiClient } from "./index";

export async function fetchFaqs({ category, keyword, page = 0, size = 10 } = {}) {
  return apiClient.get("/api/faqs", {
    query: {
      category,
      keyword,
      page,
      size,
    },
  });
}

export async function fetchFaqDetail(faqId) {
  return apiClient.get(`/api/faqs/${faqId}`);
}

export async function createFaq(payload) {
  return apiClient.post("/api/faqs", payload);
}

export async function updateFaq(faqId, payload) {
  return apiClient.patch(`/api/faqs/${faqId}`, payload);
}

export async function deleteFaq(faqId) {
  return apiClient.delete(`/api/faqs/${faqId}`);
}
