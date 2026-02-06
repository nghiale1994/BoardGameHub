import { readFile, writeFile, listDir, fileSearch, exists } from './utils/file-ops';
import { parseTestIntent, determineTestType } from './utils/test-parser';
import { updateDesignDoc } from './utils/doc-updater';
import { generateSyncReport } from './utils/report-generator';

export interface SyncTestDocsParams {
  testFiles?: string[];
  dryRun?: boolean;
  autoFix?: boolean;
}

export interface SyncReport {
  totalTests: number;
  syncedTests: number;
  driftedTests: number;
  driftDetails: Array<{
    testFile: string;
    designDoc: string;
    missingInDoc: string[];
    extraInDoc: string[];
  }>;
  updatedDocs: string[];
}

export async function syncTestDocs(params: SyncTestDocsParams = {}): Promise<SyncReport> {
  const { testFiles = [], dryRun = true, autoFix = false } = params;

  // 1. Discover test files
  const allTestFiles = testFiles.length > 0 ? testFiles : await discoverTestFiles();

  // 2. Parse test intents
  const testIntents = await parseAllTestIntents(allTestFiles);

  // 3. Map tests to design docs
  const docMappings = await mapTestsToDocs(testIntents);

  // 4. Check sync status
  const syncStatus = await checkSyncStatus(docMappings);

  // 5. Generate report
  const report = generateSyncReport(syncStatus);

  // 6. Apply fixes if autoFix enabled
  if (!dryRun && autoFix) {
    await applyAutoFixes(syncStatus.driftedTests);
    report.updatedDocs = syncStatus.driftedTests.map(d => d.designDoc);
  }

  return report;
}

async function discoverTestFiles(): Promise<string[]> {
  // Scan for test files in e2e/, src/**/test/, src/**/spec/
  const patterns = [
    'app/e2e/**/*.spec.ts',
    'app/src/**/*.test.tsx',
    'app/src/**/*.test.ts',
    'app/src/**/*.spec.ts'
  ];

  const files: string[] = [];
  for (const pattern of patterns) {
    const matches = await fileSearch({ query: pattern });
    files.push(...matches);
  }

  return [...new Set(files)]; // deduplicate
}

async function parseAllTestIntents(testFiles: string[]): Promise<Array<{file: string, tests: any[]}>> {
  const results = [];

  for (const file of testFiles) {
    try {
      const content = await readFile(file);
      const tests = parseTestIntent(content);
      results.push({ file, tests });
    } catch (error) {
      console.warn(`Failed to parse ${file}:`, error);
    }
  }

  return results;
}

async function mapTestsToDocs(testIntents: Array<{file: string, tests: any[]}>): Promise<Map<string, any[]>> {
  const mappings = new Map<string, any[]>();

  for (const { file, tests } of testIntents) {
    const designDoc = await findCorrespondingDesignDoc(file);
    if (designDoc) {
      if (!mappings.has(designDoc)) {
        mappings.set(designDoc, []);
      }
      mappings.get(designDoc)!.push(...tests);
    }
  }

  return mappings;
}

async function findCorrespondingDesignDoc(testFile: string): Promise<string | null> {
  // Map test files to design docs based on naming patterns
  const mappings = {
    'homepage.spec.ts': 'docs/features/HomePage/design.md',
    'JoinRoom.test.tsx': 'docs/features/HomePage/JoinRoom/JoinRoom.md',
    'CreateRoomModal.test.tsx': 'docs/features/HomePage/CreateRoomModal/CreateRoomModal.md',
    'RoomCreatedModal.test.tsx': 'docs/features/HomePage/RoomCreated/RoomCreatedModal.md',
    // Add more mappings as needed
  };

  for (const [testPattern, docPath] of Object.entries(mappings)) {
    if (testFile.includes(testPattern)) {
      return docPath;
    }
  }

  return null;
}

async function checkSyncStatus(docMappings: Map<string, any[]>): Promise<{
  totalTests: number;
  syncedTests: number;
  driftedTests: Array<{
    designDoc: string;
    missingInDoc: string[];
    extraInDoc: string[];
  }>;
}> {
  const result = {
    totalTests: 0,
    syncedTests: 0,
    driftedTests: []
  };

  for (const [designDoc, tests] of docMappings) {
    result.totalTests += tests.length;

    try {
      const docContent = await readFile(designDoc);
      const docTests = extractTestsFromDoc(docContent);

      const missingInDoc = tests.filter(t => !docTests.some(dt => dt.name === t.name));
      const extraInDoc = docTests.filter(dt => !tests.some(t => t.name === dt.name));

      if (missingInDoc.length > 0 || extraInDoc.length > 0) {
        result.driftedTests.push({
          designDoc,
          missingInDoc: missingInDoc.map(t => t.name),
          extraInDoc: extraInDoc.map(t => t.name)
        });
      } else {
        result.syncedTests += tests.length;
      }
    } catch (error) {
      console.warn(`Failed to check ${designDoc}:`, error);
    }
  }

  return result;
}

function extractTestsFromDoc(content: string): Array<{name: string, type: string}> {
  const tests = [];
  const lines = content.split('\n');

  let inTable = false;
  let tableType = '';

  for (const line of lines) {
    if (line.includes('### E2E tests') || line.includes('### Integration tests') || line.includes('### Unit tests')) {
      tableType = line.includes('E2E') ? 'e2e' : line.includes('Integration') ? 'integration' : 'unit';
      inTable = true;
      continue;
    }

    if (inTable && line.includes('|') && !line.includes('Component') && !line.includes('---')) {
      const cells = line.split('|').map(c => c.trim()).filter(c => c);
      if (cells.length >= 2) {
        tests.push({
          name: cells[1], // Test Steps column
          type: tableType
        });
      }
    }

    if (inTable && line.trim() === '') {
      inTable = false;
    }
  }

  return tests;
}

async function applyAutoFixes(driftedTests: Array<{
  designDoc: string;
  missingInDoc: string[];
  extraInDoc: string[];
}>): Promise<void> {
  for (const drift of driftedTests) {
    await updateDesignDoc(drift.designDoc, drift.missingInDoc, drift.extraInDoc);
  }
}