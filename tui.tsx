#!/usr/bin/env node

import React from 'react';
import { withFullScreen } from 'fullscreen-ink';
import App from './src/App.js';

const args = process.argv.slice(2);
const configFile = args[0];

if (!configFile) {
  console.error('Usage: mcp-inspect <config-file.json>');
  process.exit(1);
}

// Use fullscreen-ink to handle alternate screen buffer automatically
const ink = withFullScreen(<App configFile={configFile} />);
await ink.start();
await ink.waitUntilExit();
