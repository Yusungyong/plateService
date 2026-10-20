import React from "react";
import { render, screen, fireEvent, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminFeeds from "./AdminFeeds";
import { useAuth } from "../../auth/AuthContext";
import {
  getAdminFeeds,
  getAdminFeed,
  getAdminFeedReports,
  moderateAdminFeed,
} from "../api/feedModerationApi";
jest.mock("../../auth/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../api/feedModerationApi", () => ({
  getAdminFeeds: jest.fn(),
  getAdminFeed: jest.fn(),
  getAdminFeedReports: jest.fn(),
  moderateAdminFeed: jest.fn(),
  feedPreviewImages: jest.requireActual("../api/feedModerationApi").feedPreviewImages,
}));
const feed = {
  feedId: 42,
  username: "alice",
  content: "점검할 사진 콘텐츠",
  storeName: "접시 식당",
  visibilityStatus: "visible",
  recommended: false,
  reportCount: 1,
  version: 2,
};
beforeEach(() => {
  jest.clearAllMocks();
  useAuth.mockReturnValue({ canAdmin: () => true });
  getAdminFeeds.mockResolvedValue({ content: [feed], hasNext: false });
  getAdminFeed.mockResolvedValue(feed);
  getAdminFeedReports.mockResolvedValue({ content: [] });
  moderateAdminFeed.mockResolvedValue({ ...feed, visibilityStatus: "hidden", version: 3 });
});
const mount = () =>
  render(
    <MemoryRouter>
      <AdminFeeds />
    </MemoryRouter>
  );
test("hiding a feed sends the displayed version and operator reason", async () => {
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "피드 #42 검토" }));
  fireEvent.click(await screen.findByRole("button", { name: "피드 숨김" }));
  const dialog = screen.getByRole("dialog", { name: "피드 운영 조치" });
  fireEvent.change(within(dialog).getByLabelText("처리 사유"), {
    target: { value: "신고 내용을 검토한 결과 노출 중단이 필요합니다." },
  });
  fireEvent.click(within(dialog).getByRole("button", { name: "조치 저장" }));
  await waitFor(() =>
    expect(moderateAdminFeed).toHaveBeenCalledWith(42, "hide", {
      reason: "신고 내용을 검토한 결과 노출 중단이 필요합니다.",
      version: 2,
    })
  );
  await screen.findByRole("button", { name: "피드 복원" });
});
test("read-only feed access cannot moderate or read reports without permission", async () => {
  useAuth.mockReturnValue({ canAdmin: (p) => p === "FEED_READ" });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "피드 #42 검토" }));
  await screen.findByText("점검할 사진 콘텐츠");
  expect(screen.queryByRole("button", { name: "피드 숨김" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "추천 지정" })).not.toBeInTheDocument();
  expect(getAdminFeedReports).not.toHaveBeenCalled();
});
test("recommend permission is independent of moderation permission", async () => {
  useAuth.mockReturnValue({ canAdmin: (p) => ["FEED_READ", "FEED_FEATURE"].includes(p) });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "피드 #42 검토" }));
  await screen.findByRole("button", { name: "추천 지정" });
  expect(screen.queryByRole("button", { name: "피드 숨김" })).not.toBeInTheDocument();
});
test("authorized preview images stay visible after changing moderation state", async () => {
  const url = "https://media.example/preview.jpg?temporary=fixture";
  getAdminFeed.mockResolvedValue({ ...feed, images: "20261013/photo.jpg", previewImages: [url] });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "피드 #42 검토" }));
  expect(await screen.findByRole("img", { name: "피드 #42 사진" })).toHaveAttribute("src", url);
  fireEvent.click(screen.getByRole("button", { name: "피드 숨김" }));
  const dialog = screen.getByRole("dialog", { name: "피드 운영 조치" });
  fireEvent.change(within(dialog).getByLabelText("처리 사유"), { target: { value: "미리보기 확인 후 숨김 처리합니다." } });
  fireEvent.click(within(dialog).getByRole("button", { name: "조치 저장" }));
  await screen.findByRole("button", { name: "피드 복원" });
  expect(screen.getByRole("img", { name: "피드 #42 사진" })).toHaveAttribute("src", url);
  fireEvent.error(screen.getByRole("img", { name: "피드 #42 사진" }));
  expect(screen.getByText("사진을 표시하지 못했습니다. 상세 새로고침으로 다시 확인해 주세요.")).toBeInTheDocument();
});

test("visibility shortcuts query the server; report filter is explicitly scoped to the loaded page", async () => {
  getAdminFeeds.mockResolvedValue({content:[feed, {...feed,feedId:43,reportCount:0}],hasNext:true});
  mount();
  await screen.findByRole("button", {name:"피드 #43 검토"});
  fireEvent.click(screen.getByRole("checkbox", {name:"이 페이지에서 신고 있는 항목만"}));
  expect(screen.queryByRole("button", {name:"피드 #43 검토"})).not.toBeInTheDocument();
  expect(screen.getByRole("button", {name:"피드 #42 검토"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name:"숨김",exact:true}));
  await waitFor(() => expect(getAdminFeeds).toHaveBeenLastCalledWith(
    {keyword:"",visibility:"hidden",page:0}, expect.objectContaining({signal:expect.anything()})
  ));
  expect(moderateAdminFeed).not.toHaveBeenCalled();
});
