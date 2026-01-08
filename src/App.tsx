import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import type { MCPConfig, ServerState } from './types.js';
import type { FocusArea } from './types/focus.js';
import { useMCPClient, LoggingProxyTransport } from './hooks/useMCPClient.js';
import { useMessageTracking } from './hooks/useMessageTracking.js';
import { Tabs, type TabType, tabs as tabList } from './components/Tabs.js';
import { ResourcesTab } from './components/ResourcesTab.js';
import { PromptsTab } from './components/PromptsTab.js';
import { ToolsTab } from './components/ToolsTab.js';
import { NotificationsTab } from './components/NotificationsTab.js';
import { HistoryTab } from './components/HistoryTab.js';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { Client as MCPClient } from '@modelcontextprotocol/sdk/client/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get project info
const packagePath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8')) as {
  name: string;
  description: string;
  version: string;
};

interface AppProps {
  configFile: string;
}

function App({ configFile }: AppProps) {
  const [command, setCommand] = useState('');
  const [showCommand, setShowCommand] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('resources');
  const [focus, setFocus] = useState<FocusArea>('serverList');
  const [tabCounts, setTabCounts] = useState<{
    resources?: number;
    prompts?: number;
    tools?: number;
    notifications?: number;
    history?: number;
  }>({});
  
  // Server state management - store state for all servers
  const [serverStates, setServerStates] = useState<Record<string, ServerState>>({});
  const [serverClients, setServerClients] = useState<Record<string, Client | null>>({});
  
  // Message tracking
  const { history: messageHistory, trackRequest, trackResponse, trackNotification } = useMessageTracking();
  const [dimensions, setDimensions] = useState({
    width: process.stdout.columns || 80,
    height: process.stdout.rows || 24,
  });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        width: process.stdout.columns || 80,
        height: process.stdout.rows || 24,
      });
    };

    process.stdout.on('resize', updateDimensions);
    return () => {
      process.stdout.off('resize', updateDimensions);
    };
  }, []);

  // Parse MCP configuration
  const mcpConfig = useMemo(() => {
    try {
      const configPath = resolve(process.cwd(), configFile);
      const configContent = readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent) as MCPConfig;
      
      if (!config.mcpServers) {
        throw new Error('Configuration file must contain an mcpServers element');
      }
      
      return config;
    } catch (error) {
      if (error instanceof Error) {
        console.error(`Error loading configuration: ${error.message}`);
      } else {
        console.error('Error loading configuration: Unknown error');
      }
      process.exit(1);
    }
  }, [configFile]);

  const serverNames = Object.keys(mcpConfig.mcpServers);
  const selectedServerConfig = selectedServer ? mcpConfig.mcpServers[selectedServer] : null;
  
  // Initialize server states for all configured servers on mount
  useEffect(() => {
    const initialStates: Record<string, ServerState> = {};
    for (const serverName of serverNames) {
      if (!(serverName in serverStates)) {
        initialStates[serverName] = {
          status: 'disconnected',
          error: null,
          capabilities: {},
          resources: [],
          prompts: [],
          tools: [],
        };
      }
    }
    if (Object.keys(initialStates).length > 0) {
      setServerStates(prev => ({ ...prev, ...initialStates }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  // Memoize message tracking callbacks to prevent unnecessary re-renders
  const messageTracking = useMemo(() => {
    if (!selectedServer) return undefined;
    return {
      trackRequest: (msg: any) => trackRequest(selectedServer, msg),
      trackResponse: (msg: any) => trackResponse(selectedServer, msg),
      trackNotification: (msg: any) => trackNotification(selectedServer, msg),
    };
  }, [selectedServer, trackRequest, trackResponse, trackNotification]);
  
  // Get client for selected server (for connection management)
  const { connection, connect: connectClient, disconnect: disconnectClient } = useMCPClient(
    selectedServer, 
    selectedServerConfig, 
    messageTracking
  );

  // Connect handler - connects, gets capabilities, and queries resources/prompts/tools
  const handleConnect = useCallback(async () => {
    if (!selectedServer || !selectedServerConfig) return;
    
    // Capture server name immediately to avoid closure issues
    const serverName = selectedServer;
    const serverConfig = selectedServerConfig;
    
    // Set status to connecting immediately to prevent jittering
    setServerStates(prev => ({
      ...prev,
      [serverName]: {
        ...prev[serverName] || {
          status: 'disconnected' as const,
          error: null,
          capabilities: {},
          resources: [],
          prompts: [],
          tools: [],
        },
        status: 'connecting',
        error: null,
      },
    }));
    
    // Create a new client connection for this specific server
    const baseTransport = new StdioClientTransport({
      command: serverConfig.command,
      args: serverConfig.args || [],
      env: serverConfig.env,
    });

    // Wrap with proxy transport if message tracking is enabled
    const transport = messageTracking
      ? new LoggingProxyTransport(baseTransport, messageTracking)
      : baseTransport;

    const client = new MCPClient(
      {
        name: 'mcp-inspect',
        version: '1.0.0',
      },
      {
        capabilities: {},
      }
    );

    try {
      await client.connect(transport);
      
      // Store client immediately
      setServerClients(prev => ({ ...prev, [serverName]: client }));

      // Get server capabilities
      const serverCapabilities = client.getServerCapabilities() || {};
      const capabilities = {
        resources: !!serverCapabilities.resources,
        prompts: !!serverCapabilities.prompts,
        tools: !!serverCapabilities.tools,
      };

      // Query resources, prompts, and tools based on capabilities
      let resources: any[] = [];
      let prompts: any[] = [];
      let tools: any[] = [];

      if (capabilities.resources) {
        try {
          const result = await client.listResources();
          resources = result.resources || [];
        } catch (err) {
          // Ignore errors, just leave empty
        }
      }

      if (capabilities.prompts) {
        try {
          const result = await client.listPrompts();
          prompts = result.prompts || [];
        } catch (err) {
          // Ignore errors, just leave empty
        }
      }

      if (capabilities.tools) {
        try {
          const result = await client.listTools();
          tools = result.tools || [];
        } catch (err) {
          // Ignore errors, just leave empty
        }
      }

      // Update server state - use captured serverName to ensure we update the correct server
      setServerStates(prev => {
        const existingState = prev[serverName] || {
          status: 'disconnected' as const,
          error: null,
          capabilities: {},
          resources: [],
          prompts: [],
          tools: [],
        };
        
        return {
          ...prev,
          [serverName]: {
            ...existingState,
            status: 'connected' as const,
            error: null,
            capabilities,
            resources,
            prompts,
            tools,
          },
        };
      });
    } catch (error) {
      // Make sure we clean up the client on error
      try {
        await client.close();
      } catch (closeErr) {
        // Ignore close errors
      }
      
      setServerStates(prev => ({
        ...prev,
        [serverName]: {
          ...prev[serverName] || {
            status: 'disconnected' as const,
            error: null,
            capabilities: {},
            resources: [],
            prompts: [],
            tools: [],
          },
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      }));
    }
  }, [selectedServer, selectedServerConfig, messageTracking]);

  // Disconnect handler
  const handleDisconnect = useCallback(async () => {
    if (!selectedServer) return;
    
    await disconnectClient();
    
    setServerClients(prev => {
      const newClients = { ...prev };
      delete newClients[selectedServer];
      return newClients;
    });

    setServerStates(prev => ({
      ...prev,
      [selectedServer]: {
        ...prev[selectedServer],
        status: 'disconnected',
        error: null,
        capabilities: {},
        resources: [],
        prompts: [],
        tools: [],
      },
    }));

    setTabCounts(prev => ({
      ...prev,
      resources: 0,
      prompts: 0,
      tools: 0,
    }));
  }, [selectedServer, disconnectClient]);
  
  const currentServerMessages = useMemo(() => 
    selectedServer ? (messageHistory[selectedServer] || []) : [],
    [selectedServer, messageHistory]
  );
  
  const currentServerState = useMemo(() => 
    selectedServer ? (serverStates[selectedServer] || null) : null,
    [selectedServer, serverStates]
  );
  
  const currentServerClient = useMemo(() => 
    selectedServer ? (serverClients[selectedServer] || null) : null,
    [selectedServer, serverClients]
  );

  // Update tab counts when selected server changes
  useEffect(() => {
    if (!selectedServer) {
      return;
    }
    
    const serverState = serverStates[selectedServer];
    if (serverState?.status === 'connected') {
      setTabCounts({
        resources: serverState.resources?.length || 0,
        prompts: serverState.prompts?.length || 0,
        tools: serverState.tools?.length || 0,
        history: messageHistory[selectedServer]?.length || 0,
      });
    } else if (serverState?.status !== 'connecting') {
      // Reset counts for disconnected or error states
      setTabCounts({
        resources: 0,
        prompts: 0,
        tools: 0,
        history: messageHistory[selectedServer]?.length || 0,
      });
    }
  }, [selectedServer, serverStates, messageHistory]);

  // Keep focus state consistent when entering/leaving History
  useEffect(() => {
    if (activeTab === 'history') {
      if (focus === 'tabContent') setFocus('historyList');
    } else {
      if (focus === 'historyList' || focus === 'historyDetail') setFocus('tabContent');
    }
  }, [activeTab]); // intentionally not depending on focus to avoid loops

  useInput((input: string, key: Key) => {
    if (key.ctrl && input === 'c') {
      process.exit();
    }

    if (input === '/') {
      setShowCommand(true);
      setCommand('/');
      return;
    }

    if (showCommand) {
      if (key.return) {
        handleCommand(command);
        setCommand('');
        setShowCommand(false);
      } else if (key.backspace || key.delete) {
        if (command.length > 1) {
          setCommand(command.slice(0, -1));
        } else {
          setCommand('');
          setShowCommand(false);
        }
      } else if (key.escape) {
        setCommand('');
        setShowCommand(false);
      } else if (input && !key.ctrl && !key.meta) {
        setCommand(command + input);
      }
    } else {
      // Tab switching with accelerator keys (first character of tab name)
      const tabAccelerators: Record<string, TabType> = Object.fromEntries(
        tabList.map((tab: { id: TabType; label: string; accelerator: string }) => [tab.accelerator, tab.id])
      );
      if (tabAccelerators[input.toLowerCase()]) {
        setActiveTab(tabAccelerators[input.toLowerCase()]);
        setFocus('tabs');
      } else if (key.tab && !key.shift) {
        // Flat focus order. History gets 2 focus stops.
        const focusOrder: FocusArea[] =
          activeTab === 'history'
            ? ['serverList', 'tabs', 'historyList', 'historyDetail']
            : ['serverList', 'tabs', 'tabContent'];
        const currentIndex = focusOrder.indexOf(focus);
        const nextIndex = (currentIndex + 1) % focusOrder.length;
        setFocus(focusOrder[nextIndex]);
      } else if (key.tab && key.shift) {
        const focusOrder: FocusArea[] =
          activeTab === 'history'
            ? ['serverList', 'tabs', 'historyList', 'historyDetail']
            : ['serverList', 'tabs', 'tabContent'];
        const currentIndex = focusOrder.indexOf(focus);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : focusOrder.length - 1;
        setFocus(focusOrder[prevIndex]);
      } else if (key.upArrow || key.downArrow) {
        // Arrow keys only work in the focused pane
        if (focus === 'serverList') {
          // Arrow key navigation for server list
          if (key.upArrow) {
            if (selectedServer === null) {
              setSelectedServer(serverNames[serverNames.length - 1] || null);
            } else {
              const currentIndex = serverNames.indexOf(selectedServer);
              const newIndex = currentIndex > 0 ? currentIndex - 1 : serverNames.length - 1;
              setSelectedServer(serverNames[newIndex] || null);
            }
          } else if (key.downArrow) {
            if (selectedServer === null) {
              setSelectedServer(serverNames[0] || null);
            } else {
              const currentIndex = serverNames.indexOf(selectedServer);
              const newIndex = currentIndex < serverNames.length - 1 ? currentIndex + 1 : 0;
              setSelectedServer(serverNames[newIndex] || null);
            }
          }
        }
        // If focus is 'tabs' or tab content, arrow keys will be handled by those components
      } else if (focus === 'tabs' && (key.leftArrow || key.rightArrow)) {
        // Left/Right arrows switch tabs when tabs are focused
        const tabs: TabType[] = ['resources', 'prompts', 'tools', 'notifications', 'history'];
        const currentIndex = tabs.indexOf(activeTab);
        if (key.leftArrow) {
          const newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          setActiveTab(tabs[newIndex]);
        } else if (key.rightArrow) {
          const newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          setActiveTab(tabs[newIndex]);
        }
      } else if (focus === 'serverList' && selectedServer) {
        // Accelerator keys for connect/disconnect
        const serverState = serverStates[selectedServer];
        if (input.toLowerCase() === 'c' && serverState?.status === 'disconnected') {
          handleConnect();
        } else if (input.toLowerCase() === 'd' && (serverState?.status === 'connected' || serverState?.status === 'connecting')) {
          handleDisconnect();
        }
      }
    }
  });

  const handleCommand = (cmd: string) => {
    const trimmedCmd = cmd.trim();
    
    if (trimmedCmd === '/exit' || trimmedCmd === '/quit') {
      process.exit(0);
    } else if (trimmedCmd.startsWith('/connect ')) {
      const serverName = trimmedCmd.slice(9).trim();
      if (serverNames.includes(serverName)) {
        setSelectedServer(serverName);
      }
    } else if (trimmedCmd === '/refresh') {
      // Refresh current tab - would trigger re-fetch
      // This is handled by the tab components themselves
    } else if (trimmedCmd === '/help') {
      // Show help - could implement a help overlay
    }
  };

  // Calculate layout dimensions
  const headerHeight = 1;
  const tabsHeight = 1;
  // Server details will be flexible - calculate remaining space for content
  const availableHeight = dimensions.height - headerHeight - tabsHeight;
  // Reserve space for server details (will grow as needed, but we'll use flexGrow)
  const serverDetailsMinHeight = 3;
  const contentHeight = availableHeight - serverDetailsMinHeight;
  const serverListWidth = Math.floor(dimensions.width * 0.3);
  const contentWidth = dimensions.width - serverListWidth;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'green';
      case 'connecting':
        return 'yellow';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusSymbol = (status: string) => {
    switch (status) {
      case 'connected':
        return '●';
      case 'connecting':
        return '◐';
      case 'error':
        return '✗';
      default:
        return '○';
    }
  };

  return (
    <Box flexDirection="column" width={dimensions.width} height={dimensions.height}>
      {/* Header row across the top */}
      <Box 
        width={dimensions.width} 
        height={headerHeight}
        borderStyle="single"
        borderTop={false}
        borderLeft={false}
        borderRight={false}
        paddingX={1}
        justifyContent="space-between"
        alignItems="center"
      >
        <Box>
          <Text bold color="cyan">
            {packageJson.name}
          </Text>
          <Text dimColor> - {packageJson.description}</Text>
        </Box>
        <Text dimColor>v{packageJson.version}</Text>
      </Box>

      {/* Main content area */}
      <Box flexDirection="row" height={availableHeight + tabsHeight} width={dimensions.width}>
        {/* Left column - Server list */}
        <Box 
          width={serverListWidth}
          height={availableHeight + tabsHeight}
          borderStyle="single"
          borderTop={false}
          borderBottom={false}
          borderLeft={false}
          borderRight={true}
          flexDirection="column"
          paddingX={1}
        >
          <Box 
            marginBottom={1} 
            paddingY={1}
          >
            <Text 
              bold
              backgroundColor={focus === 'serverList' ? 'yellow' : undefined}
            >
              MCP Servers
            </Text>
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            {serverNames.map((serverName) => {
              const isSelected = selectedServer === serverName;
              return (
                <Box key={serverName} paddingY={0}>
                  <Text>
                    {isSelected ? '▶ ' : '  '}
                    {serverName}
                  </Text>
                </Box>
              );
            })}
          </Box>
        </Box>

        {/* Right column - Server details, Tabs and content */}
        <Box 
          flexGrow={1}
          height={availableHeight + tabsHeight}
          flexDirection="column"
        >
          {/* Server Details - Flexible height */}
          <Box 
            width={contentWidth}
            borderStyle="single"
            borderTop={false}
            borderLeft={false}
            borderRight={false}
            borderBottom={true}
            paddingX={1}
            paddingY={1}
            flexDirection="column"
            flexShrink={0}
          >
            {selectedServer ? (
              <Box flexDirection="column">
                <Box flexDirection="row" justifyContent="space-between" alignItems="center" marginBottom={1}>
                  <Text bold color="cyan">{selectedServer}</Text>
                  <Box flexDirection="row" alignItems="center">
                    {currentServerState && (
                      <>
                        <Text color={getStatusColor(currentServerState.status)}>
                          {getStatusSymbol(currentServerState.status)} {currentServerState.status}
                        </Text>
                        <Text> </Text>
                        {currentServerState?.status === 'disconnected' && (
                          <Text color="cyan" bold>
                            [<Text underline>C</Text>onnect]
                          </Text>
                        )}
                        {(currentServerState?.status === 'connected' || currentServerState?.status === 'connecting') && (
                          <Text color="red" bold>
                            [<Text underline>D</Text>isconnect]
                          </Text>
                        )}
                      </>
                    )}
                  </Box>
                </Box>
                <Box flexDirection="column">
                  <Text dimColor>Command: {mcpConfig.mcpServers[selectedServer].command}</Text>
                  {mcpConfig.mcpServers[selectedServer].args && mcpConfig.mcpServers[selectedServer].args!.length > 0 && (
                    <Box marginTop={1}>
                      <Text dimColor>
                        Args: {mcpConfig.mcpServers[selectedServer].args?.join(' ')}
                      </Text>
                    </Box>
                  )}
                  {mcpConfig.mcpServers[selectedServer].env && Object.keys(mcpConfig.mcpServers[selectedServer].env || {}).length > 0 && (
                    <Box marginTop={1}>
                      <Text dimColor>
                        Env: {Object.entries(mcpConfig.mcpServers[selectedServer].env || {}).map(([k, v]) => `${k}=${v}`).join(', ')}
                      </Text>
                    </Box>
                  )}
                </Box>
              </Box>
            ) : (
              <Box justifyContent="center" alignItems="center">
                <Text dimColor>Select a server from the list to view details</Text>
              </Box>
            )}
          </Box>

          {/* Tabs */}
          <Tabs 
            activeTab={activeTab} 
            onTabChange={setActiveTab}
            width={contentWidth}
            counts={tabCounts}
            focused={focus === 'tabs'}
          />

          {/* Tab Content */}
          <Box 
            flexGrow={1} 
            width={contentWidth}
            borderTop={false}
            borderLeft={false}
            borderRight={false}
            borderBottom={false}
          >
            {currentServerState?.status === 'connected' && currentServerClient ? (
              <>
                {activeTab === 'resources' && (
                  <ResourcesTab 
                    key={`resources-${selectedServer}`}
                    resources={currentServerState.resources}
                    client={currentServerClient}
                    width={contentWidth} 
                    height={contentHeight}
                    onCountChange={(count) => setTabCounts(prev => ({ ...prev, resources: count }))}
                    focused={focus === 'tabContent'}
                  />
                )}
                {activeTab === 'prompts' && (
                  <PromptsTab 
                    key={`prompts-${selectedServer}`}
                    prompts={currentServerState.prompts}
                    client={currentServerClient}
                    width={contentWidth} 
                    height={contentHeight}
                    onCountChange={(count) => setTabCounts(prev => ({ ...prev, prompts: count }))}
                    focused={focus === 'tabContent'}
                  />
                )}
                {activeTab === 'tools' && (
                  <ToolsTab 
                    key={`tools-${selectedServer}`}
                    tools={currentServerState.tools}
                    client={currentServerClient}
                    width={contentWidth} 
                    height={contentHeight}
                    onCountChange={(count) => setTabCounts(prev => ({ ...prev, tools: count }))}
                    focused={focus === 'tabContent'}
                  />
                )}
                {activeTab === 'notifications' && (
                  <NotificationsTab 
                    client={currentServerClient} 
                    width={contentWidth} 
                    height={contentHeight}
                    onCountChange={(count) => setTabCounts(prev => ({ ...prev, notifications: count }))}
                    focused={focus === 'tabContent'}
                  />
                )}
                {activeTab === 'history' && (
                  <HistoryTab 
                    serverName={selectedServer}
                    messages={currentServerMessages}
                    width={contentWidth} 
                    height={contentHeight}
                    onCountChange={(count) => setTabCounts(prev => ({ ...prev, history: count }))}
                    focusedPane={focus === 'historyDetail' ? 'details' : focus === 'historyList' ? 'messages' : null}
                  />
                )}
              </>
            ) : currentServerState?.status === 'connecting' ? (
              <Box paddingX={1} paddingY={1}>
                <Text color="yellow">Connecting to {selectedServer}...</Text>
                <Box marginTop={1}>
                  <Text dimColor>Please wait while the connection is established.</Text>
                </Box>
              </Box>
            ) : currentServerState?.status === 'error' ? (
              <Box paddingX={1} paddingY={1}>
                <Text color="red">Error connecting to {selectedServer}:</Text>
                <Text color="red">{currentServerState.error}</Text>
                <Box marginTop={1}>
                  <Text dimColor>Check the server configuration and try again.</Text>
                </Box>
              </Box>
            ) : selectedServer ? (
              <>
                {activeTab !== 'history' && (
                  <Box paddingX={1} paddingY={1}>
                    <Text dimColor>Waiting for connection...</Text>
                    <Box marginTop={1} flexDirection="column">
                      <Text dimColor>Once connected, you can view resources, prompts, and tools.</Text>
                    </Box>
                  </Box>
                )}
              </>
            ) : (
              <Box paddingX={1} paddingY={1}>
                <Text dimColor>Select a server from the list to view details</Text>
                <Box marginTop={1} flexDirection="column">
                  <Text dimColor>Use Tab to cycle focus: Server List → Tabs → Content</Text>
                  <Text dimColor>Arrow keys work in focused area</Text>
                  <Text dimColor>Press '/' for commands</Text>
                  <Text dimColor>Press underlined letter to switch tabs (R/P/T/N/H)</Text>
                </Box>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Command input overlay */}
      {showCommand && (
        <Box width={dimensions.width} paddingX={1}>
          <Text>
            <Text color="yellow">{command}</Text>
            <Text color="gray">█</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default App;
