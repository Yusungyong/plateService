import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { APP_DOWNLOADS } from "../config/appDownloads";
import "./Home.css";

const ASSETS = "/images/home";
const APP_SCREENS = {
  "app-home": "KakaoTalk_20260915_211008421_02.png",
  "app-map": "KakaoTalk_20260915_211008421_01.png",
  "app-profile": "KakaoTalk_20260915_211008421.png",
};

function StoreIcon({ platform }) {
  return platform === "ios" ? (
    <svg viewBox="0 0 24 28" aria-hidden="true"><path fill="currentColor" d="M19.5 14.8c0-3 2.5-4.5 2.6-4.6-1.5-2.2-3.8-2.5-4.6-2.5-1.9-.2-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1-2.1 0-4 1.2-5.1 3-2.2 3.8-.6 9.5 1.5 12.5 1 1.5 2.2 3.1 3.9 3 1.6-.1 2.2-1 4.2-1s2.5 1 4.2 1c1.7 0 2.8-1.5 3.8-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.4-1.3-3.4-5zM16.3 5.7c.8-1.1 1.5-2.5 1.3-4-1.3.1-2.9.9-3.8 2-.8.9-1.6 2.4-1.4 3.8 1.5.1 3-.7 3.9-1.8z" /></svg>
  ) : (
    <svg viewBox="0 0 28 30" aria-hidden="true"><path fill="#42c4ef" d="M2 1 17 15 2 29z"/><path fill="#48d38b" d="m2 1 18 10-3 4z"/><path fill="#ffcb45" d="m20 11 6 3q2 1 0 2l-6 3-3-4z"/><path fill="#ff6376" d="m17 15 3 4L2 29z"/></svg>
  );
}

function StoreButtons({ onUnavailable }) {
  return <div className="home-store-buttons">{Object.entries(APP_DOWNLOADS).map(([platform, store]) => {
    const content = <><StoreIcon platform={platform} /><span><strong>{store.name}</strong><small>{store.url ? "다운로드하기" : "설치 안내"}</small></span></>;
    return store.url
      ? <a className="home-store-button" key={platform} href={store.url} target="_blank" rel="noopener noreferrer" aria-label={`${store.name}에서 접시 다운로드 (새 창)`}>{content}</a>
      : <button className="home-store-button" key={platform} type="button" onClick={() => onUnavailable(platform)} aria-label={`${store.name} 설치 안내`}>{content}</button>;
  })}</div>;
}

function Phone({ screen, className, label }) {
  return <figure className={`home-phone ${className}`}>
    <div className="home-phone-screen"><img src={`${ASSETS}/${APP_SCREENS[screen]}`} alt={label} width="1206" height="2622" fetchPriority={screen === "app-home" ? "high" : "auto"} /></div>
    <span className="home-phone-camera" aria-hidden="true" />
  </figure>;
}

function DownloadDialog({ platform, onClose }) {
  const ref = useRef(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (dialog.showModal) dialog.showModal();
    else dialog.setAttribute("open", "");
    return () => { if (dialog.open && dialog.close) dialog.close(); };
  }, []);
  return <dialog ref={ref} className="home-download-dialog" aria-labelledby={id} onCancel={onClose} onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <button type="button" className="home-dialog-close" aria-label="설치 안내 닫기" onClick={onClose}>×</button>
    <img src={`${ASSETS}/plate-mascot.png`} alt="" width="100" height="100" />
    <h2 id={id}>{platform === "android" ? "Android" : "iPhone"} 설치 안내</h2>
    <p>공식 다운로드 링크는 준비 중이에요.<br />설치 관련 문의는 아래 이메일로 보내 주세요.</p>
    <a href="mailto:su12ng@gmail.com?subject=%EC%A0%91%EC%8B%9C%20%EC%95%B1%20%EC%84%A4%EC%B9%98%20%EB%AC%B8%EC%9D%98">su12ng@gmail.com <span aria-hidden="true">↗</span></a>
  </dialog>;
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [platform, setPlatform] = useState(null);
  useEffect(() => {
    const previous = document.title;
    document.title = "접시 — 오늘의 맛있는 발견";
    return () => { document.title = previous; };
  }, []);
  const closeMenu = () => setMenuOpen(false);
  return <div className="home-site home-site--refined">
    <a className="home-skip" href="#home-main">본문 바로가기</a>
    <header className="home-header">
      <div className="home-container home-header-inner">
        <Link className="home-brand" to="/" aria-label="접시 홈"><img src={`${ASSETS}/plate-mascot.png`} alt="" width="72" height="72" /><span>접시</span></Link>
        <nav className={`home-navigation${menuOpen ? " is-open" : ""}`} id="home-navigation" aria-label="홈페이지 메뉴">
          <a href="#about" onClick={closeMenu}>앱 소개</a>
          <a href="#features" onClick={closeMenu}>주요 기능</a>
          <Link to="/faq" onClick={closeMenu}>고객지원</Link>
          <Link to="/business" onClick={closeMenu}>식당 비즈니스</Link>
        </nav>
        <a href="#download" className="home-download-link" onClick={closeMenu}>앱 설치 안내 <span aria-hidden="true">↗</span></a>
        <button type="button" className="home-menu-toggle" aria-label={menuOpen ? "메뉴 닫기" : "메뉴 열기"} aria-expanded={menuOpen} aria-controls="home-navigation" onClick={() => setMenuOpen(!menuOpen)}><span /><span /></button>
      </div>
    </header>

    <main id="home-main">
      <section className="home-hero" id="about" tabIndex={-1} aria-labelledby="home-title">
        <div className="home-container home-hero-inner">
          <div className="home-hero-copy">
            <p className="home-eyebrow">음식으로 연결되는 일상, 접시</p>
            <h1 id="home-title">오늘의 맛있는 발견,<br />접시에 담아보세요<span className="home-title-dot">.</span></h1>
            <p className="home-hero-description">음식 사진으로 발견하고, 지도로 찾아보고.<br />다시 만나고 싶은 맛을 나만의 기록으로 남겨요.</p>
            <StoreButtons onUnavailable={setPlatform} />
            <p className="home-availability">공식 스토어 링크는 준비 중입니다.</p>
            <a className="home-explore" href="#features">접시는 어떻게 쓰나요? <span aria-hidden="true">↓</span></a>
          </div>
          <div className="home-hero-visual">
            <div className="home-hero-halo" aria-hidden="true" />
            <Phone screen="app-map" className="home-phone--back" label="접시 앱의 내 주변 지도와 음식점 탐색 화면" />
            <Phone screen="app-home" className="home-phone--front" label="접시 앱의 음식 사진과 영상 콘텐츠 홈 화면" />
            <span className="home-screen-caption">접시 앱 실제 화면</span>
          </div>
        </div>
      </section>

      <section className="home-product home-container" id="features" tabIndex={-1} aria-labelledby="home-features-title">
        <div className="home-section-heading"><div><p className="home-section-kicker">DISCOVER. EXPLORE. REMEMBER.</p><h2 id="home-features-title">먹고 싶은 순간부터,<br />다시 찾고 싶은 순간까지</h2><p>접시의 실제 화면으로 살펴보세요.</p></div></div>
        <div className="home-product-grid">{[
          {screen:"app-home", number:"01", title:"사진에서 시작되는 발견", description:"음식 사진과 영상을 둘러보며 오늘 먹고 싶은 메뉴를 찾아보세요.", alt:"음식 사진과 영상이 모여 있는 접시 콘텐츠 홈", className:"content"},
          {screen:"app-map", number:"02", title:"지도에서 만나는 장소", description:"내 주변 음식점을 지도에서 살펴보고, 음식 종류별로 찾아보세요.", alt:"음식점 위치와 음식 종류 필터를 보여 주는 접시 내 주변 지도", className:"map"},
          {screen:"app-profile", number:"03", title:"내 취향이 쌓이는 기록", description:"내가 남긴 콘텐츠와 좋아요한 음식을 프로필에서 다시 만나보세요.", alt:"최근 내 콘텐츠와 좋아요를 모아 보여 주는 접시 프로필", className:"profile"},
        ].map(item => <article className={`home-product-card home-product-card--${item.className}`} key={item.screen}><div className="home-product-copy"><span>{item.number}</span><h3>{item.title}</h3><p>{item.description}</p></div><div className="home-product-screen"><img src={`${ASSETS}/${APP_SCREENS[item.screen]}`} width="1206" height="2622" loading="lazy" alt={item.alt} /></div></article>)}</div>
        <p className="home-product-caption">접시 앱 실제 화면 · 콘텐츠와 화면 구성은 업데이트에 따라 달라질 수 있습니다.</p>
      </section>

      <section className="home-journey home-container" aria-labelledby="home-journey-title"><h2 id="home-journey-title">오늘의 한 끼, 이렇게 찾아보세요</h2><ol><li><span>01</span><div><h3>마음에 드는 음식 발견</h3><p>콘텐츠 홈에서 사진과 영상을 둘러봐요.</p></div></li><li><span>02</span><div><h3>주변 장소 살펴보기</h3><p>내 주변 지도에서 음식점을 찾아봐요.</p></div></li><li><span>03</span><div><h3>나만의 취향 모아보기</h3><p>좋아요한 음식과 내 콘텐츠를 다시 봐요.</p></div></li></ol></section>

      <section className="home-install home-container" id="download" tabIndex={-1} aria-labelledby="home-download-title"><div className="home-install-panel"><div><p className="home-section-kicker">MEET PLATE</p><h2 id="home-download-title">다음 한 끼의 발견을<br />접시와 함께하세요.</h2><p>공식 App Store·Google Play 링크는 준비 중입니다.<br />버튼을 누르면 설치 문의 방법을 안내해 드려요.</p></div><StoreButtons onUnavailable={setPlatform} /></div></section>

      <section className="home-support home-container" id="services" tabIndex={-1} aria-labelledby="home-services-title"><div className="home-support-main"><p className="home-section-kicker">SUPPORT</p><h2 id="home-services-title">도움이 필요하신가요?</h2><p>궁금한 점을 확인하고, 필요한 도움을 받아보세요.</p><nav aria-label="서비스 바로가기"><Link to="/faq">자주 묻는 질문 <span aria-hidden="true">↗</span></Link><Link to="/qna">공개 질문·답변 <span aria-hidden="true">↗</span></Link><Link to="/qna/private">비공개 1:1 문의 <span aria-hidden="true">↗</span></Link></nav><div className="home-support-account"><Link to="/login">로그인</Link><Link to="/signup">회원가입</Link></div></div><aside className="home-partner"><p className="home-section-kicker">FOR YOUR BUSINESS</p><h2>우리 식당도<br />접시와 함께</h2><p>로그인 후 입점 신청부터<br />신청 현황 확인·매장 관리까지 한곳에서.</p><Link to="/business">식당 비즈니스 시작하기 <span aria-hidden="true">→</span></Link></aside></section>

    </main>

    <footer className="home-footer home-container"><div className="home-footer-top"><Link className="home-brand home-brand--footer" to="/" aria-label="접시 홈"><img src={`${ASSETS}/plate-mascot.png`} alt="" width="56" height="56" /><span>접시</span></Link><nav aria-label="하단 메뉴"><Link to="/faq">고객지원</Link><Link to="/terms-of-service">이용약관</Link><Link to="/privacy-policy">개인정보 처리방침</Link><a href="mailto:su12ng@gmail.com">문의 <span>su12ng@gmail.com</span></a></nav></div><div className="home-footer-bottom"><p>© {new Date().getFullYear()} 접시 · 운영자 유성용</p><Link to="/admin">관리자 로그인 <span aria-hidden="true">↗</span></Link></div></footer>
    {platform && <DownloadDialog platform={platform} onClose={() => setPlatform(null)} />}
  </div>;
}
