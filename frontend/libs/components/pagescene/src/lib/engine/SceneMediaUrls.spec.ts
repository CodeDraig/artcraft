import { SceneMediaUrls } from "./SceneMediaUrls";

describe("scene media URL cache", () => {
  it("warms unique tokens in one batch and resolves missing tokens individually", async () => {
    const one = vi.fn().mockResolvedValue("missing.glb");
    const batch = vi.fn().mockResolvedValue({ a: "a.glb", missing: "" });
    const urls = new SceneMediaUrls({
      getMediaUrlByToken: one,
      getMediaUrlsByTokens: batch,
    });
    await urls.warm(["a", "a", "missing"]);
    expect(batch).toHaveBeenCalledExactlyOnceWith(["a", "missing"]);
    expect(await urls.resolve("a")).toBe("a.glb");
    expect(one).not.toHaveBeenCalled();
    expect(await urls.resolve("missing")).toBe("missing.glb");
    expect(one).toHaveBeenCalledExactlyOnceWith("missing");
  });

  it("keeps successful single-token warmups when a sibling lookup fails", async () => {
    const one = vi.fn(async (token: string) => {
      if (token === "bad") throw new Error("unavailable");
      return `${token}.glb`;
    });
    const urls = new SceneMediaUrls({ getMediaUrlByToken: one });
    await urls.warm(["good", "bad"]);
    expect(await urls.resolve("good")).toBe("good.glb");
    await expect(urls.resolve("bad")).rejects.toThrow("unavailable");
    expect(one).toHaveBeenCalledTimes(3);
  });
});
