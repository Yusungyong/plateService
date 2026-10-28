import React from "react";
import { APP_DOWNLOADS } from "../../config/appDownloads";

function StoreIcon({ platform }) {
  return platform === "ios" ? (
    <svg viewBox="0 0 24 28" aria-hidden="true">
      <path
        fill="currentColor"
        d="M19.5 14.8c0-3 2.5-4.5 2.6-4.6-1.5-2.2-3.8-2.5-4.6-2.5-1.9-.2-3.7 1.1-4.7 1.1-1 0-2.5-1.1-4.1-1-2.1 0-4 1.2-5.1 3-2.2 3.8-.6 9.5 1.5 12.5 1 1.5 2.2 3.1 3.9 3 1.6-.1 2.2-1 4.2-1s2.5 1 4.2 1c1.7 0 2.8-1.5 3.8-3 1.2-1.7 1.7-3.4 1.7-3.5-.1 0-3.4-1.3-3.4-5zM16.3 5.7c.8-1.1 1.5-2.5 1.3-4-1.3.1-2.9.9-3.8 2-.8.9-1.6 2.4-1.4 3.8 1.5.1 3-.7 3.9-1.8z"
      />
    </svg>
  ) : (
    <svg viewBox="0 0 28 30" aria-hidden="true">
      <path fill="#42c4ef" d="M2 1 17 15 2 29z" />
      <path fill="#48d38b" d="m2 1 18 10-3 4z" />
      <path fill="#ffcb45" d="m20 11 6 3q2 1 0 2l-6 3-3-4z" />
      <path fill="#ff6376" d="m17 15 3 4L2 29z" />
    </svg>
  );
}

export default function StoreButtons() {
  return (
    <div className="home-store-buttons">
      {Object.entries(APP_DOWNLOADS).map(([platform, store]) => {
        const content = (
          <>
            <StoreIcon platform={platform} />
            <span>
              <strong>{store.name}</strong>
              <small>다운로드하기</small>
            </span>
          </>
        );
        return (
          <a
            className="home-store-button"
            key={platform}
            href={store.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${store.name}에서 접시 다운로드 (새 창)`}
          >
            {content}
          </a>
        );
      })}
    </div>
  );
}
