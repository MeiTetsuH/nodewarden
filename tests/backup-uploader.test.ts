import assert from 'node:assert/strict';
import test from 'node:test';
import { createRemoteBackupTransferSession } from '../src/services/backup-uploader';
import type { BackupDestinationRecord } from '../src/services/backup-config';

const jianguoyunDestination: BackupDestinationRecord = {
  id: 'jianguoyun',
  name: 'Jianguoyun',
  type: 'webdav',
  destination: {
    baseUrl: 'https://dav.jianguoyun.com/dav/',
    username: 'user@example.test',
    password: 'test-app-password',
    remotePath: 'nodewarden',
  },
  schedule: {
    enabled: false,
    intervalHours: 24,
    startTime: '03:00',
    timezone: 'UTC',
    retentionCount: 30,
  },
  runtime: {
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastFailureAt: null,
    lastError: null,
  },
};

test('uses trailing slashes for WebDAV collection methods while preserving file URLs', async (t) => {
  const originalFetch = globalThis.fetch;
  const requests: Array<{ method: string; url: string }> = [];

  globalThis.fetch = async (input, init) => {
    const method = String(init?.method || 'GET');
    requests.push({ method, url: String(input) });
    if (method === 'PROPFIND') {
      return new Response('<?xml version="1.0"?><multistatus xmlns="DAV:"/>', { status: 207 });
    }
    return new Response(null, { status: 201 });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const session = createRemoteBackupTransferSession(jianguoyunDestination);
  await session.uploadArchive(new Uint8Array([0x50, 0x4b]), 'nodewarden_backup.zip');
  await session.list('');

  assert.deepEqual(requests, [
    { method: 'MKCOL', url: 'https://dav.jianguoyun.com/dav/nodewarden/' },
    { method: 'PUT', url: 'https://dav.jianguoyun.com/dav/nodewarden/nodewarden_backup.zip' },
    { method: 'PROPFIND', url: 'https://dav.jianguoyun.com/dav/nodewarden/' },
  ]);
});
