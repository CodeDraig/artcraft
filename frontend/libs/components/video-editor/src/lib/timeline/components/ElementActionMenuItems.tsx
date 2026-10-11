import { canElementBeHidden } from "../element-utils";
import { ContextMenuItem } from "../../components/ui/context-menu";
import type { TimelineElement as TimelineElementType } from "../types";
import {
  getActionDefinition,
  type TAction,
  type TActionWithOptionalArgs,
  invokeAction,
} from "../../actions";
import {
  Delete02Icon,
  Copy01Icon,
  ViewIcon,
  ViewOffSlashIcon,
  VolumeHighIcon,
  VolumeOffIcon,
  VolumeMute02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { uppercase } from "../../utils/string";
import { type ComponentProps, type ReactNode } from "react";

export function getDisplayShortcut({ action }: { action: TAction }) {
  const defaultShortcuts = getActionDefinition({ action }).defaultShortcuts;
  if (!defaultShortcuts?.length) {
    return "";
  }

  return uppercase({
    string: defaultShortcuts[0].replace("+", " "),
  });
}

export function CopyMenuItem() {
  return (
    <ActionMenuItem
      action="copy-selected"
      icon={<HugeiconsIcon icon={Copy01Icon} />}
    >
      Copy
    </ActionMenuItem>
  );
}

export function MuteMenuItem({
  isMultipleSelected,
  isCurrentElementSelected,
  isMuted,
}: {
  isMultipleSelected: boolean;
  isCurrentElementSelected: boolean;
  isMuted: boolean;
}) {
  const getIcon = () => {
    if (isMultipleSelected && isCurrentElementSelected) {
      return <HugeiconsIcon icon={VolumeMute02Icon} />;
    }
    return isMuted ? (
      <HugeiconsIcon icon={VolumeOffIcon} />
    ) : (
      <HugeiconsIcon icon={VolumeHighIcon} />
    );
  };

  return (
    <ActionMenuItem action="toggle-elements-muted-selected" icon={getIcon()}>
      {isMuted ? "Unmute" : "Mute"}
    </ActionMenuItem>
  );
}

export function VisibilityMenuItem({
  element,
  isMultipleSelected,
  isCurrentElementSelected,
}: {
  element: TimelineElementType;
  isMultipleSelected: boolean;
  isCurrentElementSelected: boolean;
}) {
  const isHidden = canElementBeHidden(element) && element.hidden;

  const getIcon = () => {
    if (isMultipleSelected && isCurrentElementSelected) {
      return <HugeiconsIcon icon={ViewOffSlashIcon} />;
    }
    return isHidden ? (
      <HugeiconsIcon icon={ViewIcon} />
    ) : (
      <HugeiconsIcon icon={ViewOffSlashIcon} />
    );
  };

  return (
    <ActionMenuItem
      action="toggle-elements-visibility-selected"
      icon={getIcon()}
    >
      {isHidden ? "Show" : "Hide"}
    </ActionMenuItem>
  );
}

export function DeleteMenuItem({
  isMultipleSelected,
  isCurrentElementSelected,
  elementType,
  selectedCount,
}: {
  isMultipleSelected: boolean;
  isCurrentElementSelected: boolean;
  elementType: TimelineElementType["type"];
  selectedCount: number;
}) {
  return (
    <ActionMenuItem
      action="delete-selected"
      variant="destructive"
      icon={<HugeiconsIcon icon={Delete02Icon} />}
    >
      {isMultipleSelected && isCurrentElementSelected
        ? `Delete ${selectedCount} elements`
        : `Delete ${elementType === "text" ? "text" : "clip"}`}
    </ActionMenuItem>
  );
}

export function ActionMenuItem({
  action,
  children,
  ...props
}: Omit<ComponentProps<typeof ContextMenuItem>, "onClick" | "textRight"> & {
  action: TActionWithOptionalArgs;
  children: ReactNode;
}) {
  return (
    <ContextMenuItem
      onClick={(event: React.MouseEvent) => {
        event.stopPropagation();
        invokeAction(action);
      }}
      textRight={getDisplayShortcut({ action })}
      {...props}
    >
      {children}
    </ContextMenuItem>
  );
}
