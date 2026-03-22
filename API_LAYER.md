# API Layer Notes

Added a shared API module so future requests can use one path instead of each page calling `fetch` directly.

## Files

- `src/api/client.js`: shared HTTP client
- `src/api/index.js`: barrel export
- `src/api/README.md`: usage examples for future work

## Current contract

- Base URL defaults to `http://localhost:8090`
- `REACT_APP_API_BASE_URL` can override the default
- Auth token can be set with `setAuthToken`
- Query strings are built in one place
- Errors are normalized to `ApiError`

## Recommended usage

1. Create domain wrappers like `src/api/faqApi.js`
2. Import those wrappers from pages or hooks
3. Avoid direct `fetch` usage outside the API layer
