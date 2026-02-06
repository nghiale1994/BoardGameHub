import { readFile, writeFile } from './file-ops';

export async function updateDesignDoc(
  designDocPath: string,
  missingTests: string[],
  extraTests: string[]
): Promise<void> {
  const content = await readFile(designDocPath);
  let updatedContent = content;

  // Remove extra tests from doc
  for (const extraTest of extraTests) {
    updatedContent = removeTestFromDoc(updatedContent, extraTest);
  }

  // Add missing tests to doc
  if (missingTests.length > 0) {
    updatedContent = addTestsToDoc(updatedContent, missingTests);
  }

  // Update version and changelog
  updatedContent = updateVersionAndChangelog(updatedContent, missingTests.length + extraTests.length);

  await writeFile(designDocPath, updatedContent);
}

function removeTestFromDoc(content: string, testName: string): string {
  const lines = content.split('\n');
  const result = [];
  let inTable = false;
  let skipRow = false;

  for (const line of lines) {
    if (line.includes('### E2E tests') || line.includes('### Integration tests') || line.includes('### Unit tests')) {
      inTable = true;
      result.push(line);
      continue;
    }

    if (inTable && line.includes('|') && !line.includes('Component') && !line.includes('---')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 2 && cells[1].includes(testName)) {
        skipRow = true;
        continue; // Skip this row
      }
    }

    if (skipRow && line.trim() === '') {
      skipRow = false;
      continue; // Skip empty line after removed row
    }

    result.push(line);
  }

  return result.join('\n');
}

function addTestsToDoc(content: string, testNames: string[]): string {
  // Find E2E tests table and add new rows
  const lines = content.split('\n');
  const result = [];
  let inE2ETable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    result.push(line);

    if (line.includes('### E2E tests')) {
      inE2ETable = true;
      continue;
    }

    if (inE2ETable && line.trim() === '' && lines[i + 1]?.trim() === '') {
      // Add new test rows before the empty line that ends the table
      for (const testName of testNames) {
        result.push(`| End-to-end ${testName} | Test description | Test steps | Expected result |`);
      }
      inE2ETable = false;
    }
  }

  return result.join('\n');
}

function updateVersionAndChangelog(content: string, changesCount: number): string {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '-'); // YYYY-MM-DD

  // Update version
  content = content.replace(
    /Version: \d{4}-\d{2}-\d{2}/,
    `Version: ${today}`
  );

  // Add changelog entry
  const changelogMatch = content.match(/(Changelog:[\s\S]*?)(?=\n\n|#)/);
  if (changelogMatch) {
    const changelogSection = changelogMatch[1];
    const newEntry = `- ${today}: Auto-synced ${changesCount} test coverage changes.`;
    content = content.replace(changelogSection, changelogSection + '\n' + newEntry);
  }

  return content;
}