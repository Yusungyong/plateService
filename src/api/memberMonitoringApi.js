import { apiClient } from "./index";
import { unwrapAdminResponse } from "../admin/api/adminApiUtils";

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

export async function searchMonitoredMembers(keyword="",options={}) {
 const response=await apiClient.get("/api/admin/member-monitoring/members",{...options,query:{keyword,limit:20}});return unwrapAdminResponse(response);
}
export async function getMonitoredMember(username,options={}) {
 const response=await apiClient.get("/api/admin/member-monitoring/members/"+encodeURIComponent(username),options);return unwrapAdminResponse(response);
}
export async function revokeMemberSessions(username,value,options={}) {
 const response=await apiClient.post("/api/admin/member-monitoring/members/"+encodeURIComponent(username)+"/revoke-sessions",value,options);return unwrapAdminResponse(response);
}
