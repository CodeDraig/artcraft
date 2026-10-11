import { TaskMediaFileClass } from "@storyteller/api-enums";

export type InProgressTask = {
  id: string;
  title: string;
  subtitle?: string;
  progress: number;
  updatedAt?: Date;
  canDismiss?: boolean;
  estimatedTimeLeftMs?: number;
  modelType?: string;
  prompt?: string;
  refImageUrls?: string[];
};

export type CompletedTask = {
  id: string;
  title: string;
  subtitle?: string;
  thumbnailUrl?: string;
  completedAt?: Date;
  updatedAt?: Date;
  imageUrls?: string[];
  mediaTokens?: string[];
  mediaFileClass?: TaskMediaFileClass;
  batchImageToken?: string;
  prompt?: string;
};

export type FailedTask = {
  id: string;
  title: string;
  subtitle?: string;
  failedAt?: Date;
  status: string;
  failureReason?: string;
  failureMessage?: string;
  prompt?: string;
  refImageUrls?: string[];
};
