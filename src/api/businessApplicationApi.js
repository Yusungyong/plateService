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

export async function validateBusinessSignupAccountField(payload) {
  const response = await apiClient.post("/api/owner/signup-account-validations", payload, {
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
  const application = unwrapData(
    await apiClient.get(`/api/owner/store-applications/${applicationId}`)
  );

  return normalizeBusinessApplicationDetail(application);
}

export async function updateBusinessApplication(applicationId, payload) {
  return unwrapData(await apiClient.put(`/api/owner/store-applications/${applicationId}`, payload));
}

export async function submitBusinessApplication(applicationId, { version }) {
  return unwrapData(
    await apiClient.post(`/api/owner/store-applications/${applicationId}/submit`, {
      version,
    })
  );
}

export function normalizeBusinessApplicationDetail(application = {}) {
  const reviews = Array.isArray(application.reviews) ? application.reviews : [];
  const latestReview =
    application.latestReview ||
    application.review ||
    reviews[reviews.length - 1] ||
    {};

  return {
    ...application,
    reviewReason: firstNonEmptyString(
      application.reviewReason,
      application.review_reason,
      application.rejectionReason,
      application.reason,
      latestReview.reason
    ),
    reviewReasonCode: firstNonEmptyString(
      application.reviewReasonCode,
      application.review_reason_code,
      application.reasonCode,
      latestReview.reasonCode,
      latestReview.reason_code
    ),
  };
}

function firstNonEmptyString(...values) {
  const value = values.find(
    (candidate) => typeof candidate === "string" && candidate.trim()
  );

  return value?.trim() || "";
}
