import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const CREDS_DIR = join(homedir(), '.insighta');
const CREDS_FILE = join(CREDS_DIR, 'credentials.json');

export function saveCredentials(data) {
  if (!existsSync(CREDS_DIR)) mkdirSync(CREDS_DIR, { recursive: true });
  writeFileSync(CREDS_FILE, JSON.stringify(data, null, 2));
}

export function loadCredentials() {
  if (!existsSync(CREDS_FILE)) return null;
  try {
    return JSON.parse(readFileSync(CREDS_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function clearCredentials() {
  if (existsSync(CREDS_FILE)) rmSync(CREDS_FILE);
}
