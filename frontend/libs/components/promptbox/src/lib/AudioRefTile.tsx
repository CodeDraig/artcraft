import { useCallback, useEffect, useRef, useState } from "react";
import { PlayIcon, SquareIcon, XIcon } from "lucide-react";
import { DynamicIcon } from "@storyteller/icons";
import { RefAudio } from "./promptMedia";
import { twMerge } from "tailwind-merge";

export const AudioRefTile = ({
  audio,
  index,
  onRemove,
}: {
  audio: RefAudio;
  index: number;
  onRemove: (id: string) => void;
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handleTogglePlay = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isPlaying) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        setIsPlaying(false);
      } else {
        const el = new Audio(audio.url);
        el.volume = 0.2;
        audioRef.current = el;
        el.onended = () => setIsPlaying(false);
        el.play();
        setIsPlaying(true);
      }
    },
    [isPlaying, audio.url],
  );

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <div className="glass relative aspect-square overflow-hidden rounded-[3px] w-14 border-2 border-white/30 hover:border-white/80 transition-all group cursor-pointer flex items-center justify-center">
      <button
        onClick={handleTogglePlay}
        className="flex items-center justify-center w-full h-full"
      >
        <DynamicIcon
          icon={isPlaying ? SquareIcon : PlayIcon}
          className={twMerge(
            "h-5 w-5 transition-colors",
            isPlaying
              ? "text-red-400"
              : "text-base-fg/60 group-hover:text-base-fg",
          )}
        />
      </button>
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center bg-black/70 py-0.5 text-[10px] font-bold text-white pointer-events-none">
        #{index + 1} · {audio.duration}s
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
          }
          onRemove(audio.id);
        }}
        className="opacity-0 group-hover:opacity-100 absolute right-[2px] top-[2px] flex h-5 w-5 items-center justify-center rounded-full bg-black/50 hover:bg-red/70 text-white backdrop-blur-md transition-colors hover:bg-black cursor-pointer"
      >
        <XIcon className="h-2.5 w-2.5" />
      </button>
    </div>
  );
};
