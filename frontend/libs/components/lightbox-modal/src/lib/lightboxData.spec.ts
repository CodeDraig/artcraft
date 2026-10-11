import { act, cleanup, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import { useLightboxBatch } from "./useLightboxBatch";
import { useLightboxPrompt } from "./useLightboxPrompt";

const api = vi.hoisted(() => ({
  media: vi.fn(),
  prompt: vi.fn(),
  batch: vi.fn(),
}));
vi.mock("@storyteller/api", () => ({
  MediaFilesApi: class {
    GetMediaFileByToken = api.media;
    GetMediaFilesByBatchToken = api.batch;
  },
  PromptsApi: class {
    GetPromptsByToken = api.prompt;
  },
}));

describe("lightbox request lifetimes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("debounces navigation and discards a stale media response", async () => {
    let finishOld!: (response: unknown) => void;
    api.media.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishOld = resolve;
        }),
    );
    api.media.mockResolvedValueOnce({
      success: true,
      data: {
        maybe_prompt_token: "new-prompt",
        maybe_creator_user: { username: "new" },
      },
    });
    api.prompt.mockResolvedValue({
      success: true,
      data: { maybe_positive_prompt: "current prompt" },
    });
    const { result, rerender } = renderHook(({ id }) => useLightboxPrompt(id), {
      initialProps: { id: "old" },
    });
    await act(() => vi.advanceTimersByTimeAsync(180));
    rerender({ id: "skipped" });
    rerender({ id: "new" });
    await act(() => vi.advanceTimersByTimeAsync(180));
    await act(async () =>
      finishOld({ success: true, data: { maybe_prompt_token: "old-prompt" } }),
    );
    expect(api.media).toHaveBeenCalledTimes(2);
    expect(api.prompt).toHaveBeenCalledExactlyOnceWith({ token: "new-prompt" });
    expect(result.current).toMatchObject({
      promptLoading: false,
      hasPromptToken: true,
      creator: { username: "new" },
      promptData: { maybe_positive_prompt: "current prompt" },
    });
  });

  it("keeps batch URLs paired with tokens and cancels pending work on unmount", async () => {
    api.batch.mockResolvedValue({
      success: true,
      data: [
        { token: "other", media_links: { cdn_url: "other.png" } },
        { token: "primary", media_links: { cdn_url: "primary.png" } },
        { token: "missing-url", media_links: {} },
      ],
    });
    const { result, rerender, unmount } = renderHook(
      ({ token }) => useLightboxBatch(token, "primary"),
      { initialProps: { token: "batch" } },
    );
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(result.current).toEqual({
      batchImages: ["primary.png", "other.png"],
      batchTokens: ["primary", "other"],
    });
    rerender({ token: "next" });
    expect(result.current.batchImages).toBeNull();
    unmount();
    await act(() => vi.advanceTimersByTimeAsync(200));
    expect(api.batch).toHaveBeenCalledTimes(1);
  });
});
