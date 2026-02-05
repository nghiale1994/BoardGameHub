import { readFileSync } from 'fs';

export function validateCoverage(filePath: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];
  try {
    const content = readFileSync(filePath, 'utf-8');

    if (!content.includes('Coverage Checklist')) {
      issues.push('Missing Coverage Checklist section');
    }

    if (!content.includes('❌') && !content.includes('✅')) {
      issues.push('No checklist items found (missing ❌ or ✅)');
    }

    // Check for ❌ items
    if (content.includes('❌')) {
      issues.push('Coverage Checklist has unchecked items (❌)');
    }

  } catch (error) {
    issues.push(`Error reading file: ${error.message}`);
  }

  return { valid: issues.length === 0, issues };
}