import { runChecklist } from './handler';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('runChecklist', () => {
  const testDir = tmpdir();
  const checklistPath = join(testDir, 'test-checklist.json');

  beforeEach(() => {
    const checklist = [
      { id: 'item1', description: 'Test item 1', required: true, status: 'pass' },
      { id: 'item2', description: 'Test item 2', required: false, status: 'fail' },
      { id: 'item3', description: 'Test item 3', required: true, status: 'pending' }
    ];
    writeFileSync(checklistPath, JSON.stringify(checklist));
  });

  it('should validate checklist and return results', () => {
    const result = runChecklist(checklistPath);

    expect(result.passed).toBe(false); // item3 is required but pending
    expect(result.results).toHaveLength(3);
    expect(result.results[0].status).toBe('pass');
    expect(result.results[1].status).toBe('fail');
    expect(result.results[2].status).toBe('pending');
  });

  it('should throw error for invalid file', () => {
    expect(() => runChecklist('nonexistent.json')).toThrow();
  });
});