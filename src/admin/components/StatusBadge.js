import React from "react";
import { getStatusTone } from "../constants/adminStatuses";

function StatusBadge({ status, label, tone }) {
  const resolvedTone = tone || getStatusTone(status);

  return (
    <span className={`admin-status-badge admin-status-badge--${resolvedTone}`}>
      {label || status || "-"}
    </span>
  );
}

export default StatusBadge;
