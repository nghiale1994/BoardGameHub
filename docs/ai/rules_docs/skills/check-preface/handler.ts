import { readFileSync } from 'fs';
import { join } from 'path';

export function checkPreface(filePaths: string[]): { missing: string[] } {
  const missing: string[] = [];
  const requiredPreface = 'NOTE: AI must read docs/ai/README.md before modifying this file.';

  for (const filePath of filePaths) {
    try {
      const content = readFileSync(filePath, 'utf-8');
      if (!content.startsWith(requiredPreface)) {
        missing.push(filePath);
      }
    } catch (error) {
      missing.push(`${filePath} (error: ${error.message})`);
    }
  }

  return { missing };
}