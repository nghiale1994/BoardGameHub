import { readFileSync } from 'fs';

export function validateTypes(filePath: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Check for explicit types on exports
    const exportLines = content.split('\n').filter(line => line.includes('export'));
    for (const line of exportLines) {
      if (line.includes('export') && !line.includes(':') && !line.includes('type ') && !line.includes('interface ')) {
        issues.push(`Exported item without explicit type: ${line.trim()}`);
      }
    }

  } catch (error) {
    issues.push(`Error reading file: ${error.message}`);
  }

  return { valid: issues.length === 0, issues };
}