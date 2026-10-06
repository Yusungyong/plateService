import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import App from "../../App";

const food = { months: [9,10], monthsEditable: true, id: 99, nameKo: "대하", status: "PUBLISHED", categoryCode: "CRUSTACEAN", version: 3, shortDescription: "가을에 즐기는 제철 음식", representativeImageUrl: "https://storage.example.com/a.webp", imagePreviewUrl: "https://delivery.example.com/a.webp" };
let fetchSpy;
beforeEach(() => {
  localStorage.clear();
  const payload = window.btoa(JSON.stringify({ sub: "editor", roles: ["ADMIN"], permissions: ["ADMIN_ACCESS", "SEASONAL_READ", "SEASONAL_MANAGE"] }));
  localStorage.setItem("plate-service.auth", JSON.stringify({ accessToken: `${window.btoa('{}')}.${payload}.signature`, refreshToken: "test" }));
  window.history.replaceState({}, "", "/admin/seasonal-foods");
  fetchSpy = jest.spyOn(global, "fetch").mockImplementation(async (url, options = {}) => ({ ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ data: (options.method === "PUT" || options.method === "POST") ? { ...food, ...JSON.parse(options.body), version: 4, status: options.method === "POST" ? "DRAFT" : "PUBLISHED" } : /seasonal-foods\/99/.test(url) ? food : { content: [food], hasNext: false } }) }));
});
afterEach(() => { jest.restoreAllMocks(); localStorage.clear(); });

test("searches loaded foods and preserves the storage URL when editing a previewed image", async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /대하/ }));
  await screen.findByLabelText("소개");
  expect(screen.getByRole("img", { name: "대표 이미지" })).toHaveAttribute("src", food.imagePreviewUrl);
  fireEvent.change(screen.getByLabelText("소개"), { target: { value: "새 소개" } });
  fireEvent.click(screen.getByRole("button", { name: "식재료 저장" }));
  await screen.findByText(/식재료를 저장했습니다/);
  const [, options] = fetchSpy.mock.calls.find(([, opts]) => opts.method === "PUT");
  expect(JSON.parse(options.body)).toMatchObject({ version: 3, representativeImageUrl: food.representativeImageUrl, shortDescription: "새 소개" });
  fireEvent.change(screen.getByLabelText("음식 검색"), { target: { value: "없는 음식" } });
  expect(screen.queryByRole("button", { name: /대하/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "필터 초기화" }));
  expect(screen.getByRole("button", { name: /대하/ })).toBeInTheDocument();
});

test("creates a draft through the server with selected months", async () => {
  render(<App />);
  await screen.findByRole("button", { name: /대하/ });
  fireEvent.click(screen.getByRole("button", { name: /음식 등록/ }));
  fireEvent.change(screen.getByLabelText("음식 이름"), { target: { value: "새 음식" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "9월" }));
  expect(screen.getByRole("checkbox", { name: "9월" })).toBeChecked();
  fireEvent.change(screen.getByLabelText("음식 분류"), {target: {value: "FRUIT"}});
  fireEvent.click(screen.getByRole("button", {name: "초안 등록"}));
  await screen.findByText(/초안으로 등록했습니다/);
  const [,options] = fetchSpy.mock.calls.find(([,o]) => o.method === "POST");
  expect(JSON.parse(options.body)).toMatchObject({nameKo: "새 음식", categoryCode: "FRUIT", months: [9]});
});

test("deletes only after confirmation and removes the saved item", async () => {
  const show = HTMLDialogElement.prototype.showModal;
  const close = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /대하/ }));
  await screen.findByLabelText("소개");
  fireEvent.click(screen.getByRole("button", { name: "음식 삭제" }));
  expect(screen.getByRole("dialog", { name: "대하 삭제" })).toBeInTheDocument();
  expect(fetchSpy.mock.calls.some(([,o]) => o.method === "DELETE")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "돌아가기" }));
  fireEvent.click(screen.getByRole("button", {name: "음식 삭제"}));
  fireEvent.click(screen.getByRole("button", {name: "삭제 확인"}));
  await screen.findByText("음식을 삭제했습니다.");
  expect(screen.queryByLabelText("소개")).not.toBeInTheDocument();
  expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("/99?version=3"),expect.objectContaining({method: "DELETE"}));
  HTMLDialogElement.prototype.showModal = show;
  HTMLDialogElement.prototype.close = close;
});

test("keeps unsaved text when the server reports a version conflict", async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole("button", { name: /대하/ }));
  await screen.findByLabelText("소개");
  fetchSpy.mockResolvedValueOnce({ ok: false, status: 409, headers: { get: () => "application/json" }, json: async () => ({ message: "conflict" }) });
  fireEvent.change(screen.getByLabelText("소개"), { target: { value: "지키고 싶은 내용" } });
  fireEvent.click(screen.getByRole("button", { name: "식재료 저장" }));
  await screen.findByRole("alert");
  expect(screen.getByLabelText("소개")).toHaveValue("지키고 싶은 내용");
  await waitFor(() => expect(screen.getByRole("button", { name: "식재료 저장" })).toBeEnabled());
});
