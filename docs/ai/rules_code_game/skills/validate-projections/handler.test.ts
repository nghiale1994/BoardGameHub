import { validateProjections } from './handler';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('validateProjections', () => {
  const validFile = join(__dirname, 'valid.ts');
  const invalidFile = join(__dirname, 'invalid.ts');

  beforeAll(() => {
    writeFileSync(validFile, 'emit("RoomChatAppend", data);');
    writeFileSync(invalidFile, 'emit("InvalidProjection", data);');
  });

  afterAll(() => {
    unlinkSync(validFile);
    unlinkSync(invalidFile);
  });

  it('should allow valid projections', () => {
    const result = validateProjections(validFile);
    expect(result.valid).toBe(true);
  });

  it('should reject invalid projections', () => {
    const result = validateProjections(invalidFile);
    expect(result.valid).toBe(false);
  });
});