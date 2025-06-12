import React, { useState, useRef, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import FAQ from "./pages/FAQ";
import QnA from "./pages/QnA";
import Feedback from "./pages/Feedback";
import ContentVerification from "./pages/ContentVerification";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

function App() {
  const [activeTab, setActiveTab] = useState("/faq");
  const [underlineStyle, setUnderlineStyle] = useState({ left: "0px", width: "0px" });
  const navRef = useRef(null);

  useEffect(() => {
    const activeLink = navRef.current.querySelector(`[data-tab="${activeTab}"]`);
    if (activeLink) {
      const { offsetLeft, offsetWidth } = activeLink;
      setUnderlineStyle({ left: `${offsetLeft}px`, width: `${offsetWidth}px` });
    }
  }, [activeTab]);

  return (
    <Router>
      <header style={styles.header}>
        <nav style={styles.nav} ref={navRef}>
          <Link
            to="/faq"
            data-tab="/faq"
            style={{
              ...styles.link,
              color: activeTab === "/faq" ? "#FF7F50" : "#000",
            }}
            onClick={() => setActiveTab("/faq")}
          >
            자주묻는 질문
          </Link>
          <Link
            to="/qna"
            data-tab="/qna"
            style={{
              ...styles.link,
              color: activeTab === "/qna" ? "#FF7F50" : "#000",
            }}
            onClick={() => setActiveTab("/qna")}
          >
            질문과 답변
          </Link>
          <Link
            to="/feedback"
            data-tab="/feedback"
            style={{
              ...styles.link,
              color: activeTab === "/feedback" ? "#FF7F50" : "#000",
            }}
            onClick={() => setActiveTab("/feedback")}
          >
            앱 피드백
          </Link>
          <Link
            to="/content-verification"
            data-tab="/content-verification"
            style={{
              ...styles.link,
              color: activeTab === "/content-verification" ? "#FF7F50" : "#000",
            }}
            onClick={() => setActiveTab("/content-verification")}
          >
            컨텐츠 검증
          </Link>
          <Link
            to="/terms-of-service"
            data-tab="/terms-of-service"
            style={{
              ...styles.link,
              color: activeTab === "/terms-of-service" ? "#FF7F50" : "#000",
            }}
            onClick={() => setActiveTab("/terms-of-service")}
          >
            이용약관
          </Link>
          <Link
            to="/privacy-policy"
            data-tab="/privacy-policy"
            style={{
              ...styles.link,
              color: activeTab === "/privacy-policy" ? "#FF7F50" : "#000",
            }}
            onClick={() => setActiveTab("/privacy-policy")}
          >
            개인정보 처리방침
          </Link>
          <div style={{ ...styles.underline, ...underlineStyle }} />
        </nav>
      </header>
      <main style={styles.main}>
        <Routes>
          <Route path="/faq" element={<FAQ />} />
          <Route path="/qna" element={<QnA />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/content-verification" element={<ContentVerification />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Routes>
      </main>
    </Router>
  );
}

const styles = {
  header: {
    backgroundColor: "#f8f9fa",
    padding: "20px",
    borderBottom: "1px solid #ddd",
    textAlign: "center",
  },
  nav: {
    position: "relative",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "2rem",
    flexWrap: "wrap",
    paddingBottom: "20px",
  },
  link: {
    textDecoration: "none",
    fontSize: "18px",
    fontWeight: "bold",
    transition: "color 0.3s",
  },
  underline: {
    position: "absolute",
    bottom: "-10px",
    height: "4px",
    backgroundColor: "#FF7F50",
    transition: "left 0.3s ease, width 0.3s ease",
  },
  main: {
    padding: "20px",
    textAlign: "center",
  },
  "@media (max-width: 768px)": {
    link: {
      fontSize: "16px",
    },
    nav: {
      gap: "1rem",
    },
  },
};

export default App;
