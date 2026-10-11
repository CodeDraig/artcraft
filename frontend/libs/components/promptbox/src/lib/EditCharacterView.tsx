import { useState } from "react";
import { ArrowLeftIcon } from "lucide-react";
import { CharactersApi, Character } from "@storyteller/api";
import { toast } from "@storyteller/ui-toaster";
import { useCharactersStore } from "./charactersStore";
import { Input } from "@storyteller/ui-input";
import { Button } from "@storyteller/ui-button";
import { Label } from "@storyteller/ui-label";

const FIELD_LABEL_CLASSES =
  "mb-0 text-[11px] tracking-[0.12em] text-base-fg/70";

// ---------------------------------------------------------------------------
// Edit Character View
// ---------------------------------------------------------------------------

export const EditCharacterView = ({
  character,
  onBack,
  onSaved,
}: {
  character: Character;
  onBack: () => void;
  onSaved: () => void;
}) => {
  const updateCharacterInStore = useCharactersStore((s) => s.updateCharacter);
  const [name, setName] = useState(character.name);
  const [description, setDescription] = useState(
    character.maybe_description ?? "",
  );
  const [saving, setSaving] = useState(false);

  const hasChanges =
    name.trim() !== character.name ||
    (description.trim() || "") !== (character.maybe_description ?? "");

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    setSaving(true);
    try {
      const api = new CharactersApi();
      const res = await api.EditCharacter({
        token: character.token,
        updated_name: name.trim() !== character.name ? name.trim() : undefined,
        updated_description:
          (description.trim() || "") !== (character.maybe_description ?? "")
            ? description.trim() || null
            : undefined,
      });

      if (res.success) {
        toast.success("Character updated");
        updateCharacterInStore(character.token, { name: name.trim() });
        onSaved();
      } else {
        toast.error(res.errorMessage || "Failed to update character");
      }
    } catch {
      toast.error("Failed to update character");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col">
      {/* Scrollable content */}
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center gap-3 pb-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center text-base-fg/60 transition-colors hover:text-base-fg"
          >
            <ArrowLeftIcon />
          </button>
          <h2 className="text-xl font-bold text-base-fg">Edit Character</h2>
        </div>

        {/* Avatar preview */}
        {character.maybe_avatar?.cdn_url && (
          <div className="flex h-56 max-h-56 shrink-0 items-center justify-center overflow-hidden bg-base-fg/[0.05]">
            <img
              src={character.maybe_avatar.cdn_url}
              alt={character.name}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        )}

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="edit-character-name" className={FIELD_LABEL_CLASSES}>
            Name
          </Label>
          <Input
            id="edit-character-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Character name"
            autoComplete="off"
            inputClassName="bg-ui-controls text-sm"
          />
        </div>

        {/* Description input */}
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="edit-character-description"
            className={FIELD_LABEL_CLASSES}
          >
            Description{" "}
            <span className="font-normal text-base-fg/40">(optional)</span>
          </Label>
          <textarea
            id="edit-character-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description..."
            rows={3}
            autoComplete="off"
            className="w-full resize-none rounded-[3px] border border-ui-panel-border bg-ui-controls px-3 py-2 text-sm text-base-fg placeholder-base-fg/50 outline-none transition-colors focus:border-white focus:!outline-none"
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex justify-end gap-2 pt-4">
        <Button variant="secondary" onClick={onBack}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={saving || !name.trim() || !hasChanges}
        >
          Save
        </Button>
      </div>
    </div>
  );
};
