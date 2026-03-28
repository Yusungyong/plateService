import { apiClient } from "./index";

export async function fetchMemberMonitoringSummary() {
  return apiClient.get("/api/admin/member-monitoring/summary");
}

export async function fetchMemberMonitoringLoginRisks({ limit = 20 } = {}) {
  return apiClient.get("/api/admin/member-monitoring/login-risks", {
    query: { limit },
  });
}

export async function fetchMemberMonitoringProfileChanges({ limit = 20 } = {}) {
  return apiClient.get("/api/admin/member-monitoring/profile-changes", {
    query: { limit },
  });
}

export async function fetchMemberMonitoringRiskUsers({ limit = 20 } = {}) {
  return apiClient.get("/api/admin/member-monitoring/risk-users", {
    query: { limit },
  });
}
