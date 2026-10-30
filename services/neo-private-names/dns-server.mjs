import dgram from 'node:dgram';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildResponse } from './dns.mjs';

// Local proof only. Do not bind publicly or advertise this service as production DNS.
const filename = process.env.NEO_NAMES_FILE ?? fileURLToPath(new URL('./example-records.json', import.meta.url));
const records = JSON.parse(await readFile(filename, 'utf8'));
const port = Number(process.env.NEO_DNS_PORT ?? 53535);
const bind = process.env.NEO_DNS_BIND ?? '127.0.0.1';
if (bind !== '127.0.0.1' || !Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('local_only_config_required');
const server = dgram.createSocket('udp4');
server.on('message', (query, peer) => {
  try { server.send(buildResponse(query, records), peer.port, peer.address); } catch { /* malformed packets fail closed */ }
});
server.bind(port, bind, () => console.log('NEO private DNS demo on ' + bind + ':' + port));
