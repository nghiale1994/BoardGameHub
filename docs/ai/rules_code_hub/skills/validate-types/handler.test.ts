import { validateTypes } from './handler';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('validateTypes', () => {
  const validFile = join(__dirname, 'valid.ts');
  const invalidFile = join(__dirname, 'invalid.ts');

  beforeAll(() => {
    writeFileSync(validFile, 'export const x: string = "hello";');
    writeFileSync(invalidFile, 'export const x = "hello";');
  });

  afterAll(() => {
    unlinkSync(validFile);
    unlinkSync(invalidFile);
  });

  it('should validate typed exports', () => {
    const result = validateTypes(validFile);
    expect(result.valid).toBe(true);
  });

  it('should detect untyped exports', () => {
    const result = validateTypes(invalidFile);
    expect(result.valid).toBe(false);
  });
});