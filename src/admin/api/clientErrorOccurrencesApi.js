import {apiClient} from "../../api";
import {unwrapAdminResponse} from "./adminApiUtils";
export async function getClientErrorOccurrences(method,path,signal) {
  const result=unwrapAdminResponse(await apiClient.get("/api/admin/api-registry/client-errors",{query:{method,path},signal}));
  if (!result || !Array.isArray(result.rows) || typeof result.hasMore !== "boolean" || result.limit !== 50)
    throw new Error("오류 발생 기록 응답을 확인하지 못했어요.");
  return result;
}
