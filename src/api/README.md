# API Layer

All HTTP requests should go through `src/api/client.js`.

## Why

- One place for base URL handling
- One place for auth header handling
- One place for error normalization
- One place for query string rules

## Base URL

Default API origin:

```bash
http://localhost:8090
```

Override with:

```bash
REACT_APP_API_BASE_URL=https://api.example.com
```

If the variable is missing, requests use `http://localhost:8090`.

## Usage

```js
import { apiClient } from "../api";

const faqList = await apiClient.get("/faqs", {
  query: { page: 1, category: "account" },
});

const createdFeedback = await apiClient.post("/feedback", {
  type: "ui",
  message: "Search needs more filters",
});
```

## Auth token

```js
import { clearAuthToken, setAuthToken } from "../api";

setAuthToken(accessToken);
clearAuthToken();
```

## Error handling

```js
import { ApiError, apiClient } from "../api";

try {
  await apiClient.get("/me");
} catch (error) {
  if (error instanceof ApiError) {
    console.error(error.status, error.code, error.message);
  }
}
```

## Rules for future work

1. Do not call `fetch` directly inside page components.
2. If an endpoint belongs to a domain, create a thin domain module such as `src/api/faqApi.js`.
3. Keep request shaping in API modules and keep UI components focused on rendering.
