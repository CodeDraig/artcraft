import { ImagesIcon, PlusIcon } from "lucide-react";
import { Button } from "@storyteller/ui-button";

// ─── EmptyState ───────────────────────────────────────────────────────────────

export const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <div className="flex h-[calc(100vh-56px)] w-full items-center justify-center bg-ui-background">
    <div className="flex flex-col items-center gap-4 text-center">
      <div className="flex h-20 w-20 items-center justify-center border border-white/15 bg-white/[0.015]">
        <ImagesIcon className="text-4xl text-base-fg/40" />
      </div>
      <div>
        <p className="font-display text-2xl tracking-tight text-base-fg">
          No shots yet
        </p>
        <p className="mt-1 text-sm text-base-fg/50">
          Add your first shot to get started
        </p>
      </div>
      <Button variant="primary" icon={PlusIcon} onClick={onAdd}>
        Add your first shot
      </Button>
    </div>
  </div>
);
