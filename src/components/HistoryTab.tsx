import React, { useState, useMemo, useEffect } from 'react';
import { Box, Text, useInput, type Key } from 'ink';
import type { MessageEntry } from '../types/messages.js';

interface HistoryTabProps {
  serverName: string | null;
  messages: MessageEntry[];
  width: number;
  height: number;
  onCountChange?: (count: number) => void;
  focusedPane?: 'messages' | 'details' | null;
}

export function HistoryTab({ serverName, messages, width, height, onCountChange, focusedPane = null }: HistoryTabProps) {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [leftScrollOffset, setLeftScrollOffset] = useState<number>(0);
  const [rightScrollOffset, setRightScrollOffset] = useState<number>(0);
  
  // Calculate visible area for left pane (accounting for header)
  const leftPaneHeight = height - 2; // Subtract header space
  const visibleMessages = messages.slice(leftScrollOffset, leftScrollOffset + leftPaneHeight);

  const selectedMessage = messages[selectedIndex] || null;

  // Format JSON helper
  const formatJSON = (obj: any): string[] => {
    return JSON.stringify(obj, null, 2).split('\n');
  };

  // Calculate line counts for scrolling
  const requestLines = selectedMessage && selectedMessage.direction === 'request' 
    ? formatJSON(selectedMessage.message) 
    : [];
  const responseLines = selectedMessage?.response 
    ? formatJSON(selectedMessage.response) 
    : [];
  const messageLines = selectedMessage && selectedMessage.direction !== 'request'
    ? formatJSON(selectedMessage.message)
    : [];

  // Handle arrow key navigation and scrolling when focused
  useInput((input: string, key: Key) => {
    if (focusedPane === 'messages') {
      if (key.upArrow) {
        if (selectedIndex > 0) {
          const newIndex = selectedIndex - 1;
          setSelectedIndex(newIndex);
          // Auto-scroll if selection goes above visible area
          if (newIndex < leftScrollOffset) {
            setLeftScrollOffset(newIndex);
          }
        }
      } else if (key.downArrow) {
        if (selectedIndex < messages.length - 1) {
          const newIndex = selectedIndex + 1;
          setSelectedIndex(newIndex);
          // Auto-scroll if selection goes below visible area
          if (newIndex >= leftScrollOffset + leftPaneHeight) {
            setLeftScrollOffset(Math.max(0, newIndex - leftPaneHeight + 1));
          }
        }
      } else if (key.pageUp) {
        setLeftScrollOffset(Math.max(0, leftScrollOffset - leftPaneHeight));
        setSelectedIndex(Math.max(0, selectedIndex - leftPaneHeight));
      } else if (key.pageDown) {
        const maxScroll = Math.max(0, messages.length - leftPaneHeight);
        setLeftScrollOffset(Math.min(maxScroll, leftScrollOffset + leftPaneHeight));
        setSelectedIndex(Math.min(messages.length - 1, selectedIndex + leftPaneHeight));
      }
      return;
    }

    // details scrolling (only when details pane is focused)
    if (focusedPane === 'details') {
      const maxScroll = selectedMessage?.direction === 'request'
        ? requestLines.length + (selectedMessage.response ? responseLines.length + 3 : 0)
        : messageLines.length;

      if (key.pageUp) {
        setRightScrollOffset(Math.max(0, rightScrollOffset - 10));
      } else if (key.pageDown) {
        setRightScrollOffset(Math.min(maxScroll, rightScrollOffset + 10));
      } else if (key.upArrow) {
        setRightScrollOffset(Math.max(0, rightScrollOffset - 1));
      } else if (key.downArrow) {
        setRightScrollOffset(Math.min(maxScroll, rightScrollOffset + 1));
      }
    }
  }, { isActive: focusedPane !== undefined });

  // Update count when messages change
  React.useEffect(() => {
    onCountChange?.(messages.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  // Reset selection when messages change
  useEffect(() => {
    if (selectedIndex >= messages.length) {
      setSelectedIndex(Math.max(0, messages.length - 1));
    }
  }, [messages.length, selectedIndex]);

  // Reset scroll when message selection changes
  useEffect(() => {
    setRightScrollOffset(0);
  }, [selectedIndex]);

  const listWidth = Math.floor(width * 0.4);
  const detailWidth = width - listWidth;

  return (
    <Box flexDirection="row" width={width} height={height}>
      {/* Left column - Messages list */}
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
        <Box paddingY={1} flexShrink={0}>
          <Text 
            bold
            backgroundColor={focusedPane === 'messages' ? 'yellow' : undefined}
          >
            History ({messages.length})
          </Text>
        </Box>
        
        {/* Messages list */}
        {messages.length === 0 ? (
          <Box paddingY={1}>
            <Text dimColor>No messages</Text>
          </Box>
        ) : (
          <Box flexDirection="column" flexGrow={1} minHeight={0}>
            {visibleMessages.map((msg, visibleIndex) => {
              const actualIndex = leftScrollOffset + visibleIndex;
              const isSelected = actualIndex === selectedIndex;
              let label: string;
              if (msg.direction === 'request' && 'method' in msg.message) {
                label = msg.message.method;
              } else if (msg.direction === 'response') {
                if ('result' in msg.message) {
                  label = 'Response (result)';
                } else if ('error' in msg.message) {
                  label = `Response (error: ${msg.message.error.code})`;
                } else {
                  label = 'Response';
                }
              } else if (msg.direction === 'notification' && 'method' in msg.message) {
                label = msg.message.method;
              } else {
                label = 'Unknown';
              }
              const direction = msg.direction === 'request' ? '→' : msg.direction === 'response' ? '←' : '•';
              const hasResponse = msg.response !== undefined;
              
              return (
                <Box key={msg.id} paddingY={0}>
                  <Text 
                    color={isSelected ? 'white' : 'white'}
                  >
                    {isSelected ? '▶ ' : '  '}
                    {direction} {label}
                    {hasResponse ? ' ✓' : msg.direction === 'request' ? ' ...' : ''}
                  </Text>
                </Box>
              );
            })}
          </Box>
        )}
      </Box>

      {/* Right column - Message details */}
      <Box 
        width={detailWidth} 
        height={height} 
        paddingX={1} 
        flexDirection="column" 
        flexShrink={0}
        borderStyle="single"
        borderTop={false}
        borderBottom={false}
        borderLeft={false}
        borderRight={false}
      >
        {selectedMessage ? (
          <Box flexDirection="column" paddingY={1} height={height - 2}>
            <Box flexDirection="row" justifyContent="space-between" marginBottom={1} flexShrink={0}>
              <Text 
                bold 
                color="cyan"
                backgroundColor={focusedPane === 'details' ? 'yellow' : undefined}
              >
                {selectedMessage.direction === 'request' && 'method' in selectedMessage.message 
                  ? selectedMessage.message.method
                  : selectedMessage.direction === 'response'
                  ? 'Response'
                  : selectedMessage.direction === 'notification' && 'method' in selectedMessage.message
                  ? selectedMessage.message.method
                  : 'Message'}
              </Text>
              <Text dimColor>
                {selectedMessage.timestamp.toLocaleTimeString()}
              </Text>
            </Box>

            <Box marginTop={1} flexDirection="column" flexShrink={0}>
              <Text bold>Direction: {selectedMessage.direction}</Text>
              {selectedMessage.duration !== undefined && (
              <Box marginTop={1}>
                <Text dimColor>
                  Duration: {selectedMessage.duration}ms
                </Text>
              </Box>
              )}
            </Box>

            {/* Content area - show complete request and response */}
            <Box flexDirection="column" marginTop={1}>
              {selectedMessage.direction === 'request' ? (
                <>
                  {/* Request - show COMPLETE */}
                  <Box flexDirection="column">
                    <Text bold>Request:</Text>
                    <Box marginTop={1} paddingLeft={2}>
                      <Text dimColor>
                        {JSON.stringify(selectedMessage.message, null, 2)}
                      </Text>
                    </Box>
                  </Box>

                  {/* Response - show COMPLETE if exists */}
                  {selectedMessage.response ? (
                    <Box marginTop={1} flexDirection="column">
                      <Text bold>Response:</Text>
                      <Box marginTop={1} paddingLeft={2}>
                        <Text dimColor>
                          {JSON.stringify(selectedMessage.response, null, 2)}
                        </Text>
                      </Box>
                    </Box>
                  ) : (
                    <Box marginTop={1}>
                      <Text dimColor italic>Waiting for response...</Text>
                    </Box>
                  )}
                </>
              ) : (
                <Box flexDirection="column">
                  <Text bold>
                    {selectedMessage.direction === 'response' ? 'Response:' : 'Notification:'}
                  </Text>
                  <Box marginTop={1} paddingLeft={2}>
                    <Text dimColor>
                      {JSON.stringify(selectedMessage.message, null, 2)}
                    </Text>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        ) : (
          <Box paddingY={1} flexShrink={0}>
            <Text dimColor>Select a message to view details</Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
