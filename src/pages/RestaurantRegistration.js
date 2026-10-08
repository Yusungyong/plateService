import React from "react";
import {Navigate} from "react-router-dom";
// Preserve old imports/bookmarks through the supported owner application flow.
export default function RestaurantRegistration() {
  return <Navigate to="/business/signup" replace />;
}
