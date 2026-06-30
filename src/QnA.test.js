import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import PrivateInquiry from "./pages/PrivateInquiry";
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
  expect(screen.getByRole("link", { name: "1:1 문의로 전환" })).toHaveAttribute("href", "/qna/private");
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
  expect(screen.getByRole("link", { name: "1:1 문의" })).toHaveAttribute("href", "/qna/private");

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

test("hides private inquiries from the public Q&A list", async () => {
  fetchQna.mockResolvedValue([
    {
      qnaId: 1,
      category: "계정문의",
      question: "계정 이메일을 바꾸고 싶습니다.",
      statusCode: "reviewing",
      isPublic: false,
      guestName: "비공개 사용자",
      createdAt: "2026-06-30T09:00:00Z",
    },
    {
      qnaId: 2,
      category: "이용문의",
      question: "공개 Q&A는 어디에서 확인하나요?",
      answer: "고객지원의 공개 Q&A에서 확인할 수 있습니다.",
      statusCode: "answered",
      isPublic: true,
      guestName: "공개 사용자",
      createdAt: "2026-06-30T10:00:00Z",
    },
  ]);

  render(
    <MemoryRouter>
      <AuthProvider>
        <QnA />
      </AuthProvider>
    </MemoryRouter>
  );

  expect(await screen.findByText("공개 Q&A는 어디에서 확인하나요?")).toBeInTheDocument();
  expect(screen.queryByText("계정 이메일을 바꾸고 싶습니다.")).not.toBeInTheDocument();
  expect(screen.getByText("전체 1건 중 1건 표시")).toBeInTheDocument();
});

test("submits private inquiries without exposing them as public Q&A", async () => {
  createQna.mockResolvedValue({});

  render(
    <MemoryRouter>
      <AuthProvider>
        <PrivateInquiry />
      </AuthProvider>
    </MemoryRouter>
  );

  expect(await screen.findByRole("heading", { name: "1:1 문의" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "공개 Q&A 보기" })).toHaveAttribute("href", "/qna");

  fireEvent.change(screen.getByPlaceholderText("이름 또는 닉네임"), {
    target: { value: "비공개 사용자" },
  });
  fireEvent.change(screen.getByPlaceholderText("reply@example.com"), {
    target: { value: "private@example.com" },
  });
  fireEvent.change(screen.getByPlaceholderText("운영팀이 확인해야 하는 내용을 적어 주세요."), {
    target: { value: "사업자 정보 확인이 필요합니다." },
  });
  fireEvent.click(screen.getByRole("button", { name: "1:1 문의 접수" }));

  await waitFor(() =>
    expect(createQna).toHaveBeenCalledWith(
      expect.objectContaining({
        guestEmail: "private@example.com",
        guestName: "비공개 사용자",
        isPublic: false,
        question: "사업자 정보 확인이 필요합니다.",
      })
    )
  );
});
