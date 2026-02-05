import { readFileSync } from 'fs';

export function checkConventions(filePaths: string[]): { violations: string[] } {
  const violations: string[] = [];

  for (const filePath of filePaths) {
    try {
      const content = readFileSync(filePath, 'utf-8');

      // Check for any TypeScript conventions, e.g., prefer explicit types
      if (content.includes('any') && !content.includes('// @ts-ignore')) {
        violations.push(`${filePath}: Uses 'any' type`);
      }

      if (content.includes('console.log') && !content.includes('// DEBUG')) {
        violations.push(`${filePath}: Contains console.log`);
      }

    } catch (error) {
      violations.push(`${filePath}: Error - ${error.message}`);
    }
  }

  return { violations };
}