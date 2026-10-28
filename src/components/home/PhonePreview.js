import React from "react";
import restoreOriginal from "./imageFallback";
import home400 from "../../assets/home/app-home-400.jpg";
import home800 from "../../assets/home/app-home-800.jpg";

export default function PhonePreview() {
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
          onError={(event) =>
            restoreOriginal(event, "KakaoTalk_20260915_211008421_02.png")
          }
        />
      </div>
      <span className="home-hero-phone-camera" aria-hidden="true" />
    </figure>
  );
}
