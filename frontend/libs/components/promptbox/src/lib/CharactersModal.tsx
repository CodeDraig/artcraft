import { useState, useCallback, useEffect } from "react";
import { Modal } from "@storyteller/ui-modal";
import { CharactersApi, Character } from "@storyteller/api";
import { toast } from "@storyteller/ui-toaster";
import { useCharactersStore } from "./charactersStore";
import { PendingCharacter, CharacterListView } from "./CharacterListView";
import { EditCharacterView } from "./EditCharacterView";
import { NewCharacterView } from "./NewCharacterView";

interface CharactersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCharacter?: (character: Character) => void;
}


type ModalView = "list" | "create" | "edit";


const POLL_INTERVAL_MS = 5000;

const PENDING_STALE_MS = 3 * 60 * 1000;




export const CharactersModal = ({
  isOpen,
  onClose,
  onSelectCharacter,
}: CharactersModalProps) => {
  const [view, setView] = useState<ModalView>("list");
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(
    null,
  );
  const [pendingCharacters, setPendingCharacters] = useState<
    PendingCharacter[]
  >([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleClose = () => {
    setView("list");
    setEditingCharacter(null);
    onClose();
  };

  const handleEdit = (character: Character) => {
    setEditingCharacter(character);
    setView("edit");
  };

  const handleEditDone = () => {
    setEditingCharacter(null);
    setView("list");
    setRefreshKey((k) => k + 1);
  };

  const handleCreated = (pending: { name: string; previewUrl?: string }) => {
    setPendingCharacters((prev) => [
      { ...pending, createdAt: Date.now() },
      ...prev,
    ]);
    setView("list");
    setRefreshKey((k) => k + 1);
  };

  const removePending = useCallback((name: string) => {
    setPendingCharacters((prev) => prev.filter((p) => p.name !== name));
  }, []);

  // Poll the server while any creation is pending (even with the modal
  // closed), so the pending card gets cleaned up and — once the character is
  // active — the mention store learns its real character token. The create
  // response only carries an inference job token, so @-mentions must wait for
  // the server list to include the character before it can be referenced.
  useEffect(() => {
    if (pendingCharacters.length === 0) return;

    const interval = setInterval(async () => {
      try {
        const api = new CharactersApi();
        const res = await api.ListAllCharacters();
        if (!res.success || !res.data) return;

        const serverNames = new Set(res.data.map((c) => c.name));
        let resolved = false;
        setPendingCharacters((prev) =>
          prev.filter((p) => {
            if (serverNames.has(p.name)) {
              resolved = true;
              return false;
            }
            return true;
          }),
        );
        if (resolved) {
          const store = useCharactersStore.getState();
          store.setCharacters(
            res.data.map((c) => ({
              character_token: c.token,
              name: c.name,
              avatar_image_url: c.maybe_avatar?.cdn_url,
            })),
          );
          store.setLoaded(true);
          setRefreshKey((k) => k + 1);
        }
      } catch {
        // retry next tick
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [pendingCharacters.length]);

  // Time out failed creations so the "Creating..." card never sticks forever.
  useEffect(() => {
    if (pendingCharacters.length === 0) return;

    const timers = pendingCharacters.map((pending) =>
      setTimeout(
        () => {
          setPendingCharacters((prev) => {
            if (!prev.some((p) => p.name === pending.name)) return prev;
            toast.error(`Character "${pending.name}" failed to create`);
            return prev.filter((p) => p.name !== pending.name);
          });
        },
        Math.max(0, PENDING_STALE_MS - (Date.now() - pending.createdAt)),
      ),
    );

    return () => timers.forEach(clearTimeout);
  }, [pendingCharacters]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={view === "list" ? "Characters" : undefined}
      className="max-w-[800px] h-[600px] max-h-[80vh] overflow-hidden"
    >
      <div
        className="overflow-y-auto"
        style={{
          maxHeight:
            view === "list"
              ? "min(calc(600px - 5rem), calc(80vh - 5rem))"
              : "min(calc(600px - 2.5rem), calc(80vh - 2.5rem))",
        }}
      >
        {view === "list" ? (
          <CharacterListView
            key={refreshKey}
            onCreateClick={() => setView("create")}
            onSelectCharacter={onSelectCharacter}
            onEditCharacter={handleEdit}
            pendingCharacters={pendingCharacters}
            onPendingResolved={removePending}
          />
        ) : view === "create" ? (
          <NewCharacterView
            onBack={() => setView("list")}
            onCreated={handleCreated}
          />
        ) : editingCharacter ? (
          <EditCharacterView
            character={editingCharacter}
            onBack={() => {
              setEditingCharacter(null);
              setView("list");
            }}
            onSaved={handleEditDone}
          />
        ) : null}
      </div>
    </Modal>
  );
};
