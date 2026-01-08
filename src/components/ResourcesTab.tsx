import React, { useState, useEffect } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

interface ResourcesTabProps {
  resources: any[];
  client: Client | null;
  width: number;
  height: number;
  onCountChange?: (count: number) => void;
  focused?: boolean;
}

export function ResourcesTab({ resources, client, width, height, onCountChange, focused = false }: ResourcesTabProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Handle arrow key navigation when focused
  useInput((input: string, key: Key) => {
    if (!focused) return;

    if (key.upArrow && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1);
    } else if (key.downArrow && selectedIndex < resources.length - 1) {
      setSelectedIndex(selectedIndex + 1);
    }
  }, { isActive: focused });

  // Reset selected index when resources array changes (different server)
  useEffect(() => {
    setSelectedIndex(0);
  }, [resources]);

  const selectedResource = resources[selectedIndex] || null;

  const listWidth = Math.floor(width * 0.4);
  const detailWidth = width - listWidth;

  return (
    <Box flexDirection="row" width={width} height={height}>
      {/* Resources List */}
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
          <Text bold backgroundColor={focused ? 'yellow' : undefined}>Resources ({resources.length})</Text>
        </Box>
        {error ? (
          <Box paddingY={1}>
            <Text color="red">{error}</Text>
          </Box>
        ) : resources.length === 0 ? (
          <Box paddingY={1}>
            <Text dimColor>No resources available</Text>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1}>
            {resources.map((resource, index) => {
              const isSelected = index === selectedIndex;
              return (
                <Box key={resource.uri || index} paddingY={0}>
                  <Text>
                    {isSelected ? '▶ ' : '  '}
                    {resource.name || resource.uri || `Resource ${index + 1}`}
                  </Text>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Resource Details */}
      <Box width={detailWidth} height={height} paddingX={1} flexDirection="column">
        {selectedResource ? (
          <Box flexDirection="column" paddingY={1}>
            <Text bold color="cyan">
              {selectedResource.name || selectedResource.uri}
            </Text>
            {selectedResource.description && (
              <Box marginTop={1}>
                <Text dimColor>{selectedResource.description}</Text>
              </Box>
            )}
            {selectedResource.uri && (
              <Box marginTop={1}>
                <Text dimColor>URI: {selectedResource.uri}</Text>
              </Box>
            )}
            {selectedResource.mimeType && (
              <Box marginTop={1}>
                <Text dimColor>MIME Type: {selectedResource.mimeType}</Text>
              </Box>
            )}
          </Box>
        ) : (
          <Box paddingY={1}>
            <Text dimColor>Select a resource to view details</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
