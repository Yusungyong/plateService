import React, { useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signup } from "../api/signupApi";
import SignupAgreements from "../legal/SignupAgreements";
import PageLayout from "../components/PageLayout";

const initialForm = {
  username: "",
  email: "",
  password: "",
  passwordConfirm: "",
  nickname: "",
};

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.from;
  const [legalAcceptance, setLegalAcceptance] = useState(null);
  const [documentAttempt, setDocumentAttempt] = useState(0);
  const submission = useRef(null);
  const [form, setForm] = useState(initialForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSubmitting || !legalAcceptance) return;
    const errors = validateSignup(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("입력값을 확인해 주세요.");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const content = JSON.stringify({...form, legalAcceptance});
      if (submission.current?.content !== content) {
        const bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        submission.current = {content, key: Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("")};
      }
      await signup({...form, legalAcceptance: {...legalAcceptance, idempotencyKey: submission.current.key}});
      navigate("/login", {
        replace: true,
        state: {
          from: returnPath,
          notice: "회원가입이 완료되었습니다. 로그인해 주세요.",
        },
      });
    } catch (error) {
      if (error.code === "LEGAL_DOCUMENT_CHANGED" || error.code === "LEGAL_CATALOG_UNAVAILABLE") {setLegalAcceptance(null); setDocumentAttempt(v => v + 1);}
      setMessage(error.message || "회원가입에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      className="signup-page"
      title="회원가입"
      description="접시 서비스 계정을 만듭니다. 가입 후 문의를 남기거나 식당 입점 신청을 진행할 수 있습니다."
    >
      <form className="stack-layout signup-form" onSubmit={handleSubmit}>
        {message ? (
          <div className="api-status api-status--error" role="alert">
            {message}
          </div>
        ) : null}

        <section className="support-panel signup-account-panel">
          <div className="support-panel__header">
            <span className="support-kicker">ACCOUNT</span>
            <h3>계정 정보</h3>
          </div>

          <div className="admin-form">
            <label className="admin-field">
              <span>회원 ID</span>
              <input
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={(event) => updateField("username", event.target.value)}
                aria-invalid={Boolean(fieldErrors.username)}
                placeholder="영문, 숫자 조합"
              />
              <small className="restaurant-field-hint">
                영문과 숫자만 사용해 4~30자로 입력해 주세요.
              </small>
              {fieldErrors.username ? (
                <small className="restaurant-field-error">{fieldErrors.username}</small>
              ) : null}
            </label>

            <label className="admin-field">
              <span>닉네임</span>
              <input
                type="text"
                autoComplete="nickname"
                value={form.nickname}
                onChange={(event) => updateField("nickname", event.target.value)}
                aria-invalid={Boolean(fieldErrors.nickname)}
              />
              {fieldErrors.nickname ? <small className="restaurant-field-error">{fieldErrors.nickname}</small> : null}
            </label>

            <label className="admin-field signup-email-field">
              <span>이메일</span>
              <input
                type="email"
                autoComplete="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? <small className="restaurant-field-error">{fieldErrors.email}</small> : null}
            </label>

            <div className="admin-inline-fields">
              <label className="admin-field">
                <span>비밀번호</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <small className="restaurant-field-hint">
                  비밀번호는 8자 이상으로 입력해 주세요.
                </small>
                {fieldErrors.password ? (
                  <small className="restaurant-field-error">{fieldErrors.password}</small>
                ) : null}
              </label>

              <label className="admin-field">
                <span>비밀번호 확인</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={form.passwordConfirm}
                  onChange={(event) => updateField("passwordConfirm", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.passwordConfirm)}
                />
                {fieldErrors.passwordConfirm ? (
                  <small className="restaurant-field-error">{fieldErrors.passwordConfirm}</small>
                ) : null}
              </label>
            </div>

          </div>
        </section>

        <section className="support-panel signup-completion-panel">
          <SignupAgreements key={documentAttempt} onChange={setLegalAcceptance} disabled={isSubmitting} />

          <div className="admin-actions signup-actions">
            <Link className="restaurant-text-link restaurant-text-link--secondary" to="/login" state={{ from: returnPath }}>
              이미 계정이 있어요
            </Link>
            <button className="button-primary" type="submit" disabled={isSubmitting || !legalAcceptance}>
              {isSubmitting ? "가입 중" : "가입하기"}
            </button>
          </div>
        </section>
      </form>
    </PageLayout>
  );
}

function validateSignup(form) {
  const errors = {};

  if (!isValidUsername(form.username)) {
    errors.username = "회원 ID는 영문과 숫자 조합 4~30자로 입력해 주세요.";
  }

  if (!isValidEmail(form.email)) {
    errors.email = "올바른 이메일을 입력해 주세요.";
  }

  if (String(form.password || "").length < 8) {
    errors.password = "비밀번호는 8자 이상이어야 합니다.";
  }

  if (form.password !== form.passwordConfirm) {
    errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  }

  if (!String(form.nickname || "").trim()) {
    errors.nickname = "닉네임을 입력해 주세요.";
  }

  return errors;
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function isValidUsername(value) {
  return /^[A-Za-z0-9]{4,30}$/.test(String(value || "").trim());
}

export default Signup;
