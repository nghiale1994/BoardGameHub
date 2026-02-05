import { validateCoverage } from './handler';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('validateCoverage', () => {
  const validFile = join(__dirname, 'valid.md');
  const invalidFile = join(__dirname, 'invalid.md');

  beforeAll(() => {
    writeFileSync(validFile, '# Design\n## Coverage Checklist\n- ✅ Item 1\n- ✅ Item 2');
    writeFileSync(invalidFile, '# Design\nNo checklist');
  });

  afterAll(() => {
    unlinkSync(validFile);
    unlinkSync(invalidFile);
  });

  it('should validate correct coverage', () => {
    const result = validateCoverage(validFile);
    expect(result.valid).toBe(true);
  });

  it('should detect missing coverage', () => {
    const result = validateCoverage(invalidFile);
    expect(result.valid).toBe(false);
    expect(result.issues).toContain('Missing Coverage Checklist section');
  });
});