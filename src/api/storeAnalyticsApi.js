import { apiClient } from "./index";

function unwrapData(response) {
  return response?.data ?? response;
}

export async function fetchStoreAnalyticsSummary(storeId, { from, to }) {
  return unwrapData(
    await apiClient.get(`/api/owner/stores/${storeId}/analytics/summary`, {
      query: {
        from,
        to,
      },
    })
  );
}

export async function fetchStoreAnalyticsTrends(storeId, { from, to, interval = "day" }) {
  return unwrapData(
    await apiClient.get(`/api/owner/stores/${storeId}/analytics/trends`, {
      query: {
        from,
        to,
        interval,
      },
    })
  );
}

export async function fetchStoreAnalyticsContents(
  storeId,
  { from, to, page = 0, size = 10 }
) {
  return unwrapData(
    await apiClient.get(`/api/owner/stores/${storeId}/analytics/contents`, {
      query: {
        from,
        to,
        page,
        size,
      },
    })
  );
}
