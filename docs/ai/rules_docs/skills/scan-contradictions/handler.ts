import { readFileSync } from 'fs';

export function scanContradictions(filePath: string, relatedFiles: string[]): { contradictions: string[] } {
  const contradictions: string[] = [];
  const content = readFileSync(filePath, 'utf-8');

  // Simple keyword-based scan for contradictions (e.g., "must" vs "must not")
  const mustPatterns = content.match(/must\s+not/g) || [];
  const mustNotPatterns = content.match(/must\s+(?!not)/g) || [];

  for (const relatedFile of relatedFiles) {
    try {
      const relatedContent = readFileSync(relatedFile, 'utf-8');
      // Check for conflicting statements
      if (relatedContent.includes('must not') && content.includes('must ')) {
        contradictions.push(`Potential contradiction between ${filePath} and ${relatedFile} on 'must' statements`);
      }
    } catch (error) {
      contradictions.push(`Error reading ${relatedFile}: ${error.message}`);
    }
  }

  return { contradictions };
}