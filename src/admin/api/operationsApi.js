import { apiClient } from "../../api";
import { unwrapAdminResponse } from "./adminApiUtils";
const ROOT = "/api/admin/operations";
export async function getOperationsSnapshot(options = {}) {
  return unwrapAdminResponse(await apiClient.get(ROOT + "/snapshot", options));
}
export async function getPushAttempt(id, options = {}) {
  return unwrapAdminResponse(
    await apiClient.get(
      ROOT + "/push-attempts/" + encodeURIComponent(id),
      options
    )
  );
}
export async function createOperationsRelease(value, options = {}) {
  return unwrapAdminResponse(
    await apiClient.post(ROOT + "/releases", value, options)
  );
}
export async function recordReleaseCheck(id, value, options = {}) {
  return unwrapAdminResponse(
    await apiClient.post(
      ROOT + "/releases/" + encodeURIComponent(id) + "/checks",
      value,
      options
    )
  );
}
