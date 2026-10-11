import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { useWorldImageUploads } from "./useWorldImageUploads";

const upload = vi.hoisted(() => vi.fn());
vi.mock("@storyteller/api", () => ({
  MediaUploadApi: class {
    UploadImage = upload;
  },
}));
vi.mock("react-hot-toast", () => ({ toast: { error: vi.fn() } }));

it("retains saved and successful images when another concurrent upload fails", async () => {
  upload.mockImplementation(async ({ fileName }: { fileName: string }) => {
    if (fileName === "bad.png") throw new Error("upload failed");
    return { success: true, data: "uploaded-token" };
  });
  const { result } = renderHook(() => useWorldImageUploads());
  const saved = {
    id: "saved",
    name: "Saved",
    preview: "saved.png",
    mediaToken: "saved-token",
    isUploading: false,
  };
  act(() => result.current.setWorldImages([saved]));
  await act(() =>
    result.current.handleWorldFiles([
      new File(["image"], "good.png", { type: "image/png" }),
      new File(["image"], "bad.png", { type: "image/png" }),
      new File(["text"], "ignored.txt", { type: "text/plain" }),
    ]),
  );
  await waitFor(() => expect(result.current.worldImages).toHaveLength(2));
  expect(result.current.worldImages[0]).toBe(saved);
  expect(result.current.worldImages[1]).toMatchObject({
    name: "good.png",
    mediaToken: "uploaded-token",
    isUploading: false,
  });
  expect(upload).toHaveBeenCalledTimes(2);
});
