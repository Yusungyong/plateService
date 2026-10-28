import React, { StrictMode } from "react";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Home from "../../pages/Home";
import HomeVideoDialog from "./HomeVideoDialog";

const videoLabel = "접시 사용 영상 재생";
let showModalDescriptor;
let closeDescriptor;
let scrollDescriptor;
let bodyStyle;
let pause;
let play;
let load;

beforeEach(() => {
  showModalDescriptor = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    "showModal"
  );
  closeDescriptor = Object.getOwnPropertyDescriptor(
    HTMLDialogElement.prototype,
    "close"
  );
  scrollDescriptor = Object.getOwnPropertyDescriptor(window, "scrollY");
  bodyStyle = document.body.getAttribute("style");
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value: jest.fn(function showModal() {
      this.setAttribute("open", "");
    }),
  });
  Object.defineProperty(HTMLDialogElement.prototype, "close", {
    configurable: true,
    value: jest.fn(function close() {
      if (!this.open) return;
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    }),
  });
  pause = jest
    .spyOn(HTMLMediaElement.prototype, "pause")
    .mockImplementation(() => {});
  play = jest
    .spyOn(HTMLMediaElement.prototype, "play")
    .mockResolvedValue(undefined);
  load = jest
    .spyOn(HTMLMediaElement.prototype, "load")
    .mockImplementation(() => {});
  jest.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  if (showModalDescriptor)
    Object.defineProperty(
      HTMLDialogElement.prototype,
      "showModal",
      showModalDescriptor
    );
  else delete HTMLDialogElement.prototype.showModal;
  if (closeDescriptor)
    Object.defineProperty(
      HTMLDialogElement.prototype,
      "close",
      closeDescriptor
    );
  else delete HTMLDialogElement.prototype.close;
  if (scrollDescriptor)
    Object.defineProperty(window, "scrollY", scrollDescriptor);
  if (bodyStyle === null) document.body.removeAttribute("style");
  else document.body.setAttribute("style", bodyStyle);
  jest.restoreAllMocks();
});

async function openFromHome() {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
  const trigger = screen.getByRole("button", { name: "접시 사용 영상 보기" });
  fireEvent.click(trigger);
  return {
    trigger,
    dialog: screen.getByRole("dialog", { name: "접시 사용 영상" }),
    video: screen.getByLabelText(videoLabel),
  };
}

test("home keeps video sources unmounted until the introduction is requested", async () => {
  render(
    <MemoryRouter>
      <Home />
    </MemoryRouter>
  );
  const trigger = screen.getByRole("button", { name: "접시 사용 영상 보기" });
  expect(trigger).toHaveAttribute("aria-haspopup", "dialog");
  expect(
    screen.queryByRole("dialog", { hidden: true })
  ).not.toBeInTheDocument();
  expect(screen.queryByLabelText(videoLabel)).not.toBeInTheDocument();
  expect(play).not.toHaveBeenCalled();
  expect(load).not.toHaveBeenCalled();
  fireEvent.click(trigger);
  expect(
    screen.getByRole("dialog", { name: "접시 사용 영상" })
  ).toHaveAttribute("open");
  const video = screen.getByLabelText(videoLabel);
  expect(video).toHaveAttribute("controls");
  expect(video).toHaveAttribute("playsinline");
  expect(video).toHaveAttribute("src", "/media/jeopsi-demo-36s-v1.mp4");
});

test("closing stops playback, releases the source and restores opener focus", async () => {
  const { trigger, dialog, video } = await openFromHome();
  fireEvent.click(within(dialog).getByRole("button", { name: "영상 닫기" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(pause).toHaveBeenCalled();
  expect(video).not.toHaveAttribute("src");
  expect(load).toHaveBeenCalled();
  await waitFor(() => expect(trigger).toHaveFocus());
  fireEvent.click(trigger);
  expect(screen.getByLabelText(videoLabel)).toHaveAttribute(
    "src",
    "/media/jeopsi-demo-36s-v1.mp4"
  );
});

test("native Escape cancellation closes the viewer and releases media", async () => {
  const { trigger, dialog, video } = await openFromHome();
  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(video).not.toHaveAttribute("src");
  await waitFor(() => expect(trigger).toHaveFocus());
});

test("unmount restores pre-existing body styles and the previous page position", async () => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 317 });
  document.body.style.position = "relative";
  document.body.style.top = "4px";
  document.body.style.width = "94%";
  document.body.style.overflow = "auto";
  const previous = document.body.getAttribute("style");
  const view = render(
    <HomeVideoDialog onClose={() => {}} returnFocusRef={{ current: null }} />
  );
  const video = screen.getByLabelText(videoLabel);
  expect(document.body.style.position).toBe("fixed");
  view.unmount();
  expect(document.body.getAttribute("style")).toBe(previous);
  expect(window.scrollTo).toHaveBeenCalledWith(
    expect.objectContaining({ left: 0, top: 317 })
  );
  expect(pause).toHaveBeenCalled();
  expect(video).not.toHaveAttribute("src");
});

test("a media failure has a recoverable error state instead of a broken empty player", async () => {
  const { dialog, video } = await openFromHome();
  Object.defineProperty(video, "error", {
    configurable: true,
    value: { code: 4, message: "Synthetic unsupported source" },
  });
  fireEvent.error(video);
  expect(within(dialog).getByRole("alert")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "다시 시도" }));
  expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText(videoLabel)).toHaveAttribute(
    "src",
    "/media/jeopsi-demo-36s-v1.mp4"
  );
  fireEvent.click(within(dialog).getByRole("button", { name: "영상 닫기" }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("blocked autoplay leaves a usable player and never masquerades as a loading failure", async () => {
  play.mockRejectedValue(
    new DOMException("A user gesture is required", "NotAllowedError")
  );
  const { dialog, video } = await openFromHome();
  await act(async () => {
    await Promise.resolve();
  });
  expect(video).toHaveAttribute("controls");
  expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
  expect(
    within(dialog).getByRole("button", { name: "영상 닫기" })
  ).toBeEnabled();
});

test("Strict Mode cleanup does not leave the reopened dialog without a playable source", () => {
  render(
    <StrictMode>
      <HomeVideoDialog onClose={() => {}} returnFocusRef={{ current: null }} />
    </StrictMode>
  );
  expect(
    screen.getByRole("dialog", { name: "접시 사용 영상" })
  ).toHaveAttribute("open");
  expect(screen.getByLabelText(videoLabel)).toHaveAttribute(
    "src",
    "/media/jeopsi-demo-36s-v1.mp4"
  );
  expect(document.body.style.position).toBe("fixed");
});

test("moving the page into the background pauses playback and removes its listener on close", async () => {
  const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, "hidden");
  try {
    const { dialog } = await openFromHome();
    pause.mockClear();
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    fireEvent(document, new Event("visibilitychange"));
    expect(pause).toHaveBeenCalledTimes(1);
    fireEvent.click(within(dialog).getByRole("button", { name: "영상 닫기" }));
    pause.mockClear();
    fireEvent(document, new Event("visibilitychange"));
    expect(pause).not.toHaveBeenCalled();
  } finally {
    if (hiddenDescriptor)
      Object.defineProperty(document, "hidden", hiddenDescriptor);
    else delete document.hidden;
  }
});
