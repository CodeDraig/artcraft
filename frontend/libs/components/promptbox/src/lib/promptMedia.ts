export interface RefImage {
  id: string;
  /** Display thumbnail (downscaled object URL for uploads, CDN URL for
   *  library picks). Never sent to the backend — that's `mediaToken`. */
  url: string;
  /** Full-resolution URL for preview modals; falls back to `url`. */
  fullUrl?: string;
  file: File;
  mediaToken: string;
}

export interface RefVideo {
  id: string;
  url: string;
  file: File;
  mediaToken: string;
  duration: number; // seconds
}

export interface RefAudio {
  id: string;
  url: string;
  file: File;
  mediaToken: string;
  duration: number; // seconds
}
