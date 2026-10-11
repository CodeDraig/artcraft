export interface MentionItem {
  label: string;
  type: "image" | "video" | "audio" | "character";
  /** Small thumbnail (chip + dropdown row). */
  preview?: string;
  /** Identity for character items (character_token). */
  token?: string;
  /** Larger image for the chip Preview modal; falls back to `preview`. */
  fullPreview?: string;
}
