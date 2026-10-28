import React, { useRef, useState } from "react";
import home400 from "../../assets/home/app-home-400.webp";
import home800 from "../../assets/home/app-home-800.webp";
import map400 from "../../assets/home/app-map-400.webp";
import map800 from "../../assets/home/app-map-800.webp";
import profile400 from "../../assets/home/app-profile-400.webp";
import profile800 from "../../assets/home/app-profile-800.webp";
import "./HomeExplorer.css";

const FEATURES = [
  {
    id: "discover",
    label: "맛집 발견",
    description: "사진과 영상에서 오늘 먹고 싶은 한 끼를 골라요.",
    title: "보고 나면, 먹고 싶어지는.",
    detail:
      "음식 사진과 영상을 둘러보고, 마음에 드는 장소까지 이어서 확인해요.",
    alt: "음식 사진과 영상이 모여 있는 접시 콘텐츠 홈",
    small: home400,
    large: home800,
    original: "KakaoTalk_20260915_211008421_02.png",
  },
  {
    id: "map",
    label: "내 주변 지도",
    description: "지금 있는 곳 주변의 맛있는 장소를 찾아봐요.",
    title: "다음 한 끼는, 이 근처에서.",
    detail:
      "지도 위 음식 사진을 살펴보고, 음식 종류별로 가고 싶은 곳을 찾아요.",
    alt: "음식점 위치와 음식 종류 필터를 보여 주는 접시 내 주변 지도",
    small: map400,
    large: map800,
    original: "KakaoTalk_20260915_211008421_01.png",
  },
  {
    id: "record",
    label: "나만의 기록",
    description: "내가 남긴 한 끼와 좋아요한 음식을 다시 만나요.",
    title: "맛있었던 순간은, 오래도록.",
    detail:
      "사진과 영상으로 남긴 음식 기록을 모아 보고, 좋아요한 음식도 다시 꺼내 봐요.",
    alt: "최근 내 콘텐츠와 좋아요를 모아 보여 주는 접시 프로필",
    small: profile400,
    large: profile800,
    original: "KakaoTalk_20260915_211008421.png",
  },
];

function restoreOriginal(event, filename) {
  const image = event.currentTarget;
  const original = `/images/home/${filename}`;
  if (image.getAttribute("src") === original) return;
  image.removeAttribute("srcset");
  image.src = original;
}

export default function HomeExplorer() {
  const [selected, setSelected] = useState(0);
  const tabs = useRef([]);

  function handleKeyDown(event, index) {
    let next;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowRight":
        next = (index + 1) % FEATURES.length;
        break;
      case "ArrowUp":
      case "ArrowLeft":
        next = (index + FEATURES.length - 1) % FEATURES.length;
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = FEATURES.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    setSelected(next);
    tabs.current[next]?.focus();
  }

  return (
    <section
      className="home-explorer"
      id="features"
      tabIndex={-1}
      aria-labelledby="home-explorer-title"
    >
      <div className="home-explorer-inner">
        <div className="home-explorer-copy">
          <p className="home-explorer-eyebrow">접시 둘러보기</p>
          <h2 id="home-explorer-title">
            발견부터 기록까지,
            <br />내 취향대로.
          </h2>
          <p className="home-explorer-intro">
            지금 먹고 싶은 한 끼도,
            <br />
            다시 가고 싶은 곳도.
          </p>

          <div
            className="home-explorer-tabs"
            role="tablist"
            aria-label="접시 주요 기능"
            aria-orientation="vertical"
          >
            {FEATURES.map((feature, index) => (
              <button
                className="home-explorer-tab"
                type="button"
                role="tab"
                id={`home-feature-tab-${feature.id}`}
                key={feature.id}
                ref={(element) => {
                  tabs.current[index] = element;
                }}
                aria-label={feature.label}
                aria-describedby={`home-feature-description-${feature.id}`}
                aria-selected={selected === index}
                aria-controls={`home-feature-panel-${feature.id}`}
                tabIndex={selected === index ? 0 : -1}
                onClick={() => setSelected(index)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <span className="home-explorer-tab-index" aria-hidden="true">
                  0{index + 1}
                </span>
                <span className="home-explorer-tab-copy">
                  <span className="home-explorer-tab-label">
                    {feature.label}
                  </span>
                  <span
                    className="home-explorer-tab-description"
                    id={`home-feature-description-${feature.id}`}
                  >
                    {feature.description}
                  </span>
                </span>
                <span className="home-explorer-tab-arrow" aria-hidden="true">
                  ↗
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="home-explorer-previews">
          {FEATURES.map((feature, index) => (
            <div
              className={`home-explorer-panel home-explorer-panel--${feature.id}`}
              id={`home-feature-panel-${feature.id}`}
              key={feature.id}
              role="tabpanel"
              aria-labelledby={`home-feature-tab-${feature.id}`}
              tabIndex={0}
              hidden={selected !== index}
            >
              {selected === index && (
                <>
                  <div className="home-explorer-panel-copy">
                    <span
                      className="home-explorer-panel-number"
                      aria-hidden="true"
                    >
                      0{index + 1}
                    </span>
                    <h3>{feature.title}</h3>
                    <p>{feature.detail}</p>
                  </div>
                  <figure className="home-explorer-screen">
                    <div className="home-explorer-phone">
                      <img
                        src={feature.large}
                        srcSet={`${feature.small} 400w, ${feature.large} 800w`}
                        sizes="(max-width: 480px) 220px, 238px"
                        width="800"
                        height="1739"
                        loading="lazy"
                        decoding="async"
                        alt={feature.alt}
                        onError={(event) =>
                          restoreOriginal(event, feature.original)
                        }
                      />
                    </div>
                    <figcaption>접시 앱 실제 화면</figcaption>
                  </figure>
                </>
              )}
            </div>
          ))}
          <p className="home-explorer-note">
            콘텐츠와 화면 구성은 업데이트에 따라 달라질 수 있어요.
          </p>
        </div>
      </div>
    </section>
  );
}
