import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { createQna } from "../api/qnaApi";
import PageLayout from "../components/PageLayout";

const privateInquiryCategories = ["계정문의", "사업자문의", "결제문의", "오류제보", "기타"];

const initialPrivateInquiryForm = {
  authorName: "",
  email: "",
  category: "계정문의",
  question: "",
};

function PrivateInquiry() {
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState(() => ({
    ...initialPrivateInquiryForm,
    authorName: user?.displayName || user?.username || "",
    email: user?.email || "",
  }));
  const [submitMessage, setSubmitMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSuccess = submitMessage.includes("접수되었습니다");

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm({
      ...initialPrivateInquiryForm,
      authorName: user?.displayName || user?.username || "",
      email: user?.email || "",
    });
    setSubmitMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
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
      await createQna(payload);
      setSubmitMessage("1:1 문의가 접수되었습니다. 운영팀이 확인한 뒤 입력한 이메일로 답변을 안내합니다.");
      setForm((current) => ({
        ...initialPrivateInquiryForm,
        authorName: current.authorName,
        email: current.email,
      }));
    } catch (error) {
      setSubmitMessage(error.message || "1:1 문의 접수에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      title="1:1 문의"
      className="support-page support-page--qna support-page--private-inquiry"
      description="계정, 결제, 사업자 정보처럼 개인 확인이 필요한 내용은 비공개 문의로 접수해 주세요."
    >
      <div className="stack-layout">
        <section className="support-panel qna-scope-panel">
          <div className="support-panel__header">
            <span className="support-kicker">비공개 문의</span>
            <h3>문의 내용과 답변은 공개 Q&A 목록에 표시되지 않습니다.</h3>
          </div>
          <p className="page-layout__description">
            운영팀 확인을 위해 답변 받을 이메일은 필수입니다. 비밀번호, 카드 전체 번호, 주민등록번호처럼 민감한 정보는 입력하지 마세요.
          </p>
        </section>

        <section className="support-panel qna-compose-panel qna-compose-panel--page">
          <div className="qna-compose-panel__summary">
            <span className="support-kicker">문의 접수</span>
            <strong>비공개 1:1 문의</strong>
            <span>답변은 입력한 이메일로 안내됩니다. 공개해도 괜찮은 일반 질문은 공개 Q&A에 남겨 주세요.</span>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="api-status qna-scope-notice" role="note">
              공개 Q&A 목록에는 표시되지 않는 문의입니다. 운영팀 확인과 답변 안내 목적으로만 사용됩니다.
            </div>

            <div className="admin-inline-fields">
              <label className="admin-field">
                <span>작성자명</span>
                <input
                  type="text"
                  value={form.authorName}
                  onChange={(event) => updateField("authorName", event.target.value)}
                  placeholder={isAuthenticated ? "표시 이름 입력" : "이름 또는 닉네임"}
                />
              </label>

              <label className="admin-field">
                <span>답변 받을 이메일</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  placeholder="reply@example.com"
                />
                <small className="restaurant-field-hint">
                  문의 처리 안내와 운영팀 답변을 받을 이메일입니다.
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
                value={form.question}
                onChange={(event) => updateField("question", event.target.value)}
                placeholder="운영팀이 확인해야 하는 내용을 적어 주세요."
              />
              <small className="restaurant-field-hint">
                계정 확인에 필요한 최소 정보만 적어 주세요. 민감정보는 입력하지 않아도 됩니다.
              </small>
            </label>

            {submitMessage ? (
              <div className={isSuccess ? "api-status api-status--success" : "api-status api-status--error"}>
                {submitMessage}
              </div>
            ) : null}

            <div className="admin-actions qna-write-actions">
              <button type="submit" className="button-primary" disabled={isSubmitting}>
                {isSubmitting ? "접수 중..." : "1:1 문의 접수"}
              </button>
              <button type="button" onClick={resetForm} disabled={isSubmitting}>
                입력 초기화
              </button>
              <Link className="support-page-action support-page-action--secondary" to="/qna">
                공개 Q&A 보기
              </Link>
            </div>
          </form>
        </section>
      </div>
    </PageLayout>
  );
}

export default PrivateInquiry;
