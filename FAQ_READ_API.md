## FAQs

- GET `/api/faqs`
- GET `/api/faqs/{faqId}`

### FAQ list

`GET /api/faqs`

Query params
- `category` (string, optional)
- `keyword` (string, optional, title search)
- `page` (number, optional, default 0)
- `size` (number, optional, default 10)

Example request
```js
export async function fetchFaqs({ category, keyword, page = 0, size = 10 } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (keyword) params.set("keyword", keyword);
  params.set("page", String(page));
  params.set("size", String(size));

  return api(`/api/faqs?${params.toString()}`);
}
```

Example response
```json
{
  "content": [
    {
      "faqId": 12,
      "category": "account",
      "title": "How do I reset my password?",
      "answer": "Use the password reset menu from the login screen.",
      "username": "admin",
      "isPinned": true,
      "viewCount": 128,
      "displayOrder": 1,
      "statusCode": "published",
      "createdAt": "2026-03-22T10:00:00",
      "updatedAt": "2026-03-22T10:00:00"
    }
  ],
  "page": 0,
  "size": 10,
  "totalElements": 25,
  "totalPages": 3,
  "hasNext": true
}
```

Frontend usage
```js
const faqPage = await fetchFaqs({ category: "account", keyword: "password" });

faqPage.content.forEach((faq) => {
  console.log(faq.title);
  console.log(faq.answer);
});
```

### FAQ detail

`GET /api/faqs/{faqId}`

Notes
- Detail response shape is the same as a single FAQ item in the list.
- `viewCount` is increased when this API is called.

Example request
```js
export async function fetchFaqDetail(faqId) {
  return api(`/api/faqs/${faqId}`);
}
```

Example response
```json
{
  "faqId": 12,
  "category": "account",
  "title": "How do I reset my password?",
  "answer": "Use the password reset menu from the login screen.",
  "username": "admin",
  "isPinned": true,
  "viewCount": 129,
  "displayOrder": 1,
  "statusCode": "published",
  "createdAt": "2026-03-22T10:00:00",
  "updatedAt": "2026-03-22T10:00:00"
}
```

Accordion-style example
```js
const faqList = await fetchFaqs({ page: 0, size: 10 });

const items = faqList.content.map((faq) => ({
  id: faq.faqId,
  label: `[${faq.category}] ${faq.title}`,
  content: faq.answer,
  meta: {
    username: faq.username,
    viewCount: faq.viewCount,
    updatedAt: faq.updatedAt,
    isPinned: faq.isPinned
  }
}));
```
