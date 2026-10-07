import useActiveForm from "../components/useActiveForm";
import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { signup } from "../api/signupApi";
import PageLayout from "../components/PageLayout";
import UnsavedChangesGuard from "../components/UnsavedChangesGuard";

const initialForm = {
  username: "",
  email: "",
  password: "",
  passwordConfirm: "",
  nickname: "",
  termsAccepted: false,
  privacyAccepted: false,
};

function Signup() {
  const {active, completed} = useActiveForm();
  const navigate = useNavigate();
  const location = useLocation();
  const returnPath = location.state?.from;
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

    if (isSubmitting) return;
    const errors = validateSignup(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setMessage("입력값을 확인해 주세요.");
      setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 0);
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await signup(form);
      if (!active.current) return;
      completed.current = true;
      navigate("/login", {
        replace: true,
        state: {
          from: returnPath,
          notice: "회원가입이 완료되었습니다. 로그인해 주세요.",
        },
      });
    } catch (error) {
      if (!active.current) return;
      const fields = error.payload?.fieldErrors || error.payload?.data?.fieldErrors || error.payload?.data?.fields;
      if (fields && typeof fields === "object") { setFieldErrors(fields); setTimeout(() => document.querySelector('[aria-invalid="true"]')?.focus(), 0); }
      setMessage(error.message || "회원가입에 실패했습니다.");
    } finally {
      if (active.current) setIsSubmitting(false);
    }
  }

  return (
    <PageLayout
      className="signup-page"
      title="회원가입"
      description="접시 서비스 계정을 만듭니다. 가입 후 문의를 남기거나 식당 입점 신청을 진행할 수 있습니다."
    >
      <UnsavedChangesGuard pending={isSubmitting} completed={completed} when={Boolean(form.username || form.email || form.nickname || form.password) && !isSubmitting} />
      <form className="stack-layout signup-form" noValidate onSubmit={handleSubmit}>
        {message ? (
          <div className="api-status api-status--error" role="alert">
            {message}
          </div>
        ) : null}

        <section className="support-panel signup-account-panel">
          <div className="support-panel__header">
            <span className="support-kicker">ACCOUNT</span>
            <h2>계정 정보</h2>
          </div>

          <div className="admin-form">
            <label className="admin-field">
              <span>회원 ID</span>
              <input
                type="text"
                autoComplete="username"
                id="signup-username" required maxLength={30} aria-describedby={fieldErrors.username ? "signup-username-error" : undefined} value={form.username}
                onChange={(event) => updateField("username", event.target.value)}
                aria-invalid={Boolean(fieldErrors.username)}
                placeholder="영문, 숫자 조합"
              />
              <small className="restaurant-field-hint">
                영문과 숫자만 사용해 4~30자로 입력해 주세요.
              </small>
              {fieldErrors.username ? (
                <small id="signup-username-error" className="restaurant-field-error">{fieldErrors.username}</small>
              ) : null}
            </label>

            <label className="admin-field">
              <span>닉네임</span>
              <input
                type="text"
                autoComplete="nickname"
                id="signup-nickname" required maxLength={100} aria-describedby={fieldErrors.nickname ? "signup-nickname-error" : undefined} value={form.nickname}
                onChange={(event) => updateField("nickname", event.target.value)}
                aria-invalid={Boolean(fieldErrors.nickname)}
              />
              {fieldErrors.nickname ? <small id="signup-nickname-error" className="restaurant-field-error">{fieldErrors.nickname}</small> : null}
            </label>

            <label className="admin-field signup-email-field">
              <span>이메일</span>
              <input
                type="email"
                autoComplete="email"
                id="signup-email" required maxLength={320} aria-describedby={fieldErrors.email ? "signup-email-error" : undefined} value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                aria-invalid={Boolean(fieldErrors.email)}
              />
              {fieldErrors.email ? <small id="signup-email-error" className="restaurant-field-error">{fieldErrors.email}</small> : null}
            </label>

            <div className="admin-inline-fields">
              <label className="admin-field">
                <span>비밀번호</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  id="signup-password" required maxLength={64} aria-describedby={fieldErrors.password ? "signup-password-error" : undefined} value={form.password}
                  onChange={(event) => updateField("password", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.password)}
                />
                <small className="restaurant-field-hint">
                  비밀번호는 8~64자로 입력해 주세요.
                </small>
                {fieldErrors.password ? (
                  <small id="signup-password-error" className="restaurant-field-error">{fieldErrors.password}</small>
                ) : null}
              </label>

              <label className="admin-field">
                <span>비밀번호 확인</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  id="signup-passwordConfirm" required maxLength={64} aria-describedby={fieldErrors.passwordConfirm ? "signup-passwordConfirm-error" : undefined} value={form.passwordConfirm}
                  onChange={(event) => updateField("passwordConfirm", event.target.value)}
                  aria-invalid={Boolean(fieldErrors.passwordConfirm)}
                />
                {fieldErrors.passwordConfirm ? (
                  <small id="signup-passwordConfirm-error" className="restaurant-field-error">{fieldErrors.passwordConfirm}</small>
                ) : null}
              </label>
            </div>

          </div>
        </section>

        <section className="support-panel signup-completion-panel">
          <div className="signup-agreements">
            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(event) => updateField("termsAccepted", event.target.checked)}
              />
              <span>이용약관에 동의합니다.</span>
            </label>
            <small className="restaurant-field-hint">
              <Link to="/terms-of-service" target="_blank" rel="noopener noreferrer">이용약관 전문 보기 (새 창)</Link>
            </small>
            {fieldErrors.termsAccepted ? (
              <small className="restaurant-field-error">{fieldErrors.termsAccepted}</small>
            ) : null}

            <label className="admin-toggle">
              <input
                type="checkbox"
                checked={form.privacyAccepted}
                onChange={(event) => updateField("privacyAccepted", event.target.checked)}
              />
              <span>개인정보 처리방침에 동의합니다.</span>
            </label>
            <small className="restaurant-field-hint">
              <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer">개인정보 처리방침 전문 보기 (새 창)</Link>
            </small>
            {fieldErrors.privacyAccepted ? (
              <small className="restaurant-field-error">{fieldErrors.privacyAccepted}</small>
            ) : null}
          </div>

          <div className="admin-actions signup-actions">
            <Link className="signup-existing-account" to="/login" state={{ from: returnPath }}>
              이미 계정이 있어요
            </Link>
            <button className="button-primary" type="submit" disabled={isSubmitting}>
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

  if (!isValidEmail(form.email) || form.email.length > 320) {
    errors.email = "올바른 이메일을 입력해 주세요.";
  }

  if ((String(form.password || "").length < 8 || String(form.password || "").length > 64)) {
    errors.password = "비밀번호는 8~64자여야 합니다.";
  }

  if (form.password !== form.passwordConfirm) {
    errors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
  }

  if (!String(form.nickname || "").trim() || form.nickname.length > 100) {
    errors.nickname = "닉네임은 1~100자로 입력해 주세요.";
  }

  if (!form.termsAccepted) {
    errors.termsAccepted = "이용약관 동의가 필요합니다.";
  }

  if (!form.privacyAccepted) {
    errors.privacyAccepted = "개인정보 처리방침 동의가 필요합니다.";
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
