export interface TestIntent {
  name: string;
  description: string;
  steps: string[];
  type: 'unit' | 'integration' | 'e2e';
}

export function parseTestIntent(content: string): TestIntent[] {
  const tests: TestIntent[] = [];
  const lines = content.split('\n');

  let currentTest: Partial<TestIntent> | null = null;
  let inSteps = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect test declaration
    const testMatch = line.match(/^(test|it)\(['"`](.+?)['"`],/);
    if (testMatch) {
      // Save previous test if exists
      if (currentTest && currentTest.name) {
        tests.push(currentTest as TestIntent);
      }

      // Start new test
      currentTest = {
        name: testMatch[2],
        description: '',
        steps: [],
        type: 'unit' // default, will be determined by file path
      };
      inSteps = false;
      continue;
    }

    // Parse test comment
    if (currentTest && line.startsWith('// Tests:')) {
      currentTest.description = line.replace('// Tests:', '').trim();
      inSteps = false;
      continue;
    }

    // Parse steps
    if (currentTest && line.startsWith('// Steps:')) {
      inSteps = true;
      continue;
    }

    if (currentTest && inSteps && line.startsWith('//') && /^\d+\./.test(line.replace('//', '').trim())) {
      const step = line.replace('//', '').trim().replace(/^\d+\.\s*/, '');
      currentTest.steps.push(step);
      continue;
    }

    // End of steps when encountering non-comment or empty line after steps
    if (currentTest && inSteps && (!line.startsWith('//') || line === '//')) {
      inSteps = false;
    }
  }

  // Save last test
  if (currentTest && currentTest.name) {
    tests.push(currentTest as TestIntent);
  }

  return tests;
}

export function determineTestType(filePath: string): 'unit' | 'integration' | 'e2e' {
  if (filePath.includes('.spec.ts')) return 'e2e';
  if (filePath.includes('.test.ts') || filePath.includes('.test.tsx')) return 'unit';
  return 'unit'; // default
}