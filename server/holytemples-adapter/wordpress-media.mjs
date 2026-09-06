const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export class WordPressMediaError extends Error {
  constructor(code, message, status = 500) {
    super(message);
    this.name = 'WordPressMediaError';
    this.code = code;
    this.status = status;
  }
}

export function createWordPressMediaUploader({ baseUrl, username, applicationPassword, fetchImpl = fetch } = {}) {
  if (!baseUrl) throw new TypeError('baseUrl is required');

  return async function uploadMedia({ filename, mimeType, body, approved = false } = {}) {
    if (!approved) {
      throw new WordPressMediaError('temple_media_approval_required', 'Temple media upload requires explicit approval.', 403);
    }
    if (!filename || !mimeType || !body) {
      throw new WordPressMediaError('temple_media_invalid_request', 'filename, mimeType and body are required.', 400);
    }
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      throw new WordPressMediaError('temple_media_type_forbidden', `Unsupported Temple media type: ${mimeType}`, 415);
    }
    if (!username || !applicationPassword) {
      throw new WordPressMediaError('temple_media_not_configured', 'WordPress media credentials are not configured.', 503);
    }

    const endpoint = `${baseUrl.replace(/\/$/, '')}/wp-json/wp/v2/media`;
    const authorization = Buffer.from(`${username}:${applicationPassword}`).toString('base64');
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${authorization}`,
        'Content-Type': mimeType,
        'Content-Disposition': `attachment; filename="${filename.replace(/["\r\n]/g, '')}"`,
      },
      body,
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new WordPressMediaError(
        'temple_media_provider_error',
        payload?.message || `WordPress media upload failed with ${response.status}.`,
        response.status,
      );
    }

    return {
      ok: true,
      provider: 'wordpress',
      attachmentId: payload.id,
      url: payload.source_url,
      mimeType: payload.mime_type || mimeType,
      filename,
    };
  };
}
