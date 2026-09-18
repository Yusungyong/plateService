import { getAdminEntryPath } from "../config/routes";
import { userHasAdminAccess } from "../admin/constants/adminPermissions";

test("explicitly revoked permissions do not fall back to the admin role", () => {
  expect(userHasAdminAccess({ roles: ["ADMIN"], permissions: [] })).toBe(false);
  expect(userHasAdminAccess({ roles: ["ADMIN"] })).toBe(true);
});

test.each(["ADMIN", "CONTENT_MANAGER", "VIEWER"])("%s enters the dashboard", (role) => {
  expect(getAdminEntryPath({ roles: [role] })).toBe("/admin/dashboard");
});

test("limited administrators enter their first permitted menu", () => {
  expect(getAdminEntryPath({ roles: ["ADMIN"], permissions: ["ADMIN_ACCESS", "SEASONAL_READ"] }))
    .toBe("/admin/seasonal-foods");
  expect(getAdminEntryPath({ roles: ["ADMIN"], permissions: [] })).toBe("/faq");
});
