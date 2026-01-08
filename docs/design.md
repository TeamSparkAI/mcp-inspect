# MCP Inspector TUI - Design Document

## Overview

`mcp-inspect` is a terminal-based user interface (TUI) for testing and debugging Model Context Protocol (MCP) servers. It provides functionality similar to the web-based MCP Inspector, but optimized for terminal environments.

## Core Functionality

### 1. Configuration

- **Command-line argument**: Accepts a JSON configuration file containing an `mcpServers` element
- **Configuration format**: Standard MCP server configuration format
  ```json
  {
    "mcpServers": {
      "serverName": {
        "command": "command_to_run",
        "args": ["arg1", "arg2"],
        "env": {
          "ENV_VAR": "value"
        }
      }
    }
  }
  ```

### 2. User Interface Layout

#### Full-Screen TUI Structure

```
┌─────────────────────────────────────────────────────────────┐
│ mcp-inspect - MCP Inspector (TUI)              v1.0.0      │ Header Row
├──────────────┬──────────────────────────────────────────────┤
│ MCP Servers  │                                              │
│              │                                              │
│ ▶ fetch      │  Main Content Area                           │
│   filesystem │  (Tabs: Resources, Prompts, Tools,           │
│              │   Notifications)                             │
│              │                                              │
│              │                                              │
│              │                                              │
│              │                                              │
│              │                                              │
└──────────────┴──────────────────────────────────────────────┘
```

- **Header Row** (top): Displays project name, description, and version
- **Left Column** (30% width): Server list with navigation
- **Right Column** (70% width): Main content area with tabs

### 3. Server Connection Pane

- **Server List** (Left Column):
  - Displays all servers from the configuration file
  - Arrow key navigation (↑/↓) to select servers
  - Visual indicator (▶) for selected server
  - Shows connection status (connected/disconnected/error)

- **Server Details** (Right Column - when server selected):
  - Server name
  - Command and arguments
  - Environment variables
  - Connection status
  - Transport method (stdio/SSE/HTTP)

### 4. Tabs Interface

The main content area supports multiple tabs, accessible via keyboard shortcuts:

#### Resources Tab
- **Purpose**: List and inspect available resources from the MCP server
- **Features**:
  - Display list of all available resources
  - Show resource metadata (MIME types, descriptions, URIs)
  - Inspect resource content
  - Test resource subscriptions
  - Navigate resources with arrow keys
  - View resource details in a detail pane

#### Prompts Tab
- **Purpose**: Display and test prompt templates
- **Features**:
  - List all available prompt templates
  - Show prompt arguments and descriptions
  - Test prompts with custom arguments
  - Preview generated messages
  - Execute prompts and view results

#### Tools Tab
- **Purpose**: List and test available tools
- **Features**:
  - Display all available tools with schemas
  - Show tool descriptions and parameters
  - Test tools with custom inputs
  - Execute tools and view results
  - Display tool execution history

#### Notifications Tab
- **Purpose**: Monitor server logs and notifications
- **Features**:
  - Real-time log display
  - Server notifications
  - Error messages and warnings
  - Scrollable log view
  - Filter/search capabilities

### 5. Keyboard Navigation

#### Global Commands
- `Ctrl+C`: Exit application
- `/`: Enter command mode
- `Tab`: Switch between tabs (Resources, Prompts, Tools, Notifications)
- `Esc`: Cancel current action / exit command mode

#### Command Mode (Slash Commands)
- `/exit` or `/quit`: Exit the application
- `/connect <server>`: Connect to a specific server
- `/disconnect <server>`: Disconnect from a server
- `/refresh`: Refresh current tab data
- `/help`: Show help information

#### Server List Navigation
- `↑` / `↓`: Navigate server list
- `Enter`: Select server / Connect to server

#### Tab Navigation
- `Tab` / `Shift+Tab`: Switch between tabs
- `1-4`: Quick switch to specific tab (1=Resources, 2=Prompts, 3=Tools, 4=Notifications)

### 6. Server Connection Management

- **Connection States**:
  - Disconnected (default)
  - Connecting
  - Connected
  - Error

- **Connection Features**:
  - Connect to selected server
  - Disconnect from server
  - Auto-reconnect on failure
  - Connection status indicators
  - Error message display

### 7. Data Display

#### List Views
- Scrollable lists with arrow key navigation
- Visual selection indicators
- Pagination for large datasets
- Search/filter capabilities (future enhancement)

#### Detail Views
- Expandable detail panes
- Formatted JSON display
- Syntax highlighting for code/content
- Copy to clipboard functionality (future enhancement)

### 8. Error Handling

- Clear error messages
- Connection failure handling
- Invalid configuration file handling
- Server communication errors
- Graceful degradation

## Technical Requirements

### Dependencies
- **Ink**: React-based TUI framework
- **React**: UI component library
- **TypeScript**: Type safety
- **MCP SDK**: For MCP protocol communication (to be added)

### Architecture

```
tui.tsx (Entry Point)
  └── App.tsx (Main Component)
      ├── Header Component
      ├── ServerList Component (Left Column)
      └── ContentArea Component (Right Column)
          ├── ResourcesTab
          ├── PromptsTab
          ├── ToolsTab
          └── NotificationsTab
```

### State Management

- Server list and selection state
- Active tab state
- Connection states per server
- Resource/prompt/tool data per server
- Notification/log history

### MCP Protocol Integration

- Initialize MCP client connections
- Handle stdio transport
- Support SSE transport (future)
- Support HTTP transport (future)
- Protocol message handling
- Error handling and retry logic

## Future Enhancements

1. **Search/Filter**: Add search functionality to filter resources, prompts, and tools
2. **Multiple Server Connections**: Connect to multiple servers simultaneously
3. **Transport Selection**: Support SSE and HTTP transports in addition to stdio
4. **Configuration Editor**: Built-in editor for modifying server configurations
5. **Export/Import**: Export test results and configurations
6. **Themes**: Customizable color schemes
7. **Keyboard Shortcuts Help**: Built-in help overlay
8. **Copy to Clipboard**: Copy resource content, tool results, etc.

## User Experience Goals

1. **Intuitive Navigation**: Easy keyboard-based navigation
2. **Clear Visual Feedback**: Status indicators and visual cues
3. **Responsive**: Handle terminal resizing gracefully
4. **Fast**: Quick connection and data loading
5. **Informative**: Clear error messages and helpful information
6. **Consistent**: Consistent UI patterns throughout

## Testing Considerations

- Test with various MCP server configurations
- Test connection failures and error scenarios
- Test with different terminal sizes
- Test keyboard navigation thoroughly
- Test with large datasets (many resources/tools)
- Test performance with multiple connections
