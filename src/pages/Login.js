import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { loginWithPassword } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [form, setForm] = useState({ username: "", password: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await loginWithPassword(form);

      login({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      const nextPath = location.state?.from || "/faq";
      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="login-page">
      <div className="login-card">
        <div className="login-card__intro">
          <span className="support-kicker">로그인</span>
          <h2>로그인</h2>
          <p>FAQ 관리와 고객지원 기능 이용을 위해 먼저 로그인해 주세요.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label className="admin-field">
            <span>아이디</span>
            <input
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(event) =>
                setForm((current) => ({ ...current, username: event.target.value }))
              }
              placeholder="아이디 입력"
            />
          </label>

          <label className="admin-field">
            <span>비밀번호</span>
            <input
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              placeholder="비밀번호 입력"
            />
          </label>

          {errorMessage ? <div className="api-status api-status--error">{errorMessage}</div> : null}

          <button className="login-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중..." : "로그인"}
          </button>
        </form>
      </div>
    </section>
  );
}

export default Login;
