import { readFileSync } from 'fs';

export function checkSchema(filePath: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Check for schemaVersion
    if (!content.includes('schemaVersion')) {
      issues.push('Missing schemaVersion in domain events');
    }

    // Check for namespacing (e.g., gameId.eventName)
    const eventMatches = content.match(/['"]([^'"]*\.[^'"]*)['"]/g) || [];
    for (const match of eventMatches) {
      const eventName = match.slice(1, -1);
      if (!eventName.includes('.')) {
        issues.push(`Event name not namespaced: ${eventName}`);
      }
    }

  } catch (error) {
    issues.push(`Error reading file: ${error.message}`);
  }

  return { valid: issues.length === 0, issues };
}