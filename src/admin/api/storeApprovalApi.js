import { apiClient } from "../../api";
import { initialStoreApprovals } from "../mocks/storeApprovals";
import {
  shouldUseAdminMocks,
  unwrapAdminResponse,
} from "./adminApiUtils";
import { mockRequest } from "./mockApiUtils";

let storeApprovals = initialStoreApprovals.map((store) => ({ ...store }));

export function resetStoreApprovalMocks() {
  storeApprovals = initialStoreApprovals.map((store) => ({
    ...store,
    representativeMenus: [...store.representativeMenus],
    documents: store.documents.map((document) => ({ ...document })),
  }));
}

export async function getStoreApprovals(params = {}) {
  if (!shouldUseAdminMocks()) {
    const response = await apiClient.get("/api/admin/store-approvals", {
      query: {
        page: params.page ?? 0,
        size: params.size ?? 20,
        keyword: params.keyword,
        region: params.region,
        category: params.category,
        status: params.status,
        verificationStatus: params.verificationStatus,
        appliedFrom: params.appliedFrom,
        appliedTo: params.appliedTo,
        sort: params.sort || "appliedAt,desc",
      },
    });

    return normalizeStoreApprovalPage(unwrapAdminResponse(response));
  }

  const {
    page = 0,
    size = 10,
    keyword = "",
    region = "",
    category = "",
    status = "",
    verificationStatus = "",
    appliedFrom = "",
    appliedTo = "",
    scenario = "",
  } = params;

  if (scenario === "error") {
    return mockRequest(null, {
      error: new Error("매장 승인 목록을 불러오지 못했습니다."),
    });
  }

  const normalizedKeyword = keyword.trim().toLowerCase();
  const filtered = storeApprovals.filter((store) => {
    const keywordTarget = [
      store.name,
      store.ownerName,
      store.phone,
      store.address,
    ]
      .join(" ")
      .toLowerCase();
    const appliedDate = store.appliedAt.slice(0, 10);

    return (
      (!normalizedKeyword || keywordTarget.includes(normalizedKeyword)) &&
      (!region || store.region === region) &&
      (!category || store.category === category) &&
      (!status || store.approvalStatus === status) &&
      (!verificationStatus || store.verificationStatus === verificationStatus) &&
      (!appliedFrom || appliedDate >= appliedFrom) &&
      (!appliedTo || appliedDate <= appliedTo)
    );
  });

  const start = page * size;
  const content = filtered.slice(start, start + size);
  const totalPages = Math.max(1, Math.ceil(filtered.length / size));

  return mockRequest({
    content,
    page,
    size,
    totalElements: filtered.length,
    totalPages,
    hasNext: page + 1 < totalPages,
  });
}

export async function getStoreApprovalDetail(storeId) {
  if (!shouldUseAdminMocks()) {
    const response = await apiClient.get(`/api/admin/store-approvals/${storeId}`);
    return normalizeStoreApprovalDetail(unwrapAdminResponse(response));
  }

  const store = findStore(storeId);
  return mockRequest(store);
}

export async function approveStore(storeId, command = {}) {
  if (!shouldUseAdminMocks()) {
    unwrapAdminResponse(
      await apiClient.post(
        `/api/admin/store-approvals/${storeId}/approve`,
        command
      )
    );
    return getStoreApprovalDetail(storeId);
  }

  return updateStoreApproval(storeId, {
    approvalStatus: "approved",
    verificationStatus: "verified",
    reviewReason: "",
  });
}

export async function holdStore(storeId, command) {
  if (!shouldUseAdminMocks()) {
    unwrapAdminResponse(
      await apiClient.post(
        `/api/admin/store-approvals/${storeId}/hold`,
        command
      )
    );
    return getStoreApprovalDetail(storeId);
  }

  const reason = typeof command === "string" ? command : command?.reason;
  requireReason(reason);
  return updateStoreApproval(storeId, {
    approvalStatus: "on_hold",
    reviewReason: reason.trim(),
  });
}

export async function rejectStore(storeId, command) {
  if (!shouldUseAdminMocks()) {
    unwrapAdminResponse(
      await apiClient.post(
        `/api/admin/store-approvals/${storeId}/reject`,
        command
      )
    );
    return getStoreApprovalDetail(storeId);
  }

  const reason = typeof command === "string" ? command : command?.reason;
  requireReason(reason);
  return updateStoreApproval(storeId, {
    approvalStatus: "rejected",
    verificationStatus: "rejected",
    reviewReason: reason.trim(),
  });
}

export async function getStoreDocumentAccessUrl(
  applicationId,
  documentId,
  purpose = "preview"
) {
  if (shouldUseAdminMocks()) {
    return mockRequest({
      accessUrl: "about:blank",
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
  }

  const response = await apiClient.post(
    `/api/admin/store-approvals/${applicationId}/documents/${documentId}/access-url`,
    { purpose }
  );

  return unwrapAdminResponse(response);
}

export function normalizeStoreApprovalPage(page = {}) {
  return {
    content: (page.content || []).map(normalizeStoreApprovalListItem),
    page: page.page ?? 0,
    size: page.size ?? 20,
    totalElements: page.totalElements ?? 0,
    totalPages: Math.max(1, page.totalPages ?? 0),
    hasNext: Boolean(page.hasNext),
  };
}

export function normalizeStoreApprovalDetail(store = {}) {
  const categories = store.categories || [];

  return {
    ...store,
    categories,
    category: categories[0]?.name || categories[0]?.code || "미분류",
    categoryCode: categories[0]?.code || "",
    regionInfo: store.region || null,
    region: store.region?.name || store.region?.code || "미지정",
    representativeMenus: store.representativeMenus || [],
    documents: store.documents || [],
    version: store.version,
  };
}

function normalizeStoreApprovalListItem(store = {}) {
  const categories = store.categories || [];

  return {
    ...store,
    categories,
    category: categories[0]?.name || categories[0]?.code || "미분류",
    categoryCode: categories[0]?.code || "",
    regionInfo: store.region || null,
    region: store.region?.name || store.region?.code || "미지정",
  };
}

function updateStoreApproval(storeId, changes) {
  const currentStore = findStore(storeId);
  const updatedStore = {
    ...currentStore,
    ...changes,
    updatedAt: new Date().toISOString(),
  };

  storeApprovals = storeApprovals.map((store) =>
    store.id === storeId ? updatedStore : store
  );

  return mockRequest(updatedStore);
}

function findStore(storeId) {
  const store = storeApprovals.find((item) => item.id === storeId);

  if (!store) {
    throw new Error("매장 신청 정보를 찾을 수 없습니다.");
  }

  return store;
}

function requireReason(reason) {
  if (!String(reason || "").trim()) {
    throw new Error("처리 사유를 입력해 주세요.");
  }
}
