import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminDashboard from "./AdminDashboard";
import { useAuth } from "../../auth/AuthContext";
import { getDashboardSummary } from "../api/adminDashboardApi";
jest.mock("../../auth/AuthContext", () => ({useAuth:jest.fn()}));
jest.mock("../api/adminDashboardApi", () => ({getDashboardSummary:jest.fn()}));
const data = {metrics:[],activityTrends:[],regionDistribution:[],recentActivities:[],activitiesHasNext:false};
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({canAdmin:()=>true});
  getDashboardSummary.mockResolvedValue(data);
});
test("period shortcuts apply a bounded server date range and reset activity paging", async () => {
  render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
  fireEvent.click(await screen.findByRole("button", {name:"최근 30일"}));
  await waitFor(() => expect(getDashboardSummary).toHaveBeenCalledTimes(2));
  const query = getDashboardSummary.mock.calls[1][0];
  expect((Date.parse(query.to)-Date.parse(query.from))/86400000).toBe(29);
  expect(query.activityPage).toBe(0);
  await waitFor(() => expect(screen.getByRole("button", {name:"오늘",exact:true})).toBeEnabled());
  fireEvent.click(screen.getByRole("button", {name:"오늘",exact:true}));
  await waitFor(() => expect(getDashboardSummary).toHaveBeenCalledTimes(3));
  const today = getDashboardSummary.mock.calls[2][0];
  expect(today.from).toBe(today.to);
});
test("related work shortcuts respect each menu's read permission", async () => {
  useAuth.mockReturnValue({canAdmin:p=>p==="FEED_READ"});
  render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
  expect(await screen.findByRole("link", {name:"게시물 검토"})).toHaveAttribute("href","/admin/feeds");
  expect(screen.queryByRole("link", {name:"회원 확인"})).not.toBeInTheDocument();
  expect(screen.queryByRole("link", {name:"문의 답변"})).not.toBeInTheDocument();
});

test("KPI and graph drilldowns preserve their exact scope and dates", async()=>{
  getDashboardSummary.mockResolvedValue({...data,metrics:[{key:"pendingApprovals",label:"승인 대기",value:1},{key:"regionalPosts",label:"지역 게시물",value:3},{key:"activeStores",label:"변경된 매장",value:2}],activityTrends:[{date:"2026-10-20",stores:2,posts:3,reactions:5}],regionDistribution:[{region:"서울",count:3}]});
  render(<MemoryRouter initialEntries={["/admin/dashboard?from=2026-10-20&to=2026-10-20"]}><AdminDashboard/></MemoryRouter>);
  expect(await screen.findByRole("link",{name:/승인 대기 1/})).toHaveAttribute("href","/admin/store-approvals?status=pending");
  expect(screen.getByRole("link",{name:/서울 · 목록 보기/})).toHaveAttribute("href","/admin/feeds?from=2026-10-20&to=2026-10-20&region=%EC%84%9C%EC%9A%B8");
  fireEvent.click(screen.getByRole("button",{name:/2026-10-20 변경된 매장/}));
  expect(await screen.findByRole("dialog",{name:"2026-10-20 활동"})).toBeInTheDocument();
  expect(screen.getByRole("link",{name:/이 날짜 사진 게시물/})).toHaveAttribute("href","/admin/feeds?from=2026-10-20&to=2026-10-20");
});

test("a failed period refresh keeps the old numbers linked to the old data period",async()=>{
  getDashboardSummary.mockResolvedValueOnce({...data,metrics:[{key:"regionalPosts",label:"지역 게시물",value:3}]}).mockRejectedValueOnce(new Error("fixture unavailable"));
  render(<MemoryRouter initialEntries={["/admin/dashboard?from=2026-10-01&to=2026-10-01"]}><AdminDashboard/></MemoryRouter>);
  await screen.findByRole("link",{name:/지역 게시물 3/});
  fireEvent.click(screen.getByRole("button",{name:"최근 30일"}));
  await screen.findByRole("alert");
  expect(screen.getByRole("link",{name:/지역 게시물 3/})).toHaveAttribute("href","/admin/feeds?from=2026-10-01&to=2026-10-01&located=1");
});
