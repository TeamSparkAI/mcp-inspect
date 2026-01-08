import React, { useState, useEffect, useRef } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import { ScrollView, type ScrollViewRef } from 'ink-scroll-view';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

interface ResourcesTabProps {
  resources: any[];
  client: Client | null;
  width: number;
  height: number;
  onCountChange?: (count: number) => void;
  focusedPane?: 'list' | 'details' | null;
  onViewDetails?: (resource: any) => void;
}

export function ResourcesTab({ resources, client, width, height, onCountChange, focusedPane = null, onViewDetails }: ResourcesTabProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollViewRef>(null);

  // Handle arrow key navigation when focused
  useInput((input: string, key: Key) => {
    if (focusedPane === 'list') {
      // Navigate the list
      if (key.upArrow && selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      } else if (key.downArrow && selectedIndex < resources.length - 1) {
        setSelectedIndex(selectedIndex + 1);
      }
      return;
    }
    
    if (focusedPane === 'details') {
      // Handle '+' key to view in full screen modal
      if (input === '+' && selectedResource && onViewDetails) {
        onViewDetails(selectedResource);
        return;
      }
      
      // Scroll the details pane using ink-scroll-view
      if (key.upArrow) {
        scrollViewRef.current?.scrollBy(-1);
      } else if (key.downArrow) {
        scrollViewRef.current?.scrollBy(1);
      } else if (key.pageUp) {
        const viewportHeight = scrollViewRef.current?.getViewportHeight() || 1;
        scrollViewRef.current?.scrollBy(-viewportHeight);
      } else if (key.pageDown) {
        const viewportHeight = scrollViewRef.current?.getViewportHeight() || 1;
        scrollViewRef.current?.scrollBy(viewportHeight);
      }
    }
  }, { isActive: focusedPane === 'list' || focusedPane === 'details' });

  // Reset scroll when selection changes
  useEffect(() => {
    scrollViewRef.current?.scrollTo(0);
  }, [selectedIndex]);

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
          <Text bold backgroundColor={focusedPane === 'list' ? 'yellow' : undefined}>Resources ({resources.length})</Text>
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
      <Box width={detailWidth} height={height} paddingX={1} flexDirection="column" overflow="hidden">
        {selectedResource ? (
          <Box flexDirection="column" paddingY={1} height={height - 2}>
            {/* Fixed name line */}
            <Box flexShrink={0}>
              <Text bold backgroundColor={focusedPane === 'details' ? 'yellow' : undefined} color="cyan">
                {selectedResource.name || selectedResource.uri}
              </Text>
            </Box>
            
            {/* Scrollable content area */}
            <Box flexDirection="column" height={height - 3} overflow="hidden">
              <ScrollView ref={scrollViewRef}>
                {/* Description */}
                {selectedResource.description && (
                  <>
                    {selectedResource.description.split('\n').map((line: string, idx: number) => (
                      <Box key={`desc-${idx}`} marginTop={idx === 0 ? 1 : 0} flexShrink={0}>
                        <Text dimColor>{line}</Text>
                      </Box>
                    ))}
                  </>
                )}
                
                {/* URI */}
                {selectedResource.uri && (
                  <Box marginTop={1} flexShrink={0}>
                    <Text dimColor>URI: {selectedResource.uri}</Text>
                  </Box>
                )}
                
                {/* MIME Type */}
                {selectedResource.mimeType && (
                  <Box marginTop={1} flexShrink={0}>
                    <Text dimColor>MIME Type: {selectedResource.mimeType}</Text>
                  </Box>
                )}
              </ScrollView>
            </Box>
          </Box>
        ) : (
          <Box paddingY={1} flexShrink={0}>
            <Text dimColor>Select a resource to view details</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
