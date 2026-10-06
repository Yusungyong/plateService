import { apiClient } from "../../api";
import { unwrapAdminResponse } from "./adminApiUtils";

// Shared upload endpoint still used by the master ingredient editor.
export async function uploadSeasonalCurationFile(file) {
  const formData = new FormData();
  formData.append("file", file);
  return unwrapAdminResponse(
    await apiClient.post("/api/admin/seasonal-curations/files", formData)
  );
}
