import { invoke } from "@tauri-apps/api/core";
import { CommandResult } from "../common/CommandStatus";
import { GenerationProvider } from "@storyteller/api-enums";

export interface SetProviderOrderRequest {
  providers: GenerationProvider[];
}

export const SetProviderOrder = async (request: SetProviderOrderRequest) : Promise<CommandResult> => {
  const result = await invoke("set_provider_order_command", { 
    request: {
      providers: request.providers,
    }
  });

  return (result as CommandResult);
}
