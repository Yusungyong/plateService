import useActiveForm from "../components/useActiveForm";
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createQna } from "../api/qnaApi";
import PageLayout from "../components/PageLayout";
import UnsavedChangesGuard from "../components/UnsavedChangesGuard";

const privateInquiryCategories = ["계정문의", "사업자문의", "결제문의", "오류제보", "기타"];

const initialPrivateInquiryForm = {
  authorName: "",
  email: "",
  category: "계정문의",
  question: "",
};

function PrivateInquiry() {
  const { user } = useAuth();
  return <InquiryForm key={user?.username || "guest"} />;
}

function InquiryForm() {
  const {active} = useActiveForm();
  const location = useLocation();
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState(() => ({
    ...initialPrivateInquiryForm,
    category: location.state?.applicationId ? "사업자문의" : "계정문의",
    question: location.state?.applicationId ? `입점 신청 번호: ${location.state.applicationId}\n` : "",
    authorName: user?.displayName || user?.username || "",
    email: user?.email || "",
  }));
  const [baseline] = useState(form);
  const [receipt, setReceipt] = useState(null);
  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuccess = submitMessage.includes("접수되었습니다");

  function updateField(field, value) {
    setReceipt(null);
    setSubmitMessage("");
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    if (dirty && !window.confirm("입력한 문의 내용을 지울까요?")) return;
    setForm({
      ...initialPrivateInquiryForm,
      authorName: user?.displayName || user?.username || "",
      email: user?.email || "",
    });
    setSubmitMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitMessage("");

    const question = form.question.trim();
    const guestName = form.authorName.trim();
    const guestEmail = form.email.trim();

    if (!question) {
      setSubmitMessage("문의 내용을 입력해 주세요.");
      return;
    }

    if (!guestEmail) {
      setSubmitMessage("답변을 받을 이메일을 입력해 주세요.");
      return;
    }

    if (!isAuthenticated && !guestName) {
      setSubmitMessage("비로그인 사용자는 작성자명을 입력해 주세요.");
      return;
    }

    const payload = {
      category: form.category,
      question,
      isPublic: false,
      guestEmail,
    };

    if (guestName) {
      payload.guestName = guestName;
    }

    setIsSubmitting(true);

    try {
      const response = await createQna(payload);
      if (!active.current) return;
      setReceipt((response?.data || response)?.qnaId || "확인 필요");
      setSubmitMessage("비공개 1:1 문의가 접수되었습니다.");
      setForm((current) => ({
        ...initialPrivateInquiryForm,
        authorName: current.authorName,
        email: current.email,
      }));
    } catch (error) {
      if (!active.current) return;
      setSubmitMessage(error.message || "비공개 1:1 문의 접수에 실패했습니다.");
    } finally {
      if (active.current) setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      title="비공개 1:1 문의"
      className="support-page support-page--qna support-page--private-inquiry"
      description="계정, 결제, 사업자 정보처럼 개인 확인이 필요한 내용은 비공개 문의로 접수해 주세요."
    >
      <div className="stack-layout">
        <UnsavedChangesGuard pending={isSubmitting} when={dirty && !isSubmitting && !receipt} />
        {receipt && <div className="api-status api-status--success" role="status">
          <strong>접수 번호: {receipt}</strong>
          <p>{isAuthenticated ? "내 문의에서 처리 상태와 답변을 확인할 수 있습니다." : "추가 확인이 필요하면 접수 번호와 함께 공식 이메일 su12ng@gmail.com으로 문의해 주세요."}</p>
          {isAuthenticated && <Link to="/qna/my">내 문의 확인</Link>}
        </div>}
        <section className="support-panel qna-compose-panel qna-compose-panel--page">
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="api-status qna-scope-notice" role="note">
              문의는 공개되지 않습니다. 비밀번호·주민등록번호·카드 전체 번호는 입력하지 마세요.
            </div>

            <div className="admin-inline-fields">
              <label className="admin-field">
                <span>작성자명</span>
                <input
                  type="text"
                  maxLength={100}
                  required={!isAuthenticated}
                  value={form.authorName}
                  onChange={(event) => updateField("authorName", event.target.value)}
                  placeholder={isAuthenticated ? "표시 이름 입력" : "이름 또는 닉네임"}
                />
              </label>

              <label className="admin-field">
                <span>연락 이메일</span>
                <input
                  type="email"
                  maxLength={255}
                  required
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="reply@example.com"
                />
                <small className="restaurant-field-hint">
                  문의 확인에 필요한 연락처입니다.
                </small>
              </label>
            </div>

            <label className="admin-field qna-category-field">
              <span>문의 유형</span>
              <select
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
              >
                {privateInquiryCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="admin-field">
              <span>문의 내용</span>
              <textarea
                rows={7}
                required
                maxLength={10000}
                value={form.question}
                onChange={(event) => updateField("question", event.target.value)}
                placeholder="운영팀이 확인해야 하는 내용을 적어 주세요."
              />
              <small className="restaurant-field-hint">
                계정 확인에 필요한 최소 정보만 적어 주세요. 민감정보는 입력하지 않아도 됩니다.
              </small>
            </label>

            {submitMessage ? (
              <div role={isSuccess ? "status" : "alert"} className={isSuccess ? "api-status api-status--success" : "api-status api-status--error"}>
                {submitMessage}
              </div>
            ) : null}

            <div className="admin-actions qna-write-actions">
              <button type="submit" className="button-primary" disabled={isSubmitting}>
                {isSubmitting ? "접수 중..." : "비공개 1:1 문의 접수"}
              </button>
              <button type="button" onClick={resetForm} disabled={isSubmitting}>
                입력 초기화
              </button>
              <Link className="support-page-action support-page-action--secondary" to="/qna">
                공개 질문·답변 보기
              </Link>
            </div>
          </form>
        </section>
      </div>
    </PageLayout>
  );
}

export default PrivateInquiry;
