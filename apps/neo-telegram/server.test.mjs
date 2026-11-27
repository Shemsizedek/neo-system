import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { subtle } = crypto.webcrypto;

// Test configuration
const TEST_PORT = 18788;
const BASE_URL = `http://localhost:${TEST_PORT}`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Server management
let serverProcess = null;

async function startServer() {
  return new Promise((resolve, reject) => {
    serverProcess = spawn('node', [join(__dirname, 'server.mjs')], {
      env: { ...process.env, PORT: String(TEST_PORT) },
      stdio: 'pipe'
    });
    
    serverProcess.on('error', reject);
    
    // Wait for server to be ready
    const checkServer = setInterval(async () => {
      try {
        const req = http.get(`${BASE_URL}/health`, (res) => {
          if (res.statusCode === 200) {
            clearInterval(checkServer);
            resolve();
          }
        });
        req.on('error', () => {}); // Ignore connection errors during startup
        req.end();
      } catch (e) {
        // Server not ready yet
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkServer);
      reject(new Error('Server startup timeout'));
    }, 5000);
  });
}

function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
}

// Setup and teardown
test.before(async () => {
  await startServer();
});

test.after(() => {
  stopServer();
});

// Crypto utilities
function b64ToBytes(s) {
  return Uint8Array.from(Buffer.from(s, 'base64'));
}

function bytesToB64(bytes) {
  return Buffer.from(bytes).toString('base64');
}

function sha256Hex(s) {
  return crypto.createHash('sha256').update(s).digest('hex');
}

async function generateP256KeyPair() {
  const keyPair = await subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  );
  const publicKeyRaw = await subtle.exportKey('raw', keyPair.publicKey);
  return {
    privateKey: keyPair.privateKey,
    publicKey: keyPair.publicKey,
    publicKeyB64: bytesToB64(publicKeyRaw)
  };
}

async function signCanonicalRequest(privateKey, method, path, timestamp, nonce, bodyHash) {
  const canonical = [method, path, timestamp, nonce, bodyHash].join('\n');
  const signature = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(canonical)
  );
  return bytesToB64(signature);
}

async function signEnvelope(privateKey, envelope) {
  const copy = structuredClone(envelope);
  copy.security.signature = null;
  copy.security.state = 'SIGNING';
  const stable = JSON.stringify(copy, Object.keys(copy).sort());
  const signature = await subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(stable)
  );
  return bytesToB64(signature);
}

async function makeRequest({ method, path, identity, timestamp, nonce, publicKey, signature, body = '' }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: 'localhost',
        port: TEST_PORT,
        method,
        path,
        headers: {
          'x-neogram-identity': identity,
          'x-neogram-timestamp': timestamp,
          'x-neogram-nonce': nonce,
          'x-neogram-public-key': publicKey,
          'x-neogram-signature': signature,
          'content-type': 'application/json'
        }
      },
      res => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      }
    );
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

// Helper to register a user
async function registerUser(identity, keys) {
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = JSON.stringify({
    neo_id: identity,
    encryption_public_key: 'test_encryption_key',
    encryption_fingerprint: 'test_fingerprint'
  });
  
  const signature = await signCanonicalRequest(
    keys.privateKey,
    'POST',
    '/v0.5/relay/register',
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  return makeRequest({
    method: 'POST',
    path: '/v0.5/relay/register',
    identity,
    timestamp,
    nonce,
    publicKey: keys.publicKeyB64,
    signature,
    body
  });
}

// Security Tests - Core Vulnerability Mitigation

test('rejects mailbox access with unregistered identity', async () => {
  const attackerKeys = await generateP256KeyPair();
  const victimIdentity = 'neo:unregistered:victim001';
  
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = '';
  
  const signature = await signCanonicalRequest(
    attackerKeys.privateKey,
    'GET',
    `/v0.5/mailbox/${encodeURIComponent(victimIdentity)}`,
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  const response = await makeRequest({
    method: 'GET',
    path: `/v0.5/mailbox/${encodeURIComponent(victimIdentity)}`,
    identity: victimIdentity,
    timestamp,
    nonce,
    publicKey: attackerKeys.publicKeyB64,
    signature,
    body
  });
  
  // Should reject with 403 identity_not_registered
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'identity_not_registered');
});

test('rejects mailbox access with wrong public key for registered identity', async () => {
  const legitimateKeys = await generateP256KeyPair();
  const attackerKeys = await generateP256KeyPair();
  const identity = 'neo:user:wrongkey001';
  
  // Register with legitimate key
  const regResponse = await registerUser(identity, legitimateKeys);
  assert.equal(regResponse.status, 201);
  
  // Attacker tries to access with different key
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = '';
  
  const signature = await signCanonicalRequest(
    attackerKeys.privateKey,
    'GET',
    `/v0.5/mailbox/${encodeURIComponent(identity)}`,
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  const response = await makeRequest({
    method: 'GET',
    path: `/v0.5/mailbox/${encodeURIComponent(identity)}`,
    identity,
    timestamp,
    nonce,
    publicKey: attackerKeys.publicKeyB64,
    signature,
    body
  });
  
  // Should reject with 403 public_key_not_registered_for_identity
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'public_key_not_registered_for_identity');
});

test('rejects message submission with unregistered identity', async () => {
  const attackerKeys = await generateP256KeyPair();
  const attackerIdentity = 'neo:unregistered:attacker001';
  
  const envelope = {
    protocol: 'NTP',
    version: '1.0',
    message_id: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    source: { neo_id: attackerIdentity },
    destination: { value: 'neo:target:001' },
    security: {
      public_key: attackerKeys.publicKeyB64,
      signature: null,
      state: 'SIGNING'
    },
    message: {
      encrypted: true,
      ciphertext: bytesToB64(crypto.randomBytes(32)),
      iv: bytesToB64(crypto.randomBytes(16))
    }
  };
  
  envelope.security.signature = await signEnvelope(attackerKeys.privateKey, envelope);
  envelope.security.state = 'SIGNED';
  
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = JSON.stringify(envelope);
  
  const signature = await signCanonicalRequest(
    attackerKeys.privateKey,
    'POST',
    '/v0.5/messages',
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  const response = await makeRequest({
    method: 'POST',
    path: '/v0.5/messages',
    identity: attackerIdentity,
    timestamp,
    nonce,
    publicKey: attackerKeys.publicKeyB64,
    signature,
    body
  });
  
  // Should reject with 403 identity_not_registered
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'identity_not_registered');
});

test('rejects message submission with wrong public key for registered identity', async () => {
  const legitimateKeys = await generateP256KeyPair();
  const attackerKeys = await generateP256KeyPair();
  const identity = 'neo:user:msgwrongkey001';
  
  // Register with legitimate key
  const regResponse = await registerUser(identity, legitimateKeys);
  assert.equal(regResponse.status, 201);
  
  // Attacker tries to submit message with different key
  const envelope = {
    protocol: 'NTP',
    version: '1.0',
    message_id: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    source: { neo_id: identity },
    destination: { value: 'neo:target:002' },
    security: {
      public_key: attackerKeys.publicKeyB64,
      signature: null,
      state: 'SIGNING'
    },
    message: {
      encrypted: true,
      ciphertext: bytesToB64(crypto.randomBytes(32)),
      iv: bytesToB64(crypto.randomBytes(16))
    }
  };
  
  envelope.security.signature = await signEnvelope(attackerKeys.privateKey, envelope);
  envelope.security.state = 'SIGNED';
  
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = JSON.stringify(envelope);
  
  const signature = await signCanonicalRequest(
    attackerKeys.privateKey,
    'POST',
    '/v0.5/messages',
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  const response = await makeRequest({
    method: 'POST',
    path: '/v0.5/messages',
    identity,
    timestamp,
    nonce,
    publicKey: attackerKeys.publicKeyB64,
    signature,
    body
  });
  
  // Should reject with 403 public_key_not_registered_for_identity
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'public_key_not_registered_for_identity');
});

test('rejects acknowledgement with unregistered identity', async () => {
  const attackerKeys = await generateP256KeyPair();
  const attackerIdentity = 'neo:unregistered:acker001';
  const messageId = crypto.randomUUID();
  
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = JSON.stringify({ status: 'ACKNOWLEDGED' });
  
  const signature = await signCanonicalRequest(
    attackerKeys.privateKey,
    'POST',
    `/v0.5/messages/${messageId}/ack`,
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  const response = await makeRequest({
    method: 'POST',
    path: `/v0.5/messages/${messageId}/ack`,
    identity: attackerIdentity,
    timestamp,
    nonce,
    publicKey: attackerKeys.publicKeyB64,
    signature,
    body
  });
  
  // Should reject with 403 identity_not_registered
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'identity_not_registered');
});

test('allows registration with new unregistered key (requireRegistration=false)', async () => {
  const newUserKeys = await generateP256KeyPair();
  const identity = 'neo:newuser:' + crypto.randomUUID().slice(0, 8);
  
  const response = await registerUser(identity, newUserKeys);
  
  // Registration should succeed
  assert.equal(response.status, 201);
  assert.equal(response.body.registration.neo_id, identity);
  assert.equal(response.body.registration.signing_public_key, newUserKeys.publicKeyB64);
});

test('allows authenticated operations with correctly registered key', async () => {
  const userKeys = await generateP256KeyPair();
  const identity = 'neo:legitimate:user001';
  
  // Register user
  const regResponse = await registerUser(identity, userKeys);
  assert.equal(regResponse.status, 201);
  
  // Access mailbox with registered key
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = '';
  
  const signature = await signCanonicalRequest(
    userKeys.privateKey,
    'GET',
    `/v0.5/mailbox/${encodeURIComponent(identity)}`,
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  const response = await makeRequest({
    method: 'GET',
    path: `/v0.5/mailbox/${encodeURIComponent(identity)}`,
    identity,
    timestamp,
    nonce,
    publicKey: userKeys.publicKeyB64,
    signature,
    body
  });
  
  // Should succeed
  assert.equal(response.status, 200);
  assert.equal(response.body.neo_id, identity);
  assert.ok(Array.isArray(response.body.items));
});

test('prevents identity spoofing attack from pentest finding', async () => {
  // Pentest scenario: "attacker can generate a P-256 key pair, 
  // choose a known identity, and pass authentication"
  
  const attackerKeys = await generateP256KeyPair();
  const knownVictimIdentity = 'neo:victim:spooftest001';
  
  // Attacker generates valid signature with their own key
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = '';
  
  const signature = await signCanonicalRequest(
    attackerKeys.privateKey,
    'GET',
    `/v0.5/mailbox/${encodeURIComponent(knownVictimIdentity)}`,
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  const response = await makeRequest({
    method: 'GET',
    path: `/v0.5/mailbox/${encodeURIComponent(knownVictimIdentity)}`,
    identity: knownVictimIdentity,
    timestamp,
    nonce,
    publicKey: attackerKeys.publicKeyB64,
    signature,
    body
  });
  
  // Attack should be blocked - the fix checks registrations
  assert.equal(response.status, 403);
  assert.ok(
    response.body.error === 'identity_not_registered' ||
    response.body.error === 'public_key_not_registered_for_identity',
    'Should reject with registration error'
  );
});

test('prevents circular validation attack on message submission', async () => {
  // Pentest finding: "equality checks are circular: both the asserted identity 
  // and matching envelope fields can be selected by the attacker"
  
  const attackerKeys = await generateP256KeyPair();
  const attackerChosenIdentity = 'neo:circular:attack001';
  
  // Attacker creates envelope with matching fields
  const envelope = {
    protocol: 'NTP',
    version: '1.0',
    message_id: crypto.randomUUID(),
    nonce: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3600000).toISOString(),
    source: { neo_id: attackerChosenIdentity }, // Matches header
    destination: { value: 'neo:target:003' },
    security: {
      public_key: attackerKeys.publicKeyB64, // Matches header
      signature: null,
      state: 'SIGNING'
    },
    message: {
      encrypted: true,
      ciphertext: bytesToB64(crypto.randomBytes(32)),
      iv: bytesToB64(crypto.randomBytes(16))
    }
  };
  
  envelope.security.signature = await signEnvelope(attackerKeys.privateKey, envelope);
  envelope.security.state = 'SIGNED';
  
  const timestamp = new Date().toISOString();
  const nonce = crypto.randomUUID();
  const body = JSON.stringify(envelope);
  
  const signature = await signCanonicalRequest(
    attackerKeys.privateKey,
    'POST',
    '/v0.5/messages',
    timestamp,
    nonce,
    sha256Hex(body)
  );
  
  const response = await makeRequest({
    method: 'POST',
    path: '/v0.5/messages',
    identity: attackerChosenIdentity,
    timestamp,
    nonce,
    publicKey: attackerKeys.publicKeyB64,
    signature,
    body
  });
  
  // Should be blocked at registration check, not envelope validation
  assert.equal(response.status, 403);
  assert.equal(response.body.error, 'identity_not_registered');
});
