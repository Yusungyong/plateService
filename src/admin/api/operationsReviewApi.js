import { apiClient } from "../../api";
import { unwrapAdminResponse } from "./adminApiUtils";
export async function getOperationsReviews(scope, target = "menu", options = {}) {
  return unwrapAdminResponse(
    await apiClient.get("/api/admin/operations/reviews", { ...options, query: { scope, target } })
  );
}
export async function saveOperationsReview(value, options = {}) {
  return unwrapAdminResponse(await apiClient.post("/api/admin/operations/reviews", value, options));
}
