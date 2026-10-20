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
