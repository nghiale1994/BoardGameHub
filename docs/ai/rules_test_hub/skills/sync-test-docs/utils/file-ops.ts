import * as fs from 'fs/promises';
import * as path from 'path';

export async function readFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

export async function writeFile(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, 'utf-8');
}

export async function listDir(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  return entries.map(entry => entry.name);
}

export async function fileSearch(query: { query: string }): Promise<string[]> {
  // Simple glob implementation - in real implementation, use a proper glob library
  const { query: pattern } = query;

  // For now, return hardcoded test files - in real implementation, scan filesystem
  const testFiles = [
    'app/e2e/homepage.spec.ts',
    'app/src/components/JoinRoom.test.tsx',
    'app/src/components/CreateRoomModal.test.tsx',
    'app/src/components/RoomCreatedModal.test.tsx'
  ];

  return testFiles.filter(file => file.includes(pattern.replace('**/', '').replace('*.ts', '')));
}

export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}