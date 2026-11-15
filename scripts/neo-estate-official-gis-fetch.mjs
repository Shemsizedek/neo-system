#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { runOfficialGISCli } from '../server/neo-crawler/estate-official-gis-fetch.mjs';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runOfficialGISCli(process.argv.slice(2))
    .then(result=>process.stdout.write(JSON.stringify(result)+'\n'))
    .catch(()=>{process.stderr.write('NEO official GIS read-only fetch blocked; no private record was written.\n');process.exitCode=1;});
}
