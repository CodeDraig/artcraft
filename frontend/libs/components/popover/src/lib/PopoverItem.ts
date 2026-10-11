import type { ReactNode } from "react";
import type { Model } from "@storyteller/model-list";

type HoverTooltipContent = ReactNode | ((close: () => void) => ReactNode);

export interface PopoverItem {
  label: string;
  selected: boolean;
  icon?: ReactNode;
  action?: string;
  disabled?: boolean;
  divider?: boolean;
  description?: string;
  // Longer info blurb surfaced behind an (i) icon next to the label. Shown on
  // hover (desktop) and tap (mobile). Only rendered in `richList` mode.
  info?: ReactNode;
  badges?: Array<{
    label: string;
    icon?: ReactNode;
  }>;
  model?: Model;
  // Optional trailing content rendered on the far right of each list row
  // (e.g., a settings button or tooltip trigger)
  trailing?: ReactNode;
  // Optional tooltip content to show when hovering the entire row
  hoverTooltip?: HoverTooltipContent;
  tooltipDelayMs?: number;
  // Optional custom right-side node shown when item is selected
  selectedRight?: ReactNode;
  // Renders this row as a group (e.g. a model family) whose children open in
  // a right-side flyout submenu. Group rows never select themselves; clicking
  // a child selects it and closes the whole popover. Only used in `richList`
  // mode. Build model groups with `groupModelItems`.
  subItems?: PopoverItem[];
}
