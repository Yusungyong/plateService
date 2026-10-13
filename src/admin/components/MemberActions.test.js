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
  const drawer = await screen.findByRole("dialog", { name: "회원 alice" });
  fireEvent.click(await within(drawer).findByRole("button", { name: "전체 세션 종료" }));
  const dialog = screen.getByRole("dialog", { name: "회원 전체 세션 종료" });
  fireEvent.change(within(dialog).getByLabelText("처리 사유"), {
    target: { value: "이상 로그인 검토에 따른 세션 종료입니다." },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "세션 종료하기" }));
  await waitFor(() =>
    expect(revokeMemberSessions).toHaveBeenCalledWith("alice", {
      reason: "이상 로그인 검토에 따른 세션 종료입니다.",
      expectedTokenVersion: 3,
    })
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
  fireEvent.click(await screen.findByRole("button", { name: "전체 세션 종료" }));
  const dialog = screen.getByRole("dialog", { name: "회원 전체 세션 종료" });
  fireEvent.change(within(dialog).getByLabelText("처리 사유"), {
    target: { value: "계정 보안 검토에 따른 세션 종료입니다." },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "세션 종료하기" }));
  await screen.findByRole("alert");
  expect(screen.queryByText(/세션 2개를 종료했습니다/)).not.toBeInTheDocument();
});
