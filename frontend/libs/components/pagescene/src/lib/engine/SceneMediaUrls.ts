export interface MediaUrlResolver {
  getMediaUrlByToken: (token: string) => Promise<string>;
  getMediaUrlsByTokens?: (tokens: string[]) => Promise<Record<string, string>>;
}

// Per-scene metadata cache. A failed warm-up leaves unresolved tokens available
// for a later single-token request; it never stores failed lookups.
export class SceneMediaUrls {
  constructor(private readonly deps: MediaUrlResolver) {}

  // URL cache populated by warm() before a scene load. Lets
  // every per-asset loadObject() skip its own metadata roundtrip. Lives
  // for the lifetime of the Scene; entries are cheap (string→string).
  private urls: Map<string, string> = new Map();

  // Resolve a media_file_token to its CDN URL. Reads from the warm
  // cache first (populated by warm() during a scene load) before
  // falling back to a single-token metadata fetch.
  async resolve(media_id: string) {
    const cached = this.urls.get(media_id);
    if (cached !== undefined) return cached;
    return this.deps.getMediaUrlByToken(media_id);
  }

  // Warm the URL cache for a batch of tokens up front. Uses the host's
  // batch resolver when available (one roundtrip), otherwise fans out
  // single-token requests in parallel. Missing tokens (e.g. an asset
  // was deleted) silently fall through to the per-asset fetch path.
  async warm(tokens: string[]): Promise<void> {
    if (tokens.length === 0) return;
    const unique = Array.from(new Set(tokens));
    if (this.deps.getMediaUrlsByTokens) {
      const urls = await this.deps.getMediaUrlsByTokens(unique);
      for (const [token, url] of Object.entries(urls)) {
        if (url) this.urls.set(token, url);
      }
      return;
    }
    const results = await Promise.all(
      unique.map((token) =>
        this.deps
          .getMediaUrlByToken(token)
          .then((url) => [token, url] as const)
          .catch(() => [token, ""] as const),
      ),
    );
    for (const [token, url] of results) {
      if (url) this.urls.set(token, url);
    }
  }
}
