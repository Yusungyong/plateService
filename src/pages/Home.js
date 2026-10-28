import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import HomeExplorer from "../components/home/HomeExplorer";
import HomeIcon from "../components/home/HomeIcon";
import PhonePreview from "../components/home/PhonePreview";
import StoreButtons from "../components/home/StoreButtons";
import map400 from "../assets/home/app-map-400.webp";
import home400 from "../assets/home/app-home-400.webp";
import "./Home.css";

const MASCOT = "/images/home/plate-mascot.png";
function Brand({ footer = false }) {
  return (
    <Link
      className={`home-brand${footer ? " home-brand--footer" : ""}`}
      to="/"
      aria-label="접시 홈"
    >
      <img src={MASCOT} alt="" width="48" height="48" />
      <span>
        접시<small>plate</small>
      </span>
    </Link>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef(null);
  useEffect(() => {
    const previous = document.title;
    document.title = "접시 — 맛있는 순간을, 우리의 이야기로";
    return () => {
      document.title = previous;
    };
  }, []);
  useEffect(() => {
    if (!menuOpen) return;
    function dismiss(event) {
      if (event.type === "keydown" && event.key === "Escape") {
        setMenuOpen(false);
        menuToggle.current?.focus();
      } else if (
        event.type === "pointerdown" &&
        !event.target.closest(".home-header")
      )
        setMenuOpen(false);
    }
    document.addEventListener("keydown", dismiss);
    document.addEventListener("pointerdown", dismiss);
    const breakpoint = window.matchMedia?.("(min-width: 861px)");
    const closeOnDesktop = (event) => {
      if (event.matches) setMenuOpen(false);
    };
    breakpoint?.addEventListener?.("change", closeOnDesktop);
    return () => {
      document.removeEventListener("keydown", dismiss);
      document.removeEventListener("pointerdown", dismiss);
      breakpoint?.removeEventListener?.("change", closeOnDesktop);
    };
  }, [menuOpen]);
  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="home-site">
      <a className="home-skip" href="#home-main">
        본문 바로가기
      </a>
      <header className="home-header">
        <div className="home-container home-header-inner">
          <Brand />
          <nav
            className={`home-navigation${menuOpen ? " is-open" : ""}`}
            id="home-navigation"
            aria-label="홈페이지 메뉴"
          >
            <a href="#about" onClick={closeMenu}>
              앱 소개
            </a>
            <a href="#features" onClick={closeMenu}>
              주요 기능
            </a>
            <Link to="/faq" onClick={closeMenu}>
              고객지원
            </Link>
            <Link to="/business" onClick={closeMenu}>
              식당 비즈니스
            </Link>
          </nav>
          <a
            href="#download"
            className="home-download-link"
            onClick={closeMenu}
          >
            앱 다운로드 <HomeIcon name="northeast" />
          </a>
          <button
            ref={menuToggle}
            type="button"
            className="home-menu-toggle"
            aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={menuOpen}
            aria-controls="home-navigation"
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span />
            <span />
          </button>
        </div>
      </header>

      <main id="home-main" tabIndex={-1}>
        <section
          className="home-hero"
          id="about"
          tabIndex={-1}
          aria-labelledby="home-title"
        >
          <div className="home-container home-hero-inner">
            <div className="home-hero-copy">
              <p className="home-eyebrow">
                <span /> 맛있는 발견이 모이는 곳
              </p>
              <h1 id="home-title">
                맛있는 순간을,
                <br />
                <em>우리의 이야기로.</em>
              </h1>
              <p className="home-hero-description">
                사진 속 그 맛집, 이번엔 같이 갈래요?
                <br />
                발견하고, 기록하고, 친구와 나누는
                <br className="home-mobile-break" /> 나만의 맛있는 일상.
                접시에서 시작해요.
              </p>
              <StoreButtons />
              <p className="home-availability">iOS · Android에서 만나요</p>
              <a className="home-explore" href="#features">
                <span>접시를 조금 더 알아보기</span>
                <HomeIcon name="arrow" />
              </a>
            </div>
            <div className="home-hero-visual">
              <div className="home-hero-disc" aria-hidden="true">
                <span>
                  GOOD FOOD,
                  <br />
                  BETTER TOGETHER.
                </span>
              </div>
              <div className="home-hero-orbit" aria-hidden="true" />
              <span className="home-hero-note" aria-hidden="true">
                오늘 뭐 먹지?{" "}
                <svg viewBox="0 0 90 44">
                  <path d="M4 7c44-13 70 3 67 27m-9-8 9 10 10-9" />
                </svg>
              </span>
              <PhonePreview />
              <div className="home-map-peek">
                <div>
                  <HomeIcon name="pin" />
                  <strong>내 주변의 발견</strong>
                </div>
                <img
                  src={map400}
                  alt=""
                  width="400"
                  height="870"
                  loading="lazy"
                />
                <span>가까운 곳에도, 새로운 맛</span>
              </div>
              <div className="home-together-note">
                <span className="home-note-icon">
                  <HomeIcon name="heart" />
                </span>
                <div>
                  <small>맛있는 건 함께</small>
                  <strong>다음엔 여기, 같이 가자.</strong>
                </div>
              </div>
              <p className="home-screen-caption">
                휴대폰은 실제 앱 화면 · 주변 문구는 기능 소개
              </p>
            </div>
          </div>
          <div className="home-container home-manifesto">
            <span>한 끼를 넘어, 취향이 되는 순간.</span>
            <div>
              <span>발견하고</span>
              <i>✳</i>
              <span>남겨두고</span>
              <i>✳</i>
              <span>함께하고</span>
            </div>
          </div>
        </section>

        <HomeExplorer />

        <section className="home-social" aria-labelledby="home-social-title">
          <div className="home-container home-social-inner">
            <div className="home-social-copy">
              <p className="home-section-kicker">GOOD TASTE, GOOD COMPANY</p>
              <h2 id="home-social-title">
                맛집 하나로 시작되는,
                <br />
                <em>우리의 다음 약속.</em>
              </h2>
              <p>
                발견한 콘텐츠를 친구와의 대화에 보내보세요.
                <br />
                “여기 어때?” 한마디가 다음 만남의 시작이 돼요.
              </p>
              <ul className="home-social-features">
                <li>
                  <HomeIcon name="chat" />
                  <div>
                    <strong>보고 있던 콘텐츠, 대화로 바로</strong>
                    <span>친구와 사진·영상 콘텐츠를 나눠요.</span>
                  </div>
                </li>
                <li>
                  <HomeIcon name="calendar" />
                  <div>
                    <strong>가고 싶은 곳에서, 만날 약속까지</strong>
                    <span>대화 속에서 함께 갈 곳과 약속을 정해요.</span>
                  </div>
                </li>
              </ul>
              <a className="home-social-link" href="#download">
                같이 먹으면, 더 맛있으니까 <HomeIcon name="arrow" />
              </a>
            </div>
            <figure className="home-conversation">
              <div className="home-conversation-title">
                <span className="home-friend-dot">친구</span>
                <div>
                  <strong>우리의 다음 한 끼</strong>
                  <small>콘텐츠로 이어지는 대화</small>
                </div>
                <HomeIcon name="chat" />
              </div>
              <div className="home-message home-message--friend">
                이번 주말, 뭐 먹을까?
              </div>
              <div className="home-shared-card">
                <div className="home-shared-photo">
                  <img
                    src={home400}
                    alt="접시 콘텐츠 화면에 담긴 음식 사진 일부"
                    width="400"
                    height="870"
                    loading="lazy"
                  />
                </div>
                <div>
                  <span>접시에서 발견한 곳</span>
                  <strong>여기 같이 가보자!</strong>
                  <HomeIcon name="northeast" />
                </div>
              </div>
              <div className="home-message home-message--me">
                맛있는 건 같이 먹어야지 :)
              </div>
              <div className="home-message home-message--friend">
                좋아, 이번엔 여기로! <span aria-hidden="true">🙌</span>
              </div>
              <figcaption>
                친구에게 콘텐츠를 보내는 흐름을 보여주는 예시입니다.
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          className="home-everyday home-container"
          aria-labelledby="home-everyday-title"
        >
          <div className="home-section-heading">
            <p className="home-section-kicker">A LITTLE MORE DELICIOUS</p>
            <h2 id="home-everyday-title">
              평범한 하루에,
              <br className="home-mobile-break" /> 맛있는 선택 하나.
            </h2>
            <p>거창한 계획 없이도, 접시를 열어보세요.</p>
          </div>
          <div className="home-everyday-grid">
            <article>
              <span className="home-everyday-number">01 / DISCOVER</span>
              <HomeIcon name="pin" />
              <h3>낯선 동네에 도착했을 때</h3>
              <p>
                내 주변 지도에서 새로운 음식점을 찾아봐요. 오늘의 발견은
                생각보다 가까이 있어요.
              </p>
            </article>
            <article>
              <span className="home-everyday-number">02 / REMEMBER</span>
              <HomeIcon name="camera" />
              <h3>그 맛을 잊고 싶지 않을 때</h3>
              <p>
                사진과 영상에 장소를 함께 남겨요. 다시 가고 싶은 순간이 내
                기록에 쌓여요.
              </p>
            </article>
            <article>
              <span className="home-everyday-number">03 / TOGETHER</span>
              <HomeIcon name="heart" />
              <h3>맛있는 걸 나누고 싶을 때</h3>
              <p>
                마음에 든 콘텐츠를 친구에게 보내요. 다음 한 끼를 함께 고르는
                재미가 생겨요.
              </p>
            </article>
          </div>
        </section>

        <section
          className="home-install"
          id="download"
          tabIndex={-1}
          aria-labelledby="home-download-title"
        >
          <div className="home-container home-install-inner">
            <div>
              <p className="home-section-kicker">YOUR NEXT DELICIOUS MOMENT</p>
              <h2 id="home-download-title">
                오늘의 맛있는 발견,
                <br />
                접시에 담아보세요.
              </h2>
              <p>
                당신의 취향이 모이고,
                <br className="home-mobile-break" /> 우리의 이야기가 시작되는
                곳.
              </p>
              <StoreButtons />
            </div>
            <div className="home-install-art" aria-hidden="true">
              <div className="home-plate-ring" />
              <img
                src={MASCOT}
                alt=""
                width="512"
                height="512"
                loading="lazy"
              />
              <span>한 끼의 즐거움을, 함께.</span>
            </div>
          </div>
        </section>

        <section
          className="home-support home-container"
          aria-labelledby="home-services-title"
        >
          <div>
            <p className="home-section-kicker">WE’RE HERE FOR YOU</p>
            <h2 id="home-services-title">접시와 더 가까이.</h2>
            <nav aria-label="서비스 바로가기">
              <Link to="/faq">
                자주 묻는 질문 <HomeIcon name="northeast" />
              </Link>
              <Link to="/qna">
                공개 질문·답변 <HomeIcon name="northeast" />
              </Link>
              <Link to="/qna/private">
                비공개 1:1 문의 <HomeIcon name="northeast" />
              </Link>
            </nav>
            <div className="home-support-account">
              <Link to="/login">로그인</Link>
              <span aria-hidden="true">/</span>
              <Link to="/signup">회원가입</Link>
            </div>
          </div>
          <aside className="home-partner">
            <p className="home-section-kicker">FOR YOUR BUSINESS</p>
            <h3>
              우리 식당도
              <br />
              새로운 발견이 되도록.
            </h3>
            <p>
              입점 신청부터 매장 관리까지,
              <br />
              접시 비즈니스에서 함께해요.
            </p>
            <Link to="/business">
              식당 비즈니스 시작하기 <HomeIcon name="arrow" />
            </Link>
          </aside>
        </section>
      </main>

      <footer className="home-footer">
        <div className="home-container">
          <div className="home-footer-top">
            <Brand footer />
            <nav aria-label="하단 메뉴">
              <Link to="/faq">고객지원</Link>
              <Link to="/terms-of-service">이용약관</Link>
              <Link to="/privacy-policy">개인정보 처리방침</Link>
              <a href="mailto:su12ng@gmail.com">su12ng@gmail.com</a>
            </nav>
          </div>
          <div className="home-footer-bottom">
            <p>© {new Date().getFullYear()} 접시 · 운영자 유성용</p>
            <Link to="/admin">
              관리자 로그인 <HomeIcon name="northeast" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
