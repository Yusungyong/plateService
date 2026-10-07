import { draftKey, clearPrivateDrafts } from "./privateDrafts";
test("separates account drafts and removes all private data on session end", () => {
  sessionStorage.clear();
  expect(draftKey("alice", "business:new")).not.toBe(draftKey("bob", "business:new"));
  sessionStorage.setItem(draftKey("alice", "business:new"), "private details");
  sessionStorage.setItem("plate-service.business-signup-draft", "legacy private details");
  sessionStorage.setItem("unrelated", "keep");
  clearPrivateDrafts();
  expect(sessionStorage.getItem(draftKey("alice", "business:new"))).toBeNull();
  expect(sessionStorage.getItem("plate-service.business-signup-draft")).toBeNull();
  expect(sessionStorage.getItem("unrelated")).toBe("keep");
});
