import { useState } from "react";
import { DynamicIcon } from "@storyteller/icons";
/** Small thumbnail used in the bulk-selection footer bar. */
export const BulkThumb = ({
  thumbnail,
  placeholderIcon,
}: {
  thumbnail: string | null;
  placeholderIcon: any;
}) => {
  const [failed, setFailed] = useState(false);
  const showImage = !!thumbnail && !failed;

  return (
    <div className="h-8 w-8 overflow-hidden border-2 border-ui-panel bg-black/30 flex-shrink-0">
      {showImage ? (
        <img
          src={thumbnail}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-black/50">
          <DynamicIcon
            icon={placeholderIcon}
            className="text-xs text-white/50"
          />
        </div>
      )}
    </div>
  );
};
