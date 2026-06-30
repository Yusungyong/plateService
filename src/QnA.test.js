import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import QnA, { QnAWrite } from "./pages/QnA";
import { createQna, fetchQna } from "./api/qnaApi";

jest.mock("./api/qnaApi", () => ({
  createQna: jest.fn(),
  fetchQna: jest.fn(),
  updateQna: jest.fn(),
}));

beforeEach(() => {
  window.localStorage.clear();
  createQna.mockReset();
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
  expect(await screen.findByText("아직 공개 질문이 없습니다.")).toBeInTheDocument();
});

test("explains public Q&A scope and submits the reply email", async () => {
  createQna.mockResolvedValue({});

  render(
    <MemoryRouter>
      <AuthProvider>
        <QnAWrite />
      </AuthProvider>
    </MemoryRouter>
  );

  expect(await screen.findByRole("heading", { name: "공개 질문 등록" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "목록으로 돌아가기" })).toHaveAttribute("href", "/qna");
  expect(
    screen.getByText("공개 질문으로 등록됩니다. 답변 받을 이메일은 운영팀 확인과 답변 안내 목적으로만 사용되며 목록에는 표시되지 않습니다.")
  ).toBeInTheDocument();

  fireEvent.change(screen.getByPlaceholderText("답변 알림이 필요하면 입력"), {
    target: { value: "guest@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("공개되어도 괜찮은 문의 내용을 남겨 주세요."), {
    target: { value: "서비스 이용 방법을 알고 싶습니다." },
  });
  fireEvent.click(screen.getByRole("button", { name: "질문 등록" }));

  await waitFor(() =>
    expect(createQna).toHaveBeenCalledWith(
      expect.objectContaining({
        guestEmail: "guest@example.com",
        isPublic: true,
        question: "서비스 이용 방법을 알고 싶습니다.",
      })
    )
  );
});

test("filters the public Q&A list by category and status", async () => {
  fetchQna.mockResolvedValue([]);

  render(
    <MemoryRouter>
      <AuthProvider>
        <QnA />
      </AuthProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText("아직 공개 질문이 없습니다.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "질문 등록" })).toHaveAttribute("href", "/qna/new");

  fireEvent.change(screen.getAllByLabelText("문의 유형")[0], {
    target: { value: "계정문의" },
  });
  fireEvent.change(screen.getByLabelText("상태"), {
    target: { value: "answered" },
  });
  fireEvent.click(screen.getByRole("button", { name: "조회" }));

  await waitFor(() =>
    expect(fetchQna).toHaveBeenLastCalledWith(
      expect.objectContaining({
        category: "계정문의",
        statusCode: "answered",
        page: 0,
        size: 10,
      })
    )
  );
});
