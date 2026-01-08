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

render(<App configFile={configFile} />);
