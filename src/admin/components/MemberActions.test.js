import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import MemberActions from "./MemberActions";
import { useAuth } from "../../auth/AuthContext";
import {
  getMonitoredMember,
  revokeMemberSessions,
  searchMonitoredMembers,
} from "../../api/memberMonitoringApi";
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../api/memberMonitoringApi", () => ({
  getMonitoredMember: jest.fn(),
  revokeMemberSessions: jest.fn(),
  searchMonitoredMembers: jest.fn(),
}));
const member = {
  username: "alice",
  nickname: "앨리스",
  role: "USER",
  createdAt: "2026-01-01",
  tokenVersion: 3,
  activeSessions: 2,
  canRevokeSessions: true,
};
const detail = { member, reports30d: 1, imagePosts30d: 2, videoPosts30d: 0, recentChanges: [] };
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ user: { accountSubject: "su12ng" }, canAdmin: () => true });
  searchMonitoredMembers.mockResolvedValue([member]);
  getMonitoredMember.mockResolvedValue(detail);
  revokeMemberSessions.mockResolvedValue({ endedSessions: 2 });
});
function mount(path = "/admin/member-monitoring") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <MemberActions />
    </MemoryRouter>
  );
}
test("session action requires explicit target, reason and current token version", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "회원 alice 확인" }));
  const detailPanel = await screen.findByRole("region", { name: "회원 alice" });
  fireEvent.click(await within(detailPanel).findByText("보안 조치"));
  fireEvent.click(within(detailPanel).getByRole("button", { name: "전체 세션 종료" }));
  const dialog = screen.getByRole("dialog", { name: "회원 전체 세션 종료" });
  fireEvent.change(within(dialog).getByLabelText("처리 사유"), {
    target: { value: "이상 로그인 검토에 따른 세션 종료입니다." },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "세션 종료하기" }));
  await waitFor(() =>
    expect(revokeMemberSessions).toHaveBeenCalledWith("alice", {
      reason: "이상 로그인 검토에 따른 세션 종료입니다.",
      expectedTokenVersion: 3,
    }, expect.objectContaining({signal: expect.anything()}))
  );
  await screen.findByText("세션 2개를 종료했습니다. 다시 로그인하면 사용할 수 있습니다.");
});
test("read-only permission hides destructive session action", async () => {
  useAuth.mockReturnValue({
    user: { accountSubject: "su12ng" },
    canAdmin: (p) => p !== "ADMIN_ACCOUNT_MANAGE",
  });
  mount("/admin/member-monitoring?username=alice");
  await screen.findByText("최근 변경 10건");
  expect(screen.queryByRole("button", { name: "전체 세션 종료" })).not.toBeInTheDocument();
});
test("protected account does not expose revoke action", async () => {
  getMonitoredMember.mockResolvedValue({
    ...detail,
    member: { ...member, canRevokeSessions: false, role: "ADMIN" },
  });
  mount("/admin/member-monitoring?username=alice");
  await screen.findByText("최근 변경 10건");
  expect(screen.queryByRole("button", { name: "전체 세션 종료" })).not.toBeInTheDocument();
});
test("a conflict is shown without claiming successful logout", async () => {
  revokeMemberSessions.mockRejectedValue(new Error("이미 처리되었거나 상태가 변경됐습니다."));
  mount("/admin/member-monitoring?username=alice");
  fireEvent.click(await screen.findByText("보안 조치"));
  fireEvent.click(screen.getByRole("button", { name: "전체 세션 종료" }));
  const dialog = screen.getByRole("dialog", { name: "회원 전체 세션 종료" });
  fireEvent.change(within(dialog).getByLabelText("처리 사유"), {
    target: { value: "계정 보안 검토에 따른 세션 종료입니다." },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "세션 종료하기" }));
  await screen.findByRole("alert");
  expect(screen.queryByText(/세션 2개를 종료했습니다/)).not.toBeInTheDocument();
});

test("selection keeps the search results beside member details, not in another dialog", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", {name: "회원 alice 확인"}));
  await screen.findByText("최근 변경 10건");
  expect(screen.getByRole("button", {name: "회원 alice 확인"})).toHaveAttribute("aria-current", "true");
  expect(screen.getByRole("region", {name: "회원 alice"})).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByText(/검색 결과는 최대 20명까지/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "선택 해제"}));
  expect(screen.queryByRole("region", {name: "회원 alice"})).not.toBeInTheDocument();
  expect(screen.getByRole("button", {name: "회원 alice 확인"})).toBeInTheDocument();
});
test("searching another account clears the previous detail and its action", async () => {
  mount("/admin/member-monitoring?username=alice");
  await screen.findByText("최근 변경 10건");
  searchMonitoredMembers.mockResolvedValue([]);
  fireEvent.change(screen.getByLabelText("회원 검색"), {target: {value: "not-found"}});
  fireEvent.click(screen.getByRole("button", {name: "검색", exact: true}));
  await screen.findByText("검색된 회원이 없어요.");
  expect(screen.queryByRole("region", {name: "회원 alice"})).not.toBeInTheDocument();
  expect(screen.queryByText("보안 조치")).not.toBeInTheDocument();
  expect(revokeMemberSessions).not.toHaveBeenCalled();
});
test("missing member read permission neither searches nor exposes details", () => {
  useAuth.mockReturnValue({user: {accountSubject: "su12ng"}, canAdmin: () => false});
  mount("/admin/member-monitoring?username=alice");
  expect(getMonitoredMember).not.toHaveBeenCalled();
  expect(searchMonitoredMembers).not.toHaveBeenCalled();
});
test("the current account cannot terminate its own sessions", async () => {
  useAuth.mockReturnValue({user: {accountSubject: "alice"}, canAdmin: () => true});
  mount("/admin/member-monitoring?username=alice");
  fireEvent.click(await screen.findByText("보안 조치"));
  expect(screen.queryByRole("button", {name: "전체 세션 종료"})).not.toBeInTheDocument();
});
test("switching accounts discards the old workspace and late detail response", async () => {
  let resolveOld;
  getMonitoredMember.mockImplementationOnce(() => new Promise(resolve => {resolveOld = resolve;}));
  const view=mount("/admin/member-monitoring?username=alice");
  await waitFor(() => expect(getMonitoredMember).toHaveBeenCalledTimes(1));
  useAuth.mockReturnValue({user: {accountSubject: "new-operator"}, canAdmin: () => true});
  getMonitoredMember.mockResolvedValue({...detail,member:{...member,nickname:"현재 계정 조회"}});
  view.rerender(<MemoryRouter initialEntries={["/admin/member-monitoring?username=alice"]}><MemberActions/></MemoryRouter>);
  await screen.findByRole("heading", {name: "현재 계정 조회"});
  resolveOld({...detail,member:{...member,nickname:"이전 계정 늦은 응답"}});
  await waitFor(() => expect(screen.queryByRole("heading", {name: "이전 계정 늦은 응답"})).not.toBeInTheDocument());
  expect(screen.getByRole("heading", {name: "현재 계정 조회"})).toBeInTheDocument();
});
