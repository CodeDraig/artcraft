import { invoke } from "@tauri-apps/api/core";
import { CommandResult } from "../common/CommandStatus";
import { GenerationProvider } from "@storyteller/api-enums";

export interface GetProviderOrderSuccess extends CommandResult {
  payload: GetProviderOrderPayload;
}

export interface GetProviderOrderPayload {
  providers: GenerationProvider[];
}

// Returns the Success and Error variants directly.
// Throws on Network/Tauri errors.
export const GetProviderOrder = async () : Promise<GetProviderOrderSuccess> => {
  try {
    return await invoke("get_provider_order_command") as GetProviderOrderSuccess;
  } catch (error) {
    // NB: Endpoint should be infalliable
    throw error;
  }
}
