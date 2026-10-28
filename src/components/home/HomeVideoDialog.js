import React, { useEffect, useRef, useState } from "react";
import HomeIcon from "./HomeIcon";
import "./HomeVideoDialog.css";

const VIDEO_URL = "/media/jeopsi-demo-36s-v1.mp4";

export default function HomeVideoDialog({ onClose, returnFocusRef }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const backdropPress = useRef(false);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const dialog = dialogRef.current;
    const video = videoRef.current;
    const trigger = returnFocusRef?.current;
    const { scrollX, scrollY } = window;
    const body = document.body;
    const saved = {};
    const lock = {
      position: "fixed",
      top: `-${scrollY}px`,
      left: `-${scrollX}px`,
      width: "100%",
      overflow: "hidden",
    };
    Object.keys(lock).forEach((key) => {
      saved[key] = body.style[key];
      body.style[key] = lock[key];
    });
    dialog.showModal();
    // Reassign on setup too: StrictMode may run cleanup/setup on the same node.
    video.src = VIDEO_URL;
    video.play()?.catch(() => {
      // Some mobile browsers require another tap on the native play control.
      // A blocked autoplay attempt is not a failed video download.
      setLoading(false);
    });
    const pauseInBackground = () => {
      if (document.hidden) video.pause();
    };
    document.addEventListener("visibilitychange", pauseInBackground);
    return () => {
      document.removeEventListener("visibilitychange", pauseInBackground);
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (dialog.open) dialog.close();
      Object.keys(saved).forEach((key) => {
        body.style[key] = saved[key];
      });
      window.scrollTo({ left: scrollX, top: scrollY, behavior: "instant" });
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [returnFocusRef]);

  function isBackdrop(event) {
    if (event.target !== dialogRef.current) return false;
    const rect = dialogRef.current.getBoundingClientRect();
    return (
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    );
  }

  function retry() {
    const video = videoRef.current;
    setFailed(false);
    setLoading(true);
    video.src = VIDEO_URL;
    video.load();
    video.play()?.catch(() => setLoading(false));
  }

  return (
    <dialog
      ref={dialogRef}
      className="home-video-dialog"
      aria-labelledby="home-video-title"
      aria-describedby="home-video-description"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropPress.current = isBackdrop(event);
      }}
      onClick={(event) => {
        if (backdropPress.current && isBackdrop(event)) onClose();
        backdropPress.current = false;
      }}
    >
      <div className="home-video-panel">
        <div className="home-video-heading">
          <div>
            <p className="home-video-eyebrow">36초로 만나는 접시</p>
            <h2 id="home-video-title">접시 사용 영상</h2>
          </div>
          <button
            type="button"
            className="home-video-close"
            aria-label="영상 닫기"
            onClick={onClose}
            autoFocus
          >
            <HomeIcon name="close" />
          </button>
        </div>
        <div className="home-video-player">
          <video
            ref={videoRef}
            controls
            playsInline
            preload="metadata"
            poster="/media/jeopsi-demo-poster-v1.jpg"
            aria-label="접시 사용 영상 재생"
            onLoadedData={() => setLoading(false)}
            onCanPlay={() => setLoading(false)}
            onError={() => {
              setLoading(false);
              setFailed(true);
            }}
          >
            <track
              kind="captions"
              src="/media/jeopsi-demo-ko-v1.vtt"
              srcLang="ko"
              label="한국어 화면 설명"
            />
          </video>
          {loading && !failed && (
            <p className="home-video-loading" role="status">
              영상을 불러오고 있어요…
            </p>
          )}
          {failed && (
            <div className="home-video-error" role="alert">
              <p>영상을 불러오지 못했어요.</p>
              <span>인터넷 연결을 확인하고 다시 시도해 주세요.</span>
              <button type="button" onClick={retry}>
                다시 시도
              </button>
            </div>
          )}
        </div>
        <p id="home-video-description" className="home-video-description">
          실제 앱에서 맛집과 주변 지도를 둘러보세요.
          <br />
          화면은 앱 업데이트에 따라 달라질 수 있어요.
        </p>
      </div>
    </dialog>
  );
}
