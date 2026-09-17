import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getAdminEntryPath } from "../config/routes";
import { loginWithPassword } from "../api/authApi";
import { consumeAuthNotice, useAuth } from "../auth/AuthContext";
import PlateBrand from "../components/PlateBrand";

const LOGIN_USERNAME_STORAGE_KEY = "plate-service.remembered-username";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const requestedPath = location.state?.from || "";
  const loginContext = getLoginContext(requestedPath);
  useEffect(() => {
    const previous = document.title;
    document.title = `${loginContext.title} | 접시`;
    return () => { document.title = previous; };
  }, [loginContext.title]);
  const [form, setForm] = useState(() => ({
    username: readRememberedUsername(),
    password: "",
  }));
  const [rememberUsername, setRememberUsername] = useState(() =>
    Boolean(readRememberedUsername())
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [sessionNotice] = useState(() => consumeAuthNotice());

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await loginWithPassword(form);

      const session = login({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
      });

      persistRememberedUsername(rememberUsername ? form.username.trim() : "");
      const nextPath = location.state?.from || getAdminEntryPath(session?.user);
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
          <PlateBrand />
          <span className="login-showcase__badge">{loginContext.audience}</span>
        </div>

        <div className="login-showcase__content">
          <span className="login-showcase__eyebrow">PLATE SERVICE</span>
          <p className="login-context-title" id="login-brand-title">{loginContext.intro}</p>
          <p>{loginContext.description}</p>

          <div className="login-feature-list">{loginContext.features.map((feature, index) => <article key={feature}><span aria-hidden="true">0{index + 1}</span><strong>{feature}</strong></article>)}</div>
        </div>

        <p className="login-showcase__footer">
          {loginContext.nextStep}
        </p>
      </section>

      <section className="login-access" aria-labelledby="login-title">
        <div className="login-access__inner">
          <div className="login-card">
            <div className="login-card__intro">
              <span className="login-card__eyebrow">{loginContext.eyebrow}</span>
              <h1 id="login-title">{loginContext.title}</h1>
              <p>{loginContext.description}</p>
            </div>

            {location.state?.notice ? (
              <div className="api-status api-status--success login-notice" role="status">
                {location.state.notice}
              </div>
            ) : null}

            {sessionNotice ? (
              <div className="api-status api-status--error login-notice" role="alert">
                {sessionNotice}
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
                <Link className="login-card__footer-action" to="/signup" state={{ from: requestedPath }}>
                  회원가입
                </Link>
                <Link className="login-card__footer-action login-card__footer-action--primary" to="/business/signup">
                  로그인 후 입점 신청
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
      audience: "접시 운영자",
      intro: "접시 운영 업무를 이어가세요.",
      nextStep: "로그인 후 요청한 관리자 화면으로 이동합니다.",
      features: ["입점 신청 심사", "매장·콘텐츠 관리", "운영 문의 처리"],
      title: "운영자 로그인",
      description: "접시 내부 운영 업무를 계속하려면 관리자 계정으로 로그인해 주세요.",
    };
  }

  if (path === "/business" || path.startsWith("/business/")) {
    return {
      eyebrow: "BUSINESS ACCESS",
      audience: "식당 담당자",
      intro: "우리 매장의 다음 단계를 확인하세요.",
      nextStep: path === "/business/signup"
        ? "로그인 후 식당 입점 신청서를 작성합니다."
        : "로그인 후 신청 현황 또는 요청한 매장 관리 화면으로 이동합니다.",
      features: ["로그인 후 입점 신청", "신청 현황 확인·보완 제출", "승인된 내 매장 관리"],
      title: "비즈니스 로그인",
      description: "식당 입점 신청과 매장 관리는 로그인이 필요합니다. 접시 계정으로 로그인해 주세요. 계정이 없다면 회원가입 후 신청할 수 있습니다.",
    };
  }

  return {
    eyebrow: "WELCOME BACK",
    audience: "접시 이용자",
    intro: "궁금한 점을 묻고, 답변을 확인하세요.",
    nextStep: "로그인 후 이용하던 화면으로 돌아갑니다.",
    features: ["공개 질문 등록", "비공개 문의 접수", "내 문의 답변 확인"],
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
