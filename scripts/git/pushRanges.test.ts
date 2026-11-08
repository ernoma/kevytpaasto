// AVO-03: the pre-push hook scans every pushed commit for secrets (docs/adr/0014).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { pushRanges } from './pushRanges.ts';

const local = 'a'.repeat(40);
const other = 'b'.repeat(40);
const zero = '0'.repeat(40);

describe('pushRanges', () => {
  it('AVO-03: scans the pushed commits that are not yet on a remote', () => {
    assert.deepEqual(pushRanges(`refs/heads/main ${local} refs/heads/main ${other}\n`), [
      `${local} --not --remotes`,
    ]);
  });

  it('AVO-03: scans a new branch the same way', () => {
    assert.deepEqual(pushRanges(`refs/heads/new ${local} refs/heads/new ${zero}\n`), [
      `${local} --not --remotes`,
    ]);
  });

  it('skips a deleted ref, which pushes no commits', () => {
    assert.deepEqual(pushRanges(`(delete) ${zero} refs/heads/old ${other}\n`), []);
  });

  it('handles several refs, CRLF line endings and blank lines', () => {
    const input = `refs/heads/main ${local} refs/heads/main ${other}\r\n\r\nrefs/tags/v1 ${other} refs/tags/v1 ${zero}\r\n`;
    assert.deepEqual(pushRanges(input), [`${local} --not --remotes`, `${other} --not --remotes`]);
  });

  it('ignores lines that are not ref lines', () => {
    assert.deepEqual(pushRanges('not a ref line\n'), []);
  });
});
