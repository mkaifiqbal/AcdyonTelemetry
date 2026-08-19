import test from 'node:test';
import assert from 'node:assert/strict';
import { IngestionRun } from '../src/models/IngestionRun.js';

test('multi-source API runs pass schema validation', () => {
  const run = new IngestionRun({
    status: 'success',
    methodUsed: 'api',
    requestedSource: 'remoteok',
    successfulSource: 'RemoteOK',
  });
  assert.equal(run.validateSync(), undefined);
});
