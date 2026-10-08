import {buildMenuRelations, filterRegistryRows, relationshipGraph, sourceEvidence, summarizeModules, UNLINKED_MENU} from "./apiRegistryModel";

const rows = [
  {id: "shared", method: "PUT", path: "/shared", module: "engagement", surfaces: ["app"], menuIds: ["app:Home", "app:Home", "app:Profile"], menuLabels: ["홈", "프로필"], active: true, observed: true},
  {id: "create", method: "POST", path: "/content", module: "content", surfaces: ["app"], menuIds: ["app:Home"], menuLabels: ["홈"], active: true, observed: false},
  {id: "unlinked", method: "GET", path: "/internal", module: "platform", surfaces: [], menuIds: [], menuLabels: [], active: true, observed: false},
];

test("rebuilds effective edges without stale menu counts and deduplicates shared API links", () => {
  const menus = buildMenuRelations([...rows, rows[0]], [{id: "app:Home", label: "홈", apiIds: ["old"], apiCount: 88}, {id: "app:Profile", label: "프로필"}, {id: "app:Old", label: "이전 메뉴", apiIds: ["shared"], apiCount: 1}]);
  expect(menus.find(menu => menu.id === "app:Home")).toMatchObject({apiCount: 2, apiIds: ["shared", "create"], moduleIds: ["engagement", "content"]});
  expect(menus.find(menu => menu.id === "app:Profile")).toMatchObject({apiCount: 1, surface: "app"});
  expect(menus.find(menu => menu.id === "app:Old").apiCount).toBe(0);
  expect(summarizeModules([...rows, rows[0]]).find(module => module.id === "engagement")).toMatchObject({apiCount: 1, menuCount: 2, observedApiCount: 1});
});

test("menu, method, source surface and search filters describe the same API subset", () => {
  expect(filterRegistryRows(rows, {menuId: "app:Home", module: "engagement", method: "PUT", query: "프로필", surface: "app"})).toEqual([rows[0]]);
  expect(filterRegistryRows(rows, {menuId: UNLINKED_MENU})).toEqual([rows[2]]);
  expect(filterRegistryRows(rows, {menuId: "app:Profile", method: "POST"})).toEqual([]);
});

test("limited graph samples represent modules while preserving true route count", () => {
  const graph = relationshipGraph([...rows, rows[0]], 2);
  expect(graph.totalApiCount).toBe(3);
  expect(graph.routes).toHaveLength(2);
  expect(new Set(graph.routes.map(row => row.module)).size).toBe(2);
  expect(graph.omittedApiCount).toBe(1);
  expect(graph.modules).toHaveLength(3);
});

test("unknown menu metadata remains discoverable and evidence keeps original source when label overrides", () => {
  expect(buildMenuRelations(rows, []).find(menu => menu.id === "app:Home")).toMatchObject({label: "app:Home", apiCount: 2});
  expect(sourceEvidence(rows[0], [{id: "app:Home", label: "홈", source: "Home.js", sourceLine: 12}, {id: "app:Home", label: "새 홈"}])).toEqual([{menuId: "app:Home", label: "새 홈", source: "Home.js", sourceLine: 12}]);
});
