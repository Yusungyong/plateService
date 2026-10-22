import screens from "./clientErrorScreens.json";
const paths = {
  "/": "WebHome", "/login": "WebLogin", "/signup": "WebSignup", "/admin": "AdminDashboard",
  "/admin/dashboard": "AdminDashboard", "/admin/users": "AdminMembers", "/admin/members": "AdminMembers",
  "/admin/member-monitoring": "AdminMonitoring", "/admin/feeds": "AdminFeeds", "/admin/reports": "AdminReports",
  "/admin/stores": "AdminStores", "/admin/seasonal-foods": "AdminSeasonal", "/admin/faq": "AdminFaq", "/admin/qna": "AdminQna",
  "/admin/store-approvals":"AdminStoreApprovals", "/admin/restaurants":"AdminRestaurants", "/admin/restaurant-registration":"AdminRestaurantRegistration",
  "/business/dashboard":"BusinessDashboard", "/business/signup":"BusinessSignup", "/business/applications":"BusinessApplications", "/business/stores":"BusinessStores",
  "/admin/api-registry": "AdminApiRegistry", "/admin/operations": "AdminOperations",
  "/admin/operations/incidents": "AdminIncidents", "/admin/operations/releases": "AdminReleases", "/admin/operations/checks": "AdminChecks",
};
export function captureClientErrorContext(pathname = typeof window === "undefined" ? "" : window.location.pathname) {
  // Match reviewed menu prefixes; never retain a user ID, search term, query or hash.
  const match = Object.keys(paths).sort((a,b) => b.length-a.length).find(path => pathname === path || (!["/","/admin"].includes(path) && pathname.startsWith(path+"/")));
  return {screen: match ? paths[match] : null, occurredAt: new Date().toISOString()};
}
export function safeClientErrorContext(context) {
  if (!context) return {};
  return {screen: Object.prototype.hasOwnProperty.call(screens,context.screen) ? context.screen : null,
    ...(typeof context.occurredAt === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(context.occurredAt) && Number.isFinite(Date.parse(context.occurredAt)) ? {occurredAt:context.occurredAt} : {})};
}
