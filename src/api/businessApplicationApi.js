import { apiClient } from "./index";

function unwrapData(response) {
  return response?.data ?? response;
}

export async function signupAndCreateBusinessApplication(payload) {
  const response = await apiClient.post("/api/owner/signup-applications", payload, {
    withAuth: false,
  });

  return unwrapData(response);
}

export async function createBusinessApplication(payload) {
  return unwrapData(await apiClient.post("/api/owner/store-applications", payload));
}

export async function verifyBusinessRegistration(payload) {
  return unwrapData(await apiClient.post("/api/owner/business-verifications", payload, {
    withAuth: false,
  }));
}

export async function fetchBusinessApplications({ page = 0, size = 20 } = {}) {
  return unwrapData(
    await apiClient.get("/api/owner/store-applications", {
      query: {
        page,
        size,
      },
    })
  );
}

export async function fetchBusinessApplicationDetail(applicationId) {
  return unwrapData(await apiClient.get(`/api/owner/store-applications/${applicationId}`));
}

export async function updateBusinessApplication(applicationId, payload) {
  return unwrapData(await apiClient.put(`/api/owner/store-applications/${applicationId}`, payload));
}

export async function uploadBusinessApplicationDocument(applicationId, file, { documentType }) {
  const formData = new FormData();
  formData.append("file", file);

  return unwrapData(
    await apiClient.post(`/api/owner/store-applications/${applicationId}/documents`, formData, {
      query: {
        documentType,
      },
    })
  );
}

export async function submitBusinessApplication(applicationId, { version }) {
  return unwrapData(
    await apiClient.post(`/api/owner/store-applications/${applicationId}/submit`, {
      version,
    })
  );
}
