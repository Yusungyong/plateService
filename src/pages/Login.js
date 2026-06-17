import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginWithPassword } from "../api/authApi";
import { useAuth } from "../auth/AuthContext";

const LOGIN_USERNAME_STORAGE_KEY = "plate-service.remembered-username";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const requestedPath = location.state?.from || "";
  const loginContext = getLoginContext(requestedPath);
  const [form, setForm] = useState(() => ({
    username: readRememberedUsername(),
    password: "",
  }));
  const [rememberUsername, setRememberUsername] = useState(() =>
    Boolean(readRememberedUsername())
  );
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

      persistRememberedUsername(rememberUsername ? form.username.trim() : "");
      const nextPath = location.state?.from || "/faq";
      navigate(nextPath, { replace: true });
    } catch (error) {
      setErrorMessage(error.message || "로그인에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="login-showcase" aria-labelledby="login-brand-title">
        <div className="login-showcase__topline">
          <Link className="login-brand" to="/faq">
            <span className="login-brand__mark" aria-hidden="true">P</span>
            <span>
              <strong>접시</strong>
              <small>PLATE SERVICE</small>
            </span>
          </Link>
          <span className="login-showcase__badge">운영 서비스</span>
        </div>

        <div className="login-showcase__content">
          <span className="login-showcase__eyebrow">PLATE OPERATIONS</span>
          <h1 id="login-brand-title">
            맛있는 연결을 만드는
            <br />
            접시 운영 공간
          </h1>
          <p>
            매장과 콘텐츠, 시즌 큐레이션을 한곳에서 관리하고 사용자에게 더 좋은 맛집 경험을 전달합니다.
          </p>

          <div className="login-feature-list">
            <article>
              <span aria-hidden="true">01</span>
              <div>
                <strong>입점 신청</strong>
                <p>식당 담당자가 계정 생성부터 서류 제출까지 직접 진행합니다.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">02</span>
              <div>
                <strong>매장 관리</strong>
                <p>승인된 매장은 기본 정보와 메뉴를 owner 권한으로 관리합니다.</p>
              </div>
            </article>
            <article>
              <span aria-hidden="true">03</span>
              <div>
                <strong>운영자 관리</strong>
                <p>내부 운영자는 별도 관리자 권한으로 승인과 콘텐츠를 관리합니다.</p>
              </div>
            </article>
          </div>
        </div>

        <p className="login-showcase__footer">
          접시 내부 운영자와 식당 비즈니스 사용자를 위한 공간입니다.
        </p>
      </section>

      <section className="login-access" aria-labelledby="login-title">
        <div className="login-access__inner">
          <div className="login-card">
            <div className="login-card__intro">
              <span className="login-card__eyebrow">{loginContext.eyebrow}</span>
              <h2 id="login-title">{loginContext.title}</h2>
              <p>{loginContext.description}</p>
            </div>

            {location.state?.notice ? (
              <div className="api-status api-status--success login-notice" role="status">
                {location.state.notice}
              </div>
            ) : null}

            <form className="login-form" onSubmit={handleSubmit}>
              <label className="login-field">
                <span>아이디</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={form.username}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, username: event.target.value }))
                  }
                  placeholder="아이디를 입력해 주세요"
                  autoFocus
                />
              </label>

              <label className="login-field">
                <span>비밀번호</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder="비밀번호를 입력해 주세요"
                />
              </label>

              <div className="login-form__options">
                <label className="login-remember">
                  <input
                    type="checkbox"
                    checked={rememberUsername}
                    onChange={(event) => setRememberUsername(event.target.checked)}
                  />
                  <span>아이디 기억하기</span>
                </label>
                <span>계정 문의는 서비스 담당자에게 요청해 주세요.</span>
              </div>

              {errorMessage ? (
                <div className="login-error" role="alert">
                  {errorMessage}
                </div>
              ) : null}

              <button className="login-submit" type="submit" disabled={isSubmitting}>
                {isSubmitting ? "로그인 중..." : "로그인"}
              </button>
            </form>

            <div className="login-card__footer login-card__footer--links" aria-label="계정 관련 링크">
              <span className="login-card__footer-label">접시가 처음이신가요?</span>
              <div className="login-card__footer-actions">
                <Link className="login-card__footer-action" to="/signup">
                  회원가입
                </Link>
                <Link className="login-card__footer-action login-card__footer-action--primary" to="/business/signup">
                  식당 입점 신청
                </Link>
                <Link className="login-card__footer-action login-card__footer-action--secondary" to="/qna">
                  문의하기
                </Link>
              </div>
            </div>
          </div>

          <div className="login-security-note">
            <span aria-hidden="true">●</span>
            <p>
              보안을 위해 공용 기기에서는 사용 후 반드시 로그아웃해 주세요.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

function getLoginContext(path) {
  if (path === "/admin" || path.startsWith("/admin/")) {
    return {
      eyebrow: "ADMIN ACCESS",
      title: "운영자 로그인",
      description: "접시 내부 운영 업무를 계속하려면 관리자 계정으로 로그인해 주세요.",
    };
  }

  if (path.startsWith("/business/")) {
    return {
      eyebrow: "BUSINESS ACCESS",
      title: "비즈니스 로그인",
      description: "입점 신청 현황 또는 승인된 매장을 관리하려면 비즈니스 계정으로 로그인해 주세요.",
    };
  }

  return {
    eyebrow: "WELCOME BACK",
    title: "로그인",
    description: "접시 서비스와 고객지원 기능을 이용하려면 로그인해 주세요.",
  };
}

function readRememberedUsername() {
  try {
    return window.localStorage.getItem(LOGIN_USERNAME_STORAGE_KEY) || "";
  } catch (error) {
    return "";
  }
}

function persistRememberedUsername(username) {
  try {
    if (username) {
      window.localStorage.setItem(LOGIN_USERNAME_STORAGE_KEY, username);
    } else {
      window.localStorage.removeItem(LOGIN_USERNAME_STORAGE_KEY);
    }
  } catch (error) {
    // Keep login available even when browser storage is restricted.
  }
}

export default Login;
