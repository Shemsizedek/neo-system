import test from 'node:test';
import assert from 'node:assert/strict';
import { createWordPressMediaUploader, WordPressMediaError } from './wordpress-media.mjs';

test('media upload is denied without explicit approval', async () => {
  const upload = createWordPressMediaUploader({
    baseUrl: 'https://holytemples.org',
    username: 'test',
    applicationPassword: 'secret',
    fetchImpl: async () => { throw new Error('must not call provider'); },
  });
  await assert.rejects(() => upload({ filename: 'science-temple.jpg', mimeType: 'image/jpeg', body: Buffer.from('x') }), (error) => {
    assert.equal(error instanceof WordPressMediaError, true);
    assert.equal(error.code, 'temple_media_approval_required');
    return true;
  });
});

test('media upload rejects unsupported MIME types', async () => {
  const upload = createWordPressMediaUploader({
    baseUrl: 'https://holytemples.org', username: 'test', applicationPassword: 'secret',
  });
  await assert.rejects(() => upload({ approved: true, filename: 'payload.svg', mimeType: 'image/svg+xml', body: Buffer.from('x') }), /Unsupported Temple media type/);
});

test('approved image upload returns normalized attachment metadata', async () => {
  let request;
  const upload = createWordPressMediaUploader({
    baseUrl: 'https://holytemples.org/',
    username: 'test',
    applicationPassword: 'secret',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, status: 201, json: async () => ({ id: 3004, source_url: 'https://holytemples.org/wp-content/uploads/science-temple.jpg', mime_type: 'image/jpeg' }) };
    },
  });
  const result = await upload({ approved: true, filename: 'science-temple.jpg', mimeType: 'image/jpeg', body: Buffer.from('image') });
  assert.equal(request.url, 'https://holytemples.org/wp-json/wp/v2/media');
  assert.equal(request.options.method, 'POST');
  assert.equal(result.attachmentId, 3004);
  assert.equal(result.provider, 'wordpress');
});
