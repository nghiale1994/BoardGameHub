import { scanContradictions } from './handler';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('scanContradictions', () => {
  const mainFile = join(__dirname, 'main.md');
  const relatedFile = join(__dirname, 'related.md');

  beforeAll(() => {
    writeFileSync(mainFile, 'This must be done.');
    writeFileSync(relatedFile, 'This must not be done.');
  });

  afterAll(() => {
    unlinkSync(mainFile);
    unlinkSync(relatedFile);
  });

  it('should detect contradictions', () => {
    const result = scanContradictions(mainFile, [relatedFile]);
    expect(result.contradictions.length).toBeGreaterThan(0);
  });
});