import { useState } from "react";
import { MediaUploadApi } from "@storyteller/api";
import { v4 as uuidv4 } from "uuid";
import { toast } from "react-hot-toast";

export function useObjectImageUpload() {
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [uploadedMediaToken, setUploadedMediaToken] = useState<string | null>(
    null,
  );
  const [isUploading, setIsUploading] = useState(false);

  const handleFiles = async (files?: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) return;

    setUploadedName(file.name);
    setUploadedMediaToken(null);
    setIsUploading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUploadedPreview(dataUrl);
    };
    reader.readAsDataURL(file);

    try {
      const mediaUploadApi = new MediaUploadApi();
      const uuid = uuidv4();

      const uploadResult = await mediaUploadApi.UploadImage({
        blob: file,
        fileName: file.name,
        uuid: uuid,
      });

      if (!uploadResult.success || !uploadResult.data) {
        throw new Error("Failed to upload image");
      }

      setUploadedMediaToken(uploadResult.data);
    } catch (error) {
      toast.error("Failed to upload image");
      setUploadedPreview(null);
      setUploadedName(null);
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadedPreview,
    setUploadedPreview,
    uploadedName,
    setUploadedName,
    uploadedMediaToken,
    setUploadedMediaToken,
    isUploading,
    handleFiles,
  };
}
