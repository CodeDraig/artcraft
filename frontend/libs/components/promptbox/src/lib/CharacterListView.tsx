import { useState, useCallback, useEffect } from "react";
import {
  EyeIcon,
  LoaderCircleIcon,
  PenIcon,
  PlusIcon,
  Trash2Icon,
  UsersIcon,
} from "lucide-react";
import { CharactersApi, Character } from "@storyteller/api";
import { toast } from "@storyteller/ui-toaster";
import { useCharactersStore } from "./charactersStore";
import { DeckPreviewModal } from "./deck/DeckCard";
import {
  showActionReminder,
  isActionReminderOpen,
  actionReminderProps,
} from "@storyteller/ui-action-reminder-modal";

export interface PendingCharacter {
  name: string;
  previewUrl?: string;
  createdAt: number;
}

// ---------------------------------------------------------------------------
// Character List View
// ---------------------------------------------------------------------------

export const CharacterListView = ({
  onCreateClick,
  onSelectCharacter,
  onEditCharacter,
  pendingCharacters,
  onPendingResolved,
}: {
  onCreateClick: () => void;
  onSelectCharacter?: (character: Character) => void;
  onEditCharacter: (character: Character) => void;
  pendingCharacters: PendingCharacter[];
  onPendingResolved: (name: string) => void;
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewCharacter, setPreviewCharacter] = useState<Character | null>(
    null,
  );

  const storeSetCharacters = useCharactersStore((s) => s.setCharacters);
  const storeSetLoaded = useCharactersStore((s) => s.setLoaded);
  const storeRemoveCharacter = useCharactersStore((s) => s.removeCharacter);

  const syncToStore = useCallback(
    (chars: Character[]) => {
      storeSetCharacters(
        chars.map((c) => ({
          character_token: c.token,
          name: c.name,
          avatar_image_url: c.maybe_avatar?.cdn_url,
        })),
      );
      storeSetLoaded(true);
    },
    [storeSetCharacters, storeSetLoaded],
  );

  const fetchCharacters = useCallback(async () => {
    try {
      const api = new CharactersApi();
      const res = await api.ListAllCharacters();
      if (res.success && res.data) {
        setCharacters(res.data);
        syncToStore(res.data);
      }
    } catch {
      storeSetLoaded(true);
    } finally {
      setLoading(false);
    }
  }, [syncToStore, storeSetLoaded]);

  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  // Drop pendings already represented in the fetched list (no duplicate cards)
  useEffect(() => {
    if (pendingCharacters.length === 0) return;
    const names = new Set(characters.map((c) => c.name));
    for (const pending of pendingCharacters) {
      if (names.has(pending.name)) onPendingResolved(pending.name);
    }
  }, [characters, pendingCharacters, onPendingResolved]);

  const handleDelete = (character: Character) => {
    showActionReminder({
      reminderType: "default",
      title: "Delete character?",
      message: (
        <p className="text-sm text-white/70">
          This will permanently delete <strong>{character.name}</strong>. This
          action cannot be undone.
        </p>
      ),
      primaryActionText: "Delete",
      primaryActionIcon: Trash2Icon,
      secondaryActionText: "Cancel",
      primaryActionBtnClassName: "bg-red text-white hover:bg-red/90",
      onPrimaryAction: async () => {
        if (actionReminderProps.value) {
          actionReminderProps.value = {
            ...actionReminderProps.value,
            isLoading: true,
          };
        }
        try {
          const api = new CharactersApi();
          const res = await api.DeleteCharacter({
            characterToken: character.token,
          });

          if (res.success) {
            setCharacters((prev) =>
              prev.filter((c) => c.token !== character.token),
            );
            storeRemoveCharacter(character.token);
            toast.success(`Character "${character.name}" deleted`);
          } else {
            toast.error(res.errorMessage || "Failed to delete character");
          }
        } catch {
          toast.error("Failed to delete character");
        } finally {
          isActionReminderOpen.value = false;
        }
      },
    });
  };

  return (
    <div className="flex flex-col">
      {loading && characters.length === 0 ? (
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col overflow-hidden border border-transparent bg-base-fg/[0.05]"
            >
              <div className="aspect-square w-full overflow-hidden">
                <div
                  className="h-full w-full bg-base-fg/[0.06]"
                  style={{
                    animation: `charPulse 1.8s ease-in-out ${i * 0.07}s infinite`,
                  }}
                />
              </div>
              <div className="px-2 py-1.5 flex justify-center bg-base-fg/[0.04]">
                <div
                  className="h-3 w-2/3 bg-base-fg/[0.08]"
                  style={{
                    animation: `charPulse 1.8s ease-in-out ${i * 0.07 + 0.1}s infinite`,
                  }}
                />
              </div>
            </div>
          ))}
          <style>{`
            @keyframes charPulse {
              0%, 100% { opacity: 0.4; }
              50% { opacity: 0.8; }
            }
          `}</style>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {/* Create New card */}
          <button
            onClick={onCreateClick}
            className="flex flex-col items-center justify-center gap-2 overflow-hidden border-2 border-dashed border-base-fg/15 bg-base-fg/[0.05] text-base-fg/60 transition-colors hover:border-base-fg/30 hover:text-base-fg/80"
          >
            <div className="flex aspect-square w-full flex-col items-center justify-center gap-2">
              <PlusIcon className="text-lg" />
              <span className="text-sm font-medium">Create New</span>
            </div>
          </button>

          {/* Pending (creating) characters */}
          {pendingCharacters.map((pending) => (
            <div
              key={`pending-${pending.name}`}
              className="relative flex flex-col overflow-hidden border border-transparent bg-base-fg/[0.05]"
            >
              <div className="aspect-square w-full overflow-hidden bg-base-fg/[0.05]">
                {pending.previewUrl ? (
                  <img
                    src={pending.previewUrl}
                    alt={pending.name}
                    className="h-full w-full object-cover object-top opacity-50"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-base-fg/20">
                    <UsersIcon className="text-2xl" />
                  </div>
                )}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40">
                  <LoaderCircleIcon className="text-lg text-white/80 animate-spin" />
                  <span className="text-xs font-medium text-white/80">
                    Creating...
                  </span>
                </div>
              </div>
              <div className="px-2 py-1.5 text-center">
                <p className="truncate text-xs font-medium text-base-fg/50">
                  {pending.name}
                </p>
              </div>
            </div>
          ))}

          {characters.map((character) => {
            const isUserCreated = character.is_user_created !== false;

            return (
              <div
                key={character.token}
                className="group relative flex flex-col overflow-hidden border border-transparent bg-base-fg/[0.05] transition-colors hover:border-base-fg/30 hover:bg-base-fg/10"
              >
                <button
                  onClick={() => onSelectCharacter?.(character)}
                  className="flex flex-1 flex-col"
                >
                  <div className="aspect-square w-full overflow-hidden bg-base-fg/[0.05]">
                    {character.maybe_avatar?.cdn_url ? (
                      <img
                        src={character.maybe_avatar.cdn_url}
                        alt={character.name}
                        className="h-full w-full object-cover object-top"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-base-fg/20">
                        <UsersIcon className="text-2xl" />
                      </div>
                    )}
                  </div>
                  <div className="px-2 py-1.5">
                    <p className="truncate text-xs font-medium text-base-fg/80">
                      {character.name}
                    </p>
                  </div>
                </button>

                {/* View / Edit / Delete overlay buttons. Hover-revealed on
                    desktop; always visible on touch devices (no hover). */}
                {(character.maybe_avatar?.cdn_url || isUserCreated) && (
                  <div className="absolute right-1.5 top-1.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                    {character.maybe_avatar?.cdn_url && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewCharacter(character);
                        }}
                        title="View full size"
                        className="flex h-7 w-7 items-center justify-center bg-black/60 text-white/80 transition-colors hover:bg-black/80"
                      >
                        <EyeIcon className="text-[10px]" />
                      </button>
                    )}
                    {isUserCreated && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditCharacter(character);
                          }}
                          className="flex h-7 w-7 items-center justify-center bg-black/60 text-white/80 transition-colors hover:bg-black/80"
                        >
                          <PenIcon className="text-[10px]" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(character);
                          }}
                          className="flex h-7 w-7 items-center justify-center bg-black/60 text-white/80 transition-colors hover:bg-red-500"
                        >
                          <Trash2Icon className="text-[10px]" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <DeckPreviewModal
        item={
          previewCharacter?.maybe_avatar?.cdn_url
            ? {
                id: previewCharacter.token,
                kind: "image",
                url: previewCharacter.maybe_avatar.cdn_url,
                name: previewCharacter.name,
              }
            : null
        }
        onClose={() => setPreviewCharacter(null)}
      />
    </div>
  );
};
