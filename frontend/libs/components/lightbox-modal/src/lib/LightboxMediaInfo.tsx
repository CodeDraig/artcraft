import type { ReactNode } from "react";
import dayjs from "dayjs";
import { InfoIcon } from "lucide-react";
import {
  getCreatorIconPathForModelId,
  getModelDisplayName,
  getProviderDisplayName,
  getProviderIconByName,
} from "@storyteller/model-list";
import {
  formatAspectRatio,
  formatDuration,
  formatResolution,
} from "@storyteller/common";

interface LightboxMediaInfoProps {
  modelType: string | null;
  generationProvider: string | null;
  aspectRatio: string | null;
  resolution: string | null;
  durationSeconds: number | null;
  generateAudio: boolean | null;
  mediaWidth: number | null;
  mediaHeight: number | null;
  createdAt?: string;
}

export function LightboxMediaInfo({
  modelType,
  generationProvider,
  aspectRatio,
  resolution,
  durationSeconds,
  generateAudio,
  mediaWidth,
  mediaHeight,
  createdAt,
}: LightboxMediaInfoProps) {
  const hasAnyInfo =
    !!modelType ||
    !!generationProvider ||
    !!aspectRatio ||
    !!resolution ||
    durationSeconds != null ||
    generateAudio != null ||
    (!!mediaWidth && !!mediaHeight) ||
    !!createdAt;

  if (!hasAnyInfo) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/60">
        <InfoIcon />
        <span>Information</span>
      </div>
      <div className="flex flex-col bg-black/20 border border-white/10 overflow-hidden">
        {modelType && (
          <InfoRow
            label="Model"
            value={
              <>
                <img
                  src={getCreatorIconPathForModelId(modelType)}
                  alt="Model creator logo"
                  className="h-4 w-4 invert"
                />
                <span>{getModelDisplayName(modelType)}</span>
              </>
            }
          />
        )}
        {generationProvider && (
          <InfoRow
            label="Provider"
            value={
              <>
                {getProviderIconByName(generationProvider, "h-4 w-4 invert")}
                <span>{getProviderDisplayName(generationProvider)}</span>
              </>
            }
          />
        )}
        {aspectRatio && (
          <InfoRow
            label="Aspect Ratio"
            value={formatAspectRatio(aspectRatio)}
          />
        )}
        {resolution && (
          <InfoRow label="Resolution" value={formatResolution(resolution)} />
        )}
        {durationSeconds != null && (
          <InfoRow label="Duration" value={formatDuration(durationSeconds)} />
        )}
        {generateAudio != null && (
          <InfoRow label="Audio" value={generateAudio ? "On" : "Off"} />
        )}
        {mediaWidth && mediaHeight && (
          <InfoRow label="Size" value={`${mediaWidth} × ${mediaHeight}`} />
        )}
        {createdAt && (
          <InfoRow
            label="Created"
            value={dayjs(createdAt).format("MMM D, YYYY h:mm:ss A")}
          />
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-3 py-2.5 border-b border-white/10 last:border-0">
      <span className="shrink-0 pt-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-base-fg/60">
        {label}
      </span>
      <span className="min-w-0 text-right text-sm text-base-fg font-medium flex items-center justify-end gap-2">
        {value}
      </span>
    </div>
  );
}
