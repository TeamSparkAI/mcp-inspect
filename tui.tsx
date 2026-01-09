#!/usr/bin/env node

import React from 'react';
import { render } from 'ink';
import App from './src/App.js';

const args = process.argv.slice(2);
const configFile = args[0];

if (!configFile) {
  console.error('Usage: mcp-inspect <config-file.json>');
  process.exit(1);
}

// Switch to alternate screen (like vim, top, etc.)
// This preserves the terminal history and switches back automatically on exit
process.stdout.write('\x1b[?1049h'); // Switch to alternate screen

const instance = render(<App configFile={configFile} />);

// Set up cleanup on exit function
const exitWithCleanup = (code: number = 0) => {
  try {
    instance.unmount();
  } catch (error) {
    // Ignore errors on unmount
  }
  try {
    instance.cleanup();
  } catch (error) {
    // Ignore errors on cleanup
  }
  
  // Switch back from alternate screen
  process.stdout.write('\x1b[?1049l'); // Switch back from alternate screen
  process.stdout.write('', () => {}); // Force flush
  
  process.exit(code);
};

// Update App with exit callback
instance.rerender(<App configFile={configFile} onExit={exitWithCleanup} />);

// Handle various exit signals (for Ctrl+C, etc.)
process.on('SIGINT', () => {
  exitWithCleanup(0);
});

process.on('SIGTERM', () => {
  exitWithCleanup(0);
});
