import React, { useState, useEffect, useRef } from 'react';
import { Box, Text } from 'ink';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';

interface Notification {
  timestamp: Date;
  type: 'log' | 'error' | 'warning' | 'info';
  message: string;
}

interface NotificationsTabProps {
  client: Client | null;
  width: number;
  height: number;
  onCountChange?: (count: number) => void;
  focused?: boolean;
}

export function NotificationsTab({ client, width, height, onCountChange, focused = false }: NotificationsTabProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationsRef = useRef<Notification[]>([]);

  useEffect(() => {
    if (!client) {
      setNotifications([]);
      notificationsRef.current = [];
      onCountChange?.(0);
      return;
    }

    // Set up notification handlers
    const addNotification = (type: Notification['type'], message: string) => {
      const notification: Notification = {
        timestamp: new Date(),
        type,
        message,
      };
      notificationsRef.current = [...notificationsRef.current, notification].slice(-100); // Keep last 100
      setNotifications([...notificationsRef.current]);
      onCountChange?.(notificationsRef.current.length);
    };

    // Listen for server messages/notifications
    // Note: MCP SDK notification handling would go here
    // For now, we'll show connection status
    addNotification('info', 'Connected to server');

    return () => {
      // Cleanup
    };
  }, [client]);

  return (
    <Box width={width} height={height} flexDirection="column" paddingX={1}>
      <Box paddingY={1}>
        <Text bold backgroundColor={focused ? 'yellow' : undefined}>Notifications ({notifications.length})</Text>
      </Box>
      {notifications.length === 0 ? (
        <Box paddingY={1}>
          <Text dimColor>No notifications yet</Text>
        </Box>
      ) : (
        <Box flexDirection="column" flexGrow={1}>
          {notifications.map((notification, index) => {
            const colorMap = {
              log: 'gray',
              error: 'red',
              warning: 'yellow',
              info: 'cyan',
            };
            return (
              <Box key={index} paddingY={0} flexDirection="row">
                <Text dimColor>
                  [{notification.timestamp.toLocaleTimeString()}]{' '}
                </Text>
                <Text color={colorMap[notification.type]}>
                  {notification.type.toUpperCase()}:{' '}
                </Text>
                <Text>{notification.message}</Text>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}
