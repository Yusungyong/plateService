## FAQs Write APIs

- POST `/api/faqs`
- PUT `/api/faqs/{faqId}` or PATCH `/api/faqs/{faqId}`
- DELETE `/api/faqs/{faqId}`

### FAQ create

`POST /api/faqs`

Request body
- `category` (string, required)
- `title` (string, required)
- `answer` (string, required)
- `username` (string, required)
- `isPinned` (boolean, optional, default false)
- `displayOrder` (number, optional, default 0)
- `statusCode` (string, required: `published` | `review` | `draft`)

Example request
```js
export async function createFaq(payload) {
  return api("/api/faqs", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    }
  });
}

await createFaq({
  category: "account",
  title: "How do I reset my password?",
  answer: "Use the password reset menu from the login screen.",
  username: "admin",
  isPinned: true,
  displayOrder: 1,
  statusCode: "published"
});
```

Example response
```json
{
  "faqId": 12,
  "message": "FAQ created successfully."
}
```

Frontend usage
```js
const created = await createFaq({
  category: draft.category,
  title: draft.title,
  answer: draft.answer,
  username: draft.author,
  isPinned: draft.pinned,
  displayOrder: 0,
  statusCode: draft.status
});

console.log(created.faqId);
```

### FAQ update

`PUT /api/faqs/{faqId}`

Notes
- `PUT` is preferred if the backend expects full replacement.
- `PATCH` is acceptable if the backend handles partial updates.

Request body
- `category` (string, required)
- `title` (string, required)
- `answer` (string, required)
- `isPinned` (boolean, optional)
- `displayOrder` (number, optional)
- `statusCode` (string, required)

Example request
```js
export async function updateFaq(faqId, payload) {
  return api(`/api/faqs/${faqId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json"
    }
  });
}

await updateFaq(12, {
  category: "policy",
  title: "Where can I check privacy policy updates?",
  answer: "You can check updates from the policy section in customer support.",
  isPinned: false,
  displayOrder: 20,
  statusCode: "published"
});
```

Example response
```json
{
  "faqId": 12,
  "message": "FAQ updated successfully."
}
```

Frontend usage
```js
await updateFaq(selectedFaq.faqId, {
  category: editForm.category,
  title: editForm.title,
  answer: editForm.answer,
  isPinned: editForm.isPinned,
  displayOrder: editForm.displayOrder,
  statusCode: editForm.statusCode
});
```

### FAQ delete

`DELETE /api/faqs/{faqId}`

Notes
- If the backend uses soft delete, the UI can still treat this as delete.
- Response can be minimal as long as success/failure is clear.

Example request
```js
export async function deleteFaq(faqId) {
  return api(`/api/faqs/${faqId}`, {
    method: "DELETE"
  });
}

await deleteFaq(12);
```

Example response
```json
{
  "faqId": 12,
  "message": "FAQ deleted successfully."
}
```

Frontend usage
```js
await deleteFaq(selectedFaq.faqId);
```

## Expected validation rules

- `title` must not be empty
- `answer` must not be empty
- `category` must not be empty
- `username` must not be empty on create
- `statusCode` must be one of:
  - `published`
  - `review`
  - `draft`

## Frontend assumptions

- Create, update, and delete are operator-only actions
- Read APIs remain public or customer-facing
- After create/update/delete, the frontend will re-fetch `GET /api/faqs`

## Suggested error response

```json
{
  "code": "INVALID_REQUEST",
  "message": "title is required"
}
```

## Suggested implementation order

1. POST `/api/faqs`
2. PUT `/api/faqs/{faqId}`
3. DELETE `/api/faqs/{faqId}`
