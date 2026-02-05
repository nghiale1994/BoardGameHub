import { checkSchema } from './handler';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('checkSchema', () => {
  const validFile = join(__dirname, 'valid.ts');
  const invalidFile = join(__dirname, 'invalid.ts');

  beforeAll(() => {
    writeFileSync(validFile, 'const event = { name: "castingShadows.move", schemaVersion: 1 };');
    writeFileSync(invalidFile, 'const event = { name: "move" };');
  });

  afterAll(() => {
    unlinkSync(validFile);
    unlinkSync(invalidFile);
  });

  it('should validate correct schema', () => {
    const result = checkSchema(validFile);
    expect(result.valid).toBe(true);
  });

  it('should detect schema issues', () => {
    const result = checkSchema(invalidFile);
    expect(result.valid).toBe(false);
  });
});