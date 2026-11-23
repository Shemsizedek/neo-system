import { canonicalRecords } from './registry.mjs';

function question(message) {
  if (!Buffer.isBuffer(message) || message.length < 17 || message.readUInt16BE(4) !== 1) throw new Error('invalid_dns_question');
  let offset = 12;
  const labels = [];
  while (offset < message.length) {
    const n = message[offset++];
    if (n === 0) break;
    if (n > 63 || offset + n > message.length) throw new Error('invalid_dns_name');
    labels.push(message.toString('ascii', offset, offset + n));
    offset += n;
  }
  if (offset + 4 > message.length) throw new Error('truncated_dns_question');
  return { name: labels.join('.').toLowerCase(), type: message.readUInt16BE(offset), class: message.readUInt16BE(offset + 2), end: offset + 4 };
}

// Authoritative, non-recursive response; unknown private names do NOT fall back to public DNS.
export function buildResponse(message, records) {
  const q = question(message);
  const id = message.subarray(0, 2);
  const suffix = q.name === 'neo' || q.name.endsWith('.neo');
  const lookup = new Map(canonicalRecords(records).map(r => [r.name, r.address]));
  const known = lookup.has(q.name);
  const code = !suffix ? 5 : !known ? 3 : 0; // REFUSED / NXDOMAIN / NOERROR
  const answer = code === 0 && q.type === 1 && q.class === 1;
  const header = Buffer.alloc(12);
  id.copy(header);
  header.writeUInt16BE(0x8400 | code, 2); // QR, AA, no recursion, RCODE
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(answer ? 1 : 0, 6);
  const parts = [header, message.subarray(12, q.end)];
  if (answer) {
    const bytes = Buffer.from(lookup.get(q.name).split('.').map(Number));
    const rr = Buffer.alloc(12);
    rr.writeUInt16BE(0xc00c, 0); // pointer to query name
    rr.writeUInt16BE(1, 2); // A
    rr.writeUInt16BE(1, 4); // IN
    rr.writeUInt32BE(60, 6); // cache TTL
    rr.writeUInt16BE(4, 10);
    parts.push(rr, bytes);
  }
  return Buffer.concat(parts);
}
