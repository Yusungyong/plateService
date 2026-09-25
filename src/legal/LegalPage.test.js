import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import LegalPage from "./LegalPage";
import generated from "./generated.json";

test("SPA navigation shows the same public correction and version link", () => {
  render(<MemoryRouter initialEntries={["/privacy-policy"]}><LegalPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { level: 1, name: "개인정보 처리방침" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "이전 버전 열람" })).toHaveAttribute("href", "/privacy-policy/versions");
  expect(screen.queryByText(/30일/)).not.toBeInTheDocument();
});

test.each(["/location-terms", "/privacy-policy/versions/draft-2026-09-14"])("%s does not expose a draft", (url) => {
  render(<MemoryRouter initialEntries={[url]}><LegalPage /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "문서를 찾을 수 없습니다" })).toBeInTheDocument();
});


test.each([
  ['/terms-of-service', '/legal/documents/service-terms/2026-09-25.md'],
  ['/terms-of-service/versions/legacy-629dc8a', '/legal/documents/service-terms/legacy-629dc8a.md'],
])('downloads the exact selected version without a rewritten HTTP request: %s', async (route, path) => {
  const create = URL.createObjectURL;
  const revoke = URL.revokeObjectURL;
  URL.createObjectURL = jest.fn(() => 'blob:legal-source');
  URL.revokeObjectURL = jest.fn();
  const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
    expect(this.download).toBe(generated.downloads[path].filename);
    expect(this.href).toBe('blob:legal-source');
  });
  try {
    render(<MemoryRouter initialEntries={[route]}><LegalPage /></MemoryRouter>);
    fireEvent.click(screen.getByRole('link', { name: '원문 다운로드' }));
    expect(click).toHaveBeenCalledTimes(1);
    const blob = URL.createObjectURL.mock.calls[0][0];
    const text = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob);
    });
    expect(text).toBe(generated.downloads[path].source);
    expect(text.startsWith('<!doctype')).toBe(false);
    // Wait for URL cleanup to verify downloaded objects are not retained.
    await new Promise(resolve => setTimeout(resolve, 1050));
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:legal-source');
  } finally {
    click.mockRestore(); URL.createObjectURL = create; URL.revokeObjectURL = revoke;
  }
});
