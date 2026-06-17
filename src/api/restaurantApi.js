import { apiClient } from "./index";

function unwrapData(response) {
  return response?.data || response;
}

export async function uploadRestaurantFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  return unwrapData(await apiClient.post("/api/owner/files", formData));
}

export async function fetchRestaurants({ page = 0, size = 20, keyword, category, exposureStatus } = {}) {
  return apiClient.get("/api/owner/stores", {
    query: {
      page,
      size,
      keyword,
      category,
      exposureStatus,
    },
  });
}

export async function fetchRestaurantDetail(restaurantId) {
  return apiClient.get(`/api/owner/stores/${restaurantId}`);
}

export async function createRestaurant(payload) {
  return unwrapData(await apiClient.post("/api/owner/stores", payload));
}

export async function updateRestaurant(restaurantId, payload) {
  return unwrapData(await apiClient.put(`/api/owner/stores/${restaurantId}`, payload));
}

export async function deleteRestaurant(restaurantId) {
  return unwrapData(await apiClient.delete(`/api/owner/stores/${restaurantId}`));
}
