export interface ListingModelBase {
  model: string;
  model_creator?: string | null;
  full_name?: string | null;
  text_prompt_supported?: boolean | null;
  text_prompt_max_length?: number | null;
  batch_size_max?: number | null;
  batch_size_default?: number | null;
  batch_size_options?: number[] | null;
  aspect_ratio_options?: string[] | null;
  aspect_ratio_default?: string | null;
  resolution_options?: string[] | null;
  resolution_default?: string | null;
  quality_options?: string[] | null;
  default_quality?: string | null;
  is_disabled?: boolean | null;
}

export interface ListingImageModel extends ListingModelBase {
  image_refs_supported?: boolean | null;
  image_refs_max?: number | null;
}

export interface ListingVideoModel extends ListingModelBase {
  extra_info?: string | null;
  extra_info_short?: string | null;
  text_to_video_supported?: boolean | null;
  starting_keyframe_supported?: boolean | null;
  starting_keyframe_required?: boolean | null;
  ending_keyframe_supported?: boolean | null;
  image_references_supported?: boolean | null;
  image_references_max?: number | null;
  video_references_max?: number | null;
  video_references_max_total_duration_seconds?: number | null;
  audio_references_max?: number | null;
  audio_references_max_total_duration_seconds?: number | null;
  show_generate_with_sound_toggle?: boolean | null;
  duration_seconds_options?: number[] | null;
  duration_seconds_min?: number | null;
  duration_seconds_max?: number | null;
  duration_seconds_max_with_image_references?: number | null;
  bitrate_options?: string[] | null;
  bitrate_default?: string | null;
  output_format_options?: string[] | null;
  output_format_default?: string | null;
  duration_seconds_default?: number | null;
}
