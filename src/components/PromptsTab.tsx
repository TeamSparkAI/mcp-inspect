import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

interface PromptsTabProps {
  prompts: any[];
  client: Client | null;
  width: number;
  height: number;
  onCountChange?: (count: number) => void;
  focused?: boolean;
}

export function PromptsTab({ prompts, client, width, height, onCountChange, focused = false }: PromptsTabProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Handle arrow key navigation when focused
  useInput((input: string, key: Key) => {
    if (!focused) return;

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < prompts.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, { isActive: focused });

  // Reset selected index when prompts array changes (different server)
  useEffect(() => {
    setSelectedIndex(0);
  }, [prompts]);

  const selectedPrompt = prompts[selectedIndex] || null;

  const listWidth = Math.floor(width * 0.4);
  const detailWidth = width - listWidth;

  return (
    <Box flexDirection="row" width={width} height={height}>
      {/* Prompts List */}
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
          <Text bold backgroundColor={focused ? 'yellow' : undefined}>Prompts ({prompts.length})</Text>
        </Box>
        {error ? (
          <Box paddingY={1}>
            <Text color="red">{error}</Text>
          </Box>
        ) : prompts.length === 0 ? (
          <Box paddingY={1}>
            <Text dimColor>No prompts available</Text>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1}>
            {prompts.map((prompt, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box key={prompt.name || index} paddingY={0}>
                  <Text>
                    {isSelected ? '▶ ' : '  '}
                    {prompt.name || `Prompt ${index + 1}`}
                  </Text>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Prompt Details */}
      <Box width={detailWidth} height={height} paddingX={1} flexDirection="column">
        {selectedPrompt ? (
          <Box flexDirection="column" paddingY={1}>
            <Text bold color="cyan">
              {selectedPrompt.name}
            </Text>
            {selectedPrompt.description && (
              <Box marginTop={1}>
                <Text dimColor>{selectedPrompt.description}</Text>
              </Box>
            )}
            {selectedPrompt.arguments && selectedPrompt.arguments.length > 0 && (
              <Box marginTop={1} flexDirection="column">
                <Text bold>Arguments:</Text>
                {selectedPrompt.arguments.map((arg: any, idx: number) => (
                  <Box key={idx} marginTop={1} paddingLeft={2}>
                    <Text dimColor>
                      - {arg.name}: {arg.description || arg.type || 'string'}
                    </Text>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        ) : (
          <Box paddingY={1}>
            <Text dimColor>Select a prompt to view details</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
