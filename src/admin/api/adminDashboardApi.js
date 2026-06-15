import { dashboardSummary } from "../mocks/dashboard";
import { mockRequest } from "./mockApiUtils";

export function getDashboardSummary(params = {}) {
  if (params.scenario === "error") {
    return mockRequest(null, {
      error: new Error("대시보드 데이터를 불러오지 못했습니다."),
    });
  }

  return mockRequest(dashboardSummary);
}
