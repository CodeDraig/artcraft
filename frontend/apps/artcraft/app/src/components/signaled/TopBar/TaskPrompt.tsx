import { Tooltip } from "@storyteller/ui-tooltip";
import { CheckIcon, CopyIcon } from "lucide-react";
import { DynamicIcon } from "@storyteller/icons";
import { useEffect, useRef, useState } from "react";
import { twMerge } from "tailwind-merge";

export const PromptLine = ({
  prompt,
  className,
}: {
  prompt: string;
  className?: string;
}) => {
  const [marqueePlaying, setMarqueePlaying] = useState(false);
  const [promptOverflows, setPromptOverflows] = useState(false);
  const promptRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = promptRef.current;
    if (el) setPromptOverflows(el.scrollWidth > el.clientWidth);
  }, [prompt]);

  return (
    <Tooltip
      content={prompt.length > 300 ? prompt.slice(0, 300) + "\u2026" : prompt}
      position="bottom"
      strategy="fixed"
      className="max-w-[280px] text-wrap text-xs"
      zIndex={50}
      delay={400}
    >
      <div
        className={twMerge("mt-1 overflow-hidden", className)}
        onMouseEnter={
          promptOverflows ? () => setMarqueePlaying(true) : undefined
        }
        onMouseLeave={
          promptOverflows ? () => setMarqueePlaying(false) : undefined
        }
      >
        <div
          ref={promptRef}
          key={marqueePlaying ? "playing" : "idle"}
          className="whitespace-nowrap text-[11px] italic text-base-fg/40"
          style={
            marqueePlaying
              ? {
                  animation: "marquee 6.5s linear infinite",
                  animationDelay: "0.5s",
                  animationFillMode: "both",
                }
              : undefined
          }
        >
          {prompt}
        </div>
      </div>
    </Tooltip>
  );
};

export const CopyPromptButton = ({ prompt }: { prompt: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <Tooltip
      content={copied ? "Copied!" : "Copy prompt"}
      position="bottom"
      strategy="fixed"
      className="text-xs"
      zIndex={50}
      delay={300}
    >
      <button
        className="flex h-6 w-6 items-center justify-center text-base-fg/60 hover:bg-ui-controls"
        aria-label="Copy prompt"
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(prompt);
          setCopied(true);
          setTimeout(() => setCopied(false), 3000);
        }}
      >
        <DynamicIcon
          icon={copied ? CheckIcon : CopyIcon}
          className={copied ? "text-green-400" : ""}
        />
      </button>
    </Tooltip>
  );
};
