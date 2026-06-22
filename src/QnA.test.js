import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import QnA from "./pages/QnA";
import { fetchQna } from "./api/qnaApi";

jest.mock("./api/qnaApi", () => ({
  createQna: jest.fn(),
  fetchQna: jest.fn(),
  updateQna: jest.fn(),
}));

beforeEach(() => {
  window.localStorage.clear();
  fetchQna.mockReset();
});

test("shows an honest error state and allows retrying the Q&A request", async () => {
  fetchQna
    .mockRejectedValueOnce(new Error("network unavailable"))
    .mockResolvedValueOnce([]);

  render(
    <MemoryRouter>
      <AuthProvider>
        <QnA />
      </AuthProvider>
    </MemoryRouter>
  );

  expect(
    await screen.findByText("Q&A 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.")
  ).toBeInTheDocument();
  expect(screen.queryByText("콘텐츠 검수 결과는 어디에서 확인할 수 있나요?")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "다시 시도" }));

  await waitFor(() => expect(fetchQna).toHaveBeenCalledTimes(2));
  expect(await screen.findByText("등록된 질문이 없습니다.")).toBeInTheDocument();
});
