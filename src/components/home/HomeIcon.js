import React from "react";

const paths = {
  arrow: (
    <>
      <path d="M5 12h14M12 5l7 7-7 7" />
    </>
  ),
  northeast: (
    <>
      <path d="M6 18 18 6M6 6h12v12" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  heart: (
    <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />
  ),
  chat: (
    <path d="M21 11.5a9 9 0 0 1-9.5 9 9.2 9.2 0 0 1-4-.9L3 21l1.4-4.5a9.2 9.2 0 0 1-.9-4A9 9 0 1 1 21 11.5Z" />
  ),
  camera: (
    <>
      <path d="M4 6h3l2-3h6l2 3h3v15H4Z" />
      <circle cx="12" cy="13" r="4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M7 2v6M17 2v6M3 11h18M8 15h2M14 15h2" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
};
export default function HomeIcon({ name, className = "" }) {
  return (
    <svg
      className={`home-icon ${className}`}
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}
