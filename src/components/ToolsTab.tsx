import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

interface ToolsTabProps {
  tools: any[];
  client: Client | null;
  width: number;
  height: number;
  onCountChange?: (count: number) => void;
  focused?: boolean;
}

export function ToolsTab({ tools, client, width, height, onCountChange, focused = false }: ToolsTabProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Handle arrow key navigation when focused
  useInput((input: string, key: Key) => {
    if (!focused) return;

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < tools.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, { isActive: focused });

  // Reset selected index when tools array changes (different server)
  useEffect(() => {
    setSelectedIndex(0);
  }, [tools]);

  const selectedTool = tools[selectedIndex] || null;

  const listWidth = Math.floor(width * 0.4);
  const detailWidth = width - listWidth;

  return (
    <Box flexDirection="row" width={width} height={height}>
      {/* Tools List */}
      <Box
        width={listWidth}
        height={height}
        borderStyle="single"
        borderTop={false}
        borderBottom={false}
        borderLeft={false}
        borderRight={true}
        flexDirection="column"
        paddingX={1}
      >
        <Box paddingY={1}>
          <Text bold backgroundColor={focused ? 'yellow' : undefined}>Tools ({tools.length})</Text>
        </Box>
        {error ? (
          <Box paddingY={1}>
            <Text color="red">{error}</Text>
          </Box>
        ) : tools.length === 0 ? (
          <Box paddingY={1}>
            <Text dimColor>No tools available</Text>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1}>
            {tools.map((tool, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box key={tool.name || index} paddingY={0}>
                  <Text>
                    {isSelected ? '▶ ' : '  '}
                    {tool.name || `Tool ${index + 1}`}
                  </Text>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Tool Details */}
      <Box width={detailWidth} height={height} paddingX={1} flexDirection="column">
        {selectedTool ? (
          <Box flexDirection="column" paddingY={1}>
            <Text bold color="cyan">
              {selectedTool.name}
            </Text>
            {selectedTool.description && (
              <Box marginTop={1}>
                <Text dimColor>{selectedTool.description}</Text>
              </Box>
            )}
            {selectedTool.inputSchema && (
              <Box marginTop={1} flexDirection="column">
                <Text bold>Input Schema:</Text>
                <Box marginTop={1} paddingLeft={2}>
                  <Text dimColor>
                    {JSON.stringify(selectedTool.inputSchema, null, 2)}
                  </Text>
                </Box>
              </Box>
            )}
          </Box>
        ) : (
          <Box paddingY={1}>
            <Text dimColor>Select a tool to view details</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
