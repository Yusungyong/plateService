import { apiClient } from "./index";

function unwrapData(response) {
  return response?.data ?? response;
}

export async function signup({ username, email, password, nickname, legalAcceptance }) {
  const response = await apiClient.post(
    legalAcceptance ? "/api/auth/signup/with-consent" : "/api/auth/signup",
    {
      username: String(username || "").trim(),
      email: String(email || "").trim(),
      password,
      nickname: String(nickname || "").trim(),
      ...(legalAcceptance ? {legalAcceptance} : {}),
    },
    {
      withAuth: false,
    }
  );

  return unwrapData(response);
}
