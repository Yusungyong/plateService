import React from "react";
import home400 from "../../assets/home/app-home-400.webp";
import home800 from "../../assets/home/app-home-800.webp";

export default function PhonePreview() {
  const fallback = (event) => {
    const image = event.currentTarget;
    const original = "/images/home/KakaoTalk_20260915_211008421_02.png";
    if (image.getAttribute("src") === original) return;
    image.removeAttribute("srcset");
    image.src = original;
  };
  return (
    <figure className="home-hero-phone">
      <div className="home-hero-phone-screen">
        <img
          src={home800}
          srcSet={`${home400} 400w, ${home800} 800w`}
          sizes="(max-width: 600px) 230px, 280px"
          alt="접시 앱의 음식 사진과 영상 콘텐츠 홈 화면"
          width="800"
          height="1739"
          fetchPriority="high"
          onError={fallback}
        />
      </div>
      <span className="home-hero-phone-camera" aria-hidden="true" />
    </figure>
  );
}
