import React from 'react';
import { Box, Text } from 'ink';

export type TabType = 'resources' | 'prompts' | 'tools' | 'notifications' | 'history';

interface TabsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  width: number;
  counts?: {
    resources?: number;
    prompts?: number;
    tools?: number;
    notifications?: number;
    history?: number;
  };
  focused?: boolean;
}

export const tabs: { id: TabType; label: string; accelerator: string }[] = [
  { id: 'resources', label: 'Resources', accelerator: 'r' },
  { id: 'prompts', label: 'Prompts', accelerator: 'p' },
  { id: 'tools', label: 'Tools', accelerator: 't' },
  { id: 'notifications', label: 'Notifications', accelerator: 'n' },
  { id: 'history', label: 'History', accelerator: 'h' },
];

export function Tabs({ activeTab, onTabChange, width, counts = {}, focused = false }: TabsProps) {
  return (
    <Box 
      width={width} 
      borderStyle="single"
      borderTop={false} 
      borderLeft={false} 
      borderRight={false} 
      borderBottom={true}
      flexDirection="row"
      paddingBottom={1}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const count = counts[tab.id];
        const countText = count !== undefined ? ` (${count})` : '';
        const firstChar = tab.label[0];
        const restOfLabel = tab.label.slice(1);
        
        return (
          <Box
            key={tab.id}
            paddingX={2}
          >
            <Text
              bold={isActive}
              color={isActive ? 'cyan' : 'gray'}
              backgroundColor={isActive && focused ? 'yellow' : undefined}
            >
              {isActive ? '▶ ' : '  '}
              <Text underline>{firstChar}</Text>
              {restOfLabel}{countText}
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}
