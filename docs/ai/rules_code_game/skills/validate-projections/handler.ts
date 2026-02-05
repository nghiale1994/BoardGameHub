import { readFileSync } from 'fs';

const allowedProjections = [
  'RoomChatAppend',
  'RoomTurnHighlight',
  'RoomGameStatus',
  'RoomToast',
  'RoomPhaseBadge'
];

export function validateProjections(filePath: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  try {
    const content = readFileSync(filePath, 'utf-8');

    // Find projection emissions
    const projectionMatches = content.match(/emit\(['"]([^'"]+)['"]/g) || [];

    for (const match of projectionMatches) {
      const projection = match.match(/emit\(['"]([^'"]+)['"]/)[1];
      if (!allowedProjections.includes(projection)) {
        issues.push(`Disallowed projection: ${projection}`);
      }
    }

  } catch (error) {
    issues.push(`Error reading file: ${error.message}`);
  }

  return { valid: issues.length === 0, issues };
}