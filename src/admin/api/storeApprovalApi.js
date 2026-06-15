import { initialStoreApprovals } from "../mocks/storeApprovals";
import { mockRequest } from "./mockApiUtils";

let storeApprovals = initialStoreApprovals.map((store) => ({ ...store }));

export function resetStoreApprovalMocks() {
  storeApprovals = initialStoreApprovals.map((store) => ({
    ...store,
    representativeMenus: [...store.representativeMenus],
    documents: store.documents.map((document) => ({ ...document })),
  }));
}

export function getStoreApprovals(params = {}) {
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

export function getStoreApprovalDetail(storeId) {
  const store = findStore(storeId);
  return mockRequest(store);
}

export function approveStore(storeId) {
  return updateStoreApproval(storeId, {
    approvalStatus: "approved",
    verificationStatus: "verified",
    reviewReason: "",
  });
}

export function holdStore(storeId, reason) {
  requireReason(reason);
  return updateStoreApproval(storeId, {
    approvalStatus: "on_hold",
    reviewReason: reason.trim(),
  });
}

export function rejectStore(storeId, reason) {
  requireReason(reason);
  return updateStoreApproval(storeId, {
    approvalStatus: "rejected",
    verificationStatus: "rejected",
    reviewReason: reason.trim(),
  });
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
