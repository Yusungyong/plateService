import { apiClient } from "../../api";
import { unwrapAdminResponse } from "./adminApiUtils";
const ROOT = "/api/admin/feeds";
export async function getAdminFeeds(query = {}, options = {}) {
  return unwrapAdminResponse(
    await apiClient.get(ROOT, { ...options, query: { page: 0, size: 20, ...query } })
  );
}
export async function getAdminFeed(id, options = {}) {
  return unwrapAdminResponse(await apiClient.get(ROOT + "/" + encodeURIComponent(id), options));
}
export async function getAdminFeedReports(id, options = {}) {
  return unwrapAdminResponse(
    await apiClient.get(ROOT + "/" + encodeURIComponent(id) + "/reports", {
      ...options,
      query: { page: 0, size: 20 },
    })
  );
}
export async function moderateAdminFeed(id, action, value, options = {}) {
  const path = ROOT + "/" + encodeURIComponent(id) + "/" + action;
  return unwrapAdminResponse(
    await (action === "recommendation"
      ? apiClient.patch(path, value, options)
      : apiClient.post(path, value, options))
  );
}

export function feedPreviewImages(images) {
  let values = images;
  if (typeof images === "string") {
    try {
      values = JSON.parse(images);
    } catch {
      values = images.split(",");
    }
  }
  if (!Array.isArray(values)) values = [values];
  return values
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter((v) => /^https:\/\//i.test(v))
    .slice(0, 10);
}
