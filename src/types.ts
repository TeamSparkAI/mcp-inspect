export interface MCPServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServerConfig>;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface ServerState {
  status: ConnectionStatus;
  error: string | null;
  capabilities: {
    resources?: boolean;
    prompts?: boolean;
    tools?: boolean;
  };
  resources: any[];
  prompts: any[];
  tools: any[];
}
