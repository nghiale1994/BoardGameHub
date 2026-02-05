import { checkPreface } from './handler';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('checkPreface', () => {
  const testFile1 = join(__dirname, 'test1.md');
  const testFile2 = join(__dirname, 'test2.md');

  beforeAll(() => {
    writeFileSync(testFile1, 'NOTE: AI must read docs/ai/README.md before modifying this file.\nContent');
    writeFileSync(testFile2, 'Wrong preface\nContent');
  });

  afterAll(() => {
    unlinkSync(testFile1);
    unlinkSync(testFile2);
  });

  it('should return empty missing for correct preface', () => {
    const result = checkPreface([testFile1]);
    expect(result.missing).toEqual([]);
  });

  it('should return missing for incorrect preface', () => {
    const result = checkPreface([testFile2]);
    expect(result.missing).toEqual([testFile2]);
  });
});