import { apiClient } from "./index";

function unwrapData(response) {
  return response?.data || response;
}

export async function uploadRestaurantFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  return unwrapData(await apiClient.post("/api/admin/files", formData));
}

export async function fetchRestaurants({ page = 0, size = 20, keyword, category, exposureStatus } = {}) {
  return apiClient.get("/api/admin/restaurants", {
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
  return apiClient.get(`/api/admin/restaurants/${restaurantId}`);
}

export async function createRestaurant(payload) {
  return unwrapData(await apiClient.post("/api/admin/restaurants", payload));
}

export async function updateRestaurant(restaurantId, payload) {
  return unwrapData(await apiClient.put(`/api/admin/restaurants/${restaurantId}`, payload));
}

export async function deleteRestaurant(restaurantId) {
  return unwrapData(await apiClient.delete(`/api/admin/restaurants/${restaurantId}`));
}
