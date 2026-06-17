import { apiClient } from "./index";

function unwrapData(response) {
  return response?.data ?? response;
}

export async function signup({ username, email, password, nickname }) {
  const response = await apiClient.post(
    "/api/auth/signup",
    {
      username: String(username || "").trim(),
      email: String(email || "").trim(),
      password,
      nickname: String(nickname || "").trim(),
    },
    {
      withAuth: false,
    }
  );

  return unwrapData(response);
}
