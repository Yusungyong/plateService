import React from "react";
import {Link} from "react-router-dom";

function KpiCard({ label, value, change, note, tone = "primary", to, onClick, actionLabel }) {
  const isPositive = typeof change === "number" && change >= 0;

  const Tag = to ? Link : onClick ? "button" : "article";
  return (
    <Tag {...(to ? {to} : onClick ? {type: "button", onClick} : {})} className={`admin-kpi-card admin-kpi-card--${tone}${to || onClick ? " admin-kpi-card--interactive" : ""}`}>
      <span className="admin-kpi-card__label">{label}</span>
      <strong>{typeof value === "string" ? value : Number.isFinite(Number(value)) && value !== null && value !== undefined ? Number(value).toLocaleString() : "확인 불가"}</strong>
      <div className="admin-kpi-card__meta">
        {typeof change === "number" ? (
          <span
            className={
              isPositive
                ? "admin-kpi-card__change admin-kpi-card__change--positive"
                : "admin-kpi-card__change admin-kpi-card__change--negative"
            }
          >
            {isPositive ? "+" : ""}
            {change}%
          </span>
        ) : null}
        <span>{note}</span>
      </div>
    {(to || onClick) && <span className="metric-action">{actionLabel || "자세히 보기"} →</span>}
    </Tag>
  );
}

export default KpiCard;
