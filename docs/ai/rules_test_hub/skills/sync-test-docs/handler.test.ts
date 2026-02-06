import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { syncTestDocs } from './handler';
import * as fileOps from './utils/file-ops';
import * as testParser from './utils/test-parser';
import * as docUpdater from './utils/doc-updater';

// Mock utilities
vi.mock('./utils/file-ops');
vi.mock('./utils/test-parser');
vi.mock('./utils/doc-updater');

describe('syncTestDocs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should discover test files when none provided', async () => {
    const mockTestFiles = ['app/e2e/homepage.spec.ts'];
    const mockTestIntents = [{
      file: 'app/e2e/homepage.spec.ts',
      tests: [{ name: 'test1', description: 'desc', steps: ['step1'], type: 'e2e' }]
    }];

    vi.mocked(fileOps.fileSearch).mockResolvedValue(mockTestFiles);
    vi.mocked(testParser.parseTestIntent).mockReturnValue(mockTestIntents[0].tests);
    vi.mocked(fileOps.readFile).mockResolvedValue('# Test doc\n### E2E tests\n| Component | Test | Steps | Result |\n| test1 | test1 | step1 | ok |');

    const result = await syncTestDocs({ dryRun: true });

    expect(fileOps.fileSearch).toHaveBeenCalled();
    expect(result.totalTests).toBe(1);
    expect(result.syncedTests).toBe(1);
    expect(result.driftedTests).toBe(0);
  });

  it('should detect missing tests in docs', async () => {
    const mockTestFiles = ['app/e2e/homepage.spec.ts'];
    const mockTestIntents = [{
      file: 'app/e2e/homepage.spec.ts',
      tests: [
        { name: 'test1', description: 'desc', steps: ['step1'], type: 'e2e' },
        { name: 'test2', description: 'desc', steps: ['step2'], type: 'e2e' }
      ]
    }];

    vi.mocked(fileOps.fileSearch).mockResolvedValue(mockTestFiles);
    vi.mocked(testParser.parseTestIntent).mockReturnValue(mockTestIntents[0].tests);
    vi.mocked(fileOps.readFile).mockResolvedValue('# Test doc\n### E2E tests\n| Component | Test | Steps | Result |\n| test1 | test1 | step1 | ok |');

    const result = await syncTestDocs({ dryRun: true });

    expect(result.totalTests).toBe(2);
    expect(result.syncedTests).toBe(1);
    expect(result.driftedTests).toBe(1);
    expect(result.driftDetails[0].missingInDoc).toContain('test2');
  });

  it('should detect extra tests in docs', async () => {
    const mockTestFiles = ['app/e2e/homepage.spec.ts'];
    const mockTestIntents = [{
      file: 'app/e2e/homepage.spec.ts',
      tests: [{ name: 'test1', description: 'desc', steps: ['step1'], type: 'e2e' }]
    }];

    vi.mocked(fileOps.fileSearch).mockResolvedValue(mockTestFiles);
    vi.mocked(testParser.parseTestIntent).mockReturnValue(mockTestIntents[0].tests);
    vi.mocked(fileOps.readFile).mockResolvedValue('# Test doc\n### E2E tests\n| Component | Test | Steps | Result |\n| test1 | test1 | step1 | ok |\n| test2 | test2 | step2 | ok |');

    const result = await syncTestDocs({ dryRun: true });

    expect(result.totalTests).toBe(1);
    expect(result.syncedTests).toBe(1);
    expect(result.driftedTests).toBe(1);
    expect(result.driftDetails[0].extraInDoc).toContain('test2');
  });

  it('should apply auto fixes when autoFix is true', async () => {
    const mockTestFiles = ['app/e2e/homepage.spec.ts'];
    const mockTestIntents = [{
      file: 'app/e2e/homepage.spec.ts',
      tests: [{ name: 'test1', description: 'desc', steps: ['step1'], type: 'e2e' }]
    }];

    vi.mocked(fileOps.fileSearch).mockResolvedValue(mockTestFiles);
    vi.mocked(testParser.parseTestIntent).mockReturnValue(mockTestIntents[0].tests);
    vi.mocked(fileOps.readFile).mockResolvedValue('# Test doc\n### E2E tests\n| Component | Test | Steps | Result |\n| test2 | test2 | step2 | ok |');
    vi.mocked(docUpdater.updateDesignDoc).mockResolvedValue();

    const result = await syncTestDocs({ dryRun: false, autoFix: true });

    expect(docUpdater.updateDesignDoc).toHaveBeenCalled();
    expect(result.updatedDocs).toContain('docs/features/HomePage/design.md');
  });

  it('should use provided test files instead of discovering', async () => {
    const providedFiles = ['custom/test.spec.ts'];

    vi.mocked(testParser.parseTestIntent).mockReturnValue([]);
    vi.mocked(fileOps.readFile).mockResolvedValue('# Test doc\n### E2E tests\n');

    await syncTestDocs({ testFiles: providedFiles, dryRun: true });

    expect(fileOps.fileSearch).not.toHaveBeenCalled();
  });
});