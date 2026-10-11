import { useState, useRef, useCallback, useEffect } from "react";
import {
  ArrowLeftIcon,
  ImagesIcon,
  LoaderCircleIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import { twMerge } from "tailwind-merge";
import { CharactersApi, MediaUploadApi } from "@storyteller/api";
import { downloadFileFromUrl } from "@storyteller/tauri-api";
import { toast } from "@storyteller/ui-toaster";
import { v4 as uuidv4 } from "uuid";
import { GalleryItem, GalleryModal } from "@storyteller/ui-gallery-modal";
import { Input } from "@storyteller/ui-input";
import { Button } from "@storyteller/ui-button";
import { Label } from "@storyteller/ui-label";

const FIELD_LABEL_CLASSES =
  "mb-0 text-[11px] tracking-[0.12em] text-base-fg/70";

interface UploadedImage {
  file: File;
  url: string;
  mediaToken?: string;
}

// ---------------------------------------------------------------------------
// New Character View
// ---------------------------------------------------------------------------

export const NewCharacterView = ({
  onBack,
  onCreated,
}: {
  onBack: () => void;
  onCreated: (pending: { name: string; previewUrl?: string }) => void;
}) => {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [selectedGalleryImages, setSelectedGalleryImages] = useState<string[]>(
    [],
  );

  const processFiles = useCallback(
    async (files: FileList | File[]) => {
      const imageFiles = Array.from(files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (imageFiles.length === 0) {
        toast.error("Please upload image files");
        return;
      }

      // Only keep the first file (single image)
      const file = imageFiles[0]!;
      const newImages: UploadedImage[] = [
        { file, url: URL.createObjectURL(file) },
      ];

      // Replace any existing image
      setImages((prev) => {
        prev.forEach((img) => URL.revokeObjectURL(img.url));
        return newImages;
      });

      // Upload each image to get media tokens
      setUploading(true);
      const uploadApi = new MediaUploadApi();
      const updatedImages: UploadedImage[] = [];

      for (const img of newImages) {
        try {
          const res = await uploadApi.UploadImage({
            uuid: uuidv4(),
            blob: img.file,
            fileName: img.file.name,
            maybe_title: `character_ref_${name || "unnamed"}`,
          });

          if (res.success && res.data) {
            updatedImages.push({ ...img, mediaToken: res.data });
          } else {
            toast.error(`Failed to upload ${img.file.name}`);
            updatedImages.push(img);
          }
        } catch {
          toast.error(`Failed to upload ${img.file.name}`);
          updatedImages.push(img);
        }
      }

      setImages((prev) =>
        prev.map((existing) => {
          const updated = updatedImages.find((u) => u.url === existing.url);
          return updated || existing;
        }),
      );
      setUploading(false);
    },
    [name],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isDragging) setIsDragging(true);
      if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
    },
    [isDragging],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const { clientX: x, clientY: y } = e;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files?.length) {
        processFiles(e.dataTransfer.files);
      }
    },
    [processFiles],
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      processFiles(e.target.files);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Please enter a character name");
      return;
    }

    const uploadedImages = images.filter((img) => img.mediaToken);
    if (uploadedImages.length < 1) {
      toast.error("Please upload a reference image");
      return;
    }

    setCreating(true);
    try {
      const api = new CharactersApi();
      const res = await api.CreateCharacter({
        image_media_token: uploadedImages[0]!.mediaToken!,
        model: "seedance_2p0",
        uuid_idempotency_token: uuidv4(),
        character_name: name.trim(),
        character_description: description.trim() || null,
      });

      if (res.success && res.data) {
        toast.success(`Character "${name.trim()}" is being created`);
        // Pass pending info up so the list shows an optimistic card
        onCreated({
          name: name.trim(),
          previewUrl: uploadedImages[0]!.url,
        });
      } else {
        toast.error(res.errorMessage || "Failed to create character");
      }
    } catch {
      toast.error("Failed to create character");
    } finally {
      setCreating(false);
    }
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => URL.revokeObjectURL(img.url));
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Scrollable content */}
      <div className="flex flex-col gap-4">
        {/* Header with back button */}
        <div className="flex items-center gap-3 pb-0">
          <button
            onClick={onBack}
            className="flex items-center justify-center text-base-fg/60 transition-colors hover:text-base-fg"
          >
            <ArrowLeftIcon />
          </button>
          <h2 className="text-xl font-bold text-base-fg">New Character</h2>
        </div>

        {/* Image upload area */}
        <div
          ref={dropZoneRef}
          className={twMerge(
            "flex h-56 max-h-56 shrink-0 cursor-pointer flex-col items-center justify-center rounded-[3px] border-2 border-dashed border-base-fg/15 bg-base-fg/[0.05] transition-colors overflow-hidden",
            isDragging && "border-white/60 bg-white/10",
          )}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          {images.length > 0 ? (
            <div
              className="group relative flex h-full w-full items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={images[0]!.url}
                alt="Reference"
                className="max-h-full max-w-full object-contain"
              />
              {!images[0]!.mediaToken && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <LoaderCircleIcon className="text-white animate-spin" />
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(0);
                }}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center bg-black/60 text-white/80 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500"
              >
                <XIcon className="text-sm" />
              </button>
            </div>
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center text-base-fg/60">
              <UploadIcon className="mb-2 text-xl text-base-fg/40" />
              <p className="text-sm">Upload reference image</p>
              <p className="mb-3 text-xs text-base-fg/40">
                Click or drag an image here
              </p>
              <div
                className="flex items-center gap-3"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setIsGalleryOpen(true)}
                  className="flex items-center gap-2 rounded-[3px] border border-base-fg/15 bg-transparent px-3 py-1.5 text-sm text-base-fg/80 transition-colors hover:border-base-fg/25 hover:bg-base-fg/[0.07] hover:text-base-fg"
                >
                  <ImagesIcon className="text-xs" />
                  Choose from Library
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 rounded-[3px] border border-base-fg/15 bg-transparent px-3 py-1.5 text-sm text-base-fg/80 transition-colors hover:border-base-fg/25 hover:bg-base-fg/[0.07] hover:text-base-fg"
                >
                  <UploadIcon className="text-xs" />
                  Upload Image
                </button>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Name input */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="character-name" className={FIELD_LABEL_CLASSES}>
            Name
          </Label>
          <Input
            id="character-name"
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
            htmlFor="character-description"
            className={FIELD_LABEL_CLASSES}
          >
            Description{" "}
            <span className="font-normal text-base-fg/40">(optional)</span>
          </Label>
          <textarea
            id="character-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description..."
            rows={3}
            autoComplete="off"
            className="w-full resize-none rounded-[3px] border border-ui-panel-border bg-ui-controls px-3 py-2 text-sm text-base-fg placeholder-base-fg/50 outline-none transition-colors focus:border-white focus:!outline-none"
          />
        </div>
      </div>

      {/* Action buttons — sticky at the bottom */}
      <div className="sticky bottom-0 flex justify-end gap-2 pt-4 pb-1 bg-ui-modal">
        <Button variant="secondary" onClick={onBack}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          loading={creating}
          disabled={
            creating ||
            uploading ||
            !name.trim() ||
            images.filter((i) => i.mediaToken).length < 1
          }
        >
          Create
        </Button>
      </div>

      <GalleryModal
        isOpen={isGalleryOpen}
        onClose={() => {
          setIsGalleryOpen(false);
          setSelectedGalleryImages([]);
        }}
        mode="select"
        selectedItemIds={selectedGalleryImages}
        onSelectItem={(id) => {
          setSelectedGalleryImages((prev) => (prev.includes(id) ? [] : [id]));
        }}
        maxSelections={1}
        onUseSelected={(selectedItems: GalleryItem[]) => {
          const item = selectedItems[0];
          if (item && item.fullImage) {
            // Clean up previous image
            images.forEach((img) => URL.revokeObjectURL(img.url));
            setImages([
              {
                file: new File([], "library-image"),
                url: item.fullImage,
                mediaToken: item.id,
              },
            ]);
          }
          setIsGalleryOpen(false);
          setSelectedGalleryImages([]);
        }}
        onDownloadClicked={downloadFileFromUrl}
        forceFilter="image"
      />
    </div>
  );
};
