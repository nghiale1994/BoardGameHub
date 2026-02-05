import { checkConventions } from './handler';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

describe('checkConventions', () => {
  const goodFile = join(__dirname, 'good.ts');
  const badFile = join(__dirname, 'bad.ts');

  beforeAll(() => {
    writeFileSync(goodFile, 'const x: string = "hello";');
    writeFileSync(badFile, 'const x: any = "hello"; console.log(x);');
  });

  afterAll(() => {
    unlinkSync(goodFile);
    unlinkSync(badFile);
  });

  it('should pass good code', () => {
    const result = checkConventions([goodFile]);
    expect(result.violations).toEqual([]);
  });

  it('should detect violations', () => {
    const result = checkConventions([badFile]);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});