import { useState } from "react";
import { MediaUploadApi } from "@storyteller/api";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-hot-toast";

export interface WorldImage {
  id: string;
  preview: string;
  mediaToken: string | null;
  name: string;
  isUploading: boolean;
}

export const MAX_WORLD_IMAGES = 10;

export function useWorldImageUploads() {
  const [worldImages, setWorldImages] = useState<WorldImage[]>([]);

  const handleWorldFiles = async (files: File[]) => {
    const remaining = MAX_WORLD_IMAGES - worldImages.length;
    const imageFiles = files
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, remaining);

    await Promise.all(
      imageFiles.map(async (file) => {
        const imageId =
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : Math.random().toString(36).slice(2, 10);

        const preview = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });

        setWorldImages((prev) => [
          ...prev,
          {
            id: imageId,
            preview,
            mediaToken: null,
            name: file.name,
            isUploading: true,
          },
        ]);

        try {
          const mediaUploadApi = new MediaUploadApi();
          const uploadResult = await mediaUploadApi.UploadImage({
            blob: file,
            fileName: file.name,
            uuid: uuidv4(),
          });

          if (!uploadResult.success || !uploadResult.data) {
            throw new Error("Upload failed");
          }

          setWorldImages((prev) =>
            prev.map((img) =>
              img.id === imageId
                ? { ...img, mediaToken: uploadResult.data!, isUploading: false }
                : img,
            ),
          );
        } catch {
          toast.error(`Failed to upload ${file.name}`);
          setWorldImages((prev) => prev.filter((img) => img.id !== imageId));
        }
      }),
    );
  };

  const removeWorldImage = (imageId: string) => {
    setWorldImages((prev) => prev.filter((img) => img.id !== imageId));
  };

  return { worldImages, setWorldImages, handleWorldFiles, removeWorldImage };
}
