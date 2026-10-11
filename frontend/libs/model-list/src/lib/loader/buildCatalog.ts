import type { ListingModelBase } from "./ListingModel.js";

const UNAVAILABLE_MODELS = new Set([
  "minimax_h3_turbo",
  "minimax_h3_ultra",
  "flux_pro_kontext_max",
  "flux_dev_juggernaut",
  "flux_pro_1",
]);
const isUnavailableModel = (id: string): boolean =>
  UNAVAILABLE_MODELS.has(id) || id === "sora" || id.startsWith("sora_");

// Membership: a model appears in the picker when it is
//   1. OFFERED by a provider in the response's `providers[]` (the backend's
//      publish switch — `models[]` details also contain disabled entries and
//      internal variants that must NOT surface), or
//   2. any ENABLED `models[]` detail, including models added after this build, or
//   3. a frontend-only overlay model the backend has never heard of
//      (switch_x, inpaint models, …).
// `models[]` details are the capability source either way (the enabled entry
// wins when a model is detailed twice).
export const buildCatalog = <
  T extends { tauriId: string },
  L extends ListingModelBase,
>(
  overlay: T[],
  listing: L[],
  offeredModelIds: string[],
  merge: (m: L, tauriId: string, overlayEntry: T | undefined) => T,
): T[] => {
  // Backend model ids and overlay `tauriId`s share the same identifier space
  // (the 2026-07 id migration retired all aliasing).
  const overlayByTauriId = new Map(overlay.map((m) => [m.tauriId, m]));
  const knownTauriIds = new Set(listing.map((m) => m.model));
  const offeredTauriIds = new Set(offeredModelIds);

  // Capability lookup — prefer the enabled detail entry when duplicated.
  const detailsByTauriId = new Map<string, L>();
  for (const m of listing) {
    const existing = detailsByTauriId.get(m.model);
    if (existing === undefined || existing.is_disabled === true) {
      detailsByTauriId.set(m.model, m);
    }
  }

  const result: T[] = [];
  const seenTauriIds = new Set<string>();
  // Backend details order drives ordering.
  for (const m of listing) {
    const tauriId = m.model;
    if (seenTauriIds.has(tauriId) || isUnavailableModel(tauriId)) continue;

    const overlayEntry = overlayByTauriId.get(tauriId);
    const detail = detailsByTauriId.get(tauriId) ?? m;
    const enabled = detail.is_disabled !== true;
    const show = offeredTauriIds.has(tauriId) || enabled;
    if (!show) continue;

    seenTauriIds.add(tauriId);
    result.push(merge(detail, tauriId, overlayEntry));
  }
  // Offered models with no detail entry at all (unusual, but the publish
  // switch wins): surface minimally.
  for (const tauriId of offeredModelIds) {
    if (seenTauriIds.has(tauriId) || isUnavailableModel(tauriId)) continue;
    seenTauriIds.add(tauriId);
    result.push(
      merge({ model: tauriId } as L, tauriId, overlayByTauriId.get(tauriId)),
    );
  }
  // Append frontend-only models the backend has never heard of.
  for (const m of overlay) {
    if (
      !isUnavailableModel(m.tauriId) &&
      !knownTauriIds.has(m.tauriId) &&
      !seenTauriIds.has(m.tauriId)
    ) {
      result.push(m);
    }
  }
  return result;
};
