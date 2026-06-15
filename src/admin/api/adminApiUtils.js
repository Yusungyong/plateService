import { ApiError } from "../../api";

export function shouldUseAdminMocks() {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.REACT_APP_ADMIN_USE_MOCKS === "true"
  );
}

export function unwrapAdminResponse(response) {
  if (!response || response.success === false) {
    throw new ApiError(
      response?.message || "관리자 API 요청을 처리하지 못했습니다.",
      {
        code: response?.errorCode || "ADMIN_API_ERROR",
        payload: response,
      }
    );
  }

  return response.data;
}

export function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDefaultDashboardRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 6);

  return {
    from: formatLocalDate(from),
    to: formatLocalDate(to),
  };
}
