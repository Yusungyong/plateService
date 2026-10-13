import React from "react";

function KpiCard({ label, value, change, note, tone = "primary" }) {
  const isPositive = typeof change === "number" && change >= 0;

  return (
    <article className={`admin-kpi-card admin-kpi-card--${tone}`}>
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
    </article>
  );
}

export default KpiCard;
