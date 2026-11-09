import { apiClient } from "../../api";
import { unwrapAdminResponse } from "./adminApiUtils";

const isCount = value => Number.isSafeInteger(value) && value >= 0;
const isRecord = value => value !== null && typeof value === "object" && !Array.isArray(value);
const kinds = new Set(["REACT_RENDER", "JS_FATAL", "JS_NONFATAL"]);

// Keep runtime failures separate from API-request failure metrics.
export async function getRuntimeErrors(options = {}) {
  const data = unwrapAdminResponse(await apiClient.get(
    "/api/admin/operations/runtime-errors",
    { ...options, query: { hours: 24, limit: 50 } }
   ));
  if (!data || data.available !== true || !isCount(data.total) ||
      !Array.isArray(data.kindCounts) || !Array.isArray(data.hourly) || !Array.isArray(data.recent) ||
      !Array.isArray(data.groups) || typeof data.hasMore !== "boolean" ||
      !isCount(data.recentLimit) || !isCount(data.retentionDays) ||
      !data.kindCounts.every(item => isRecord(item) && kinds.has(item.kind) && isCount(item.count)) ||
      !data.hourly.every(item => isRecord(item) && typeof item.bucketStart === "string" && isCount(item.count)) ||
      !data.recent.every(item => isRecord(item) && typeof item.eventId === "string" && kinds.has(item.kind))) {
    throw new Error("앱 오류 응답을 확인하지 못했습니다.");
  }
  return data;
}
