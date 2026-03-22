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
