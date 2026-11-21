#!/usr/bin/env node
import { pathToFileURL } from 'node:url';
import { runPrivateGISSnapshotCli } from '../server/neo-crawler/estate-arcgis-snapshot.mjs';
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runPrivateGISSnapshotCli(process.argv.slice(2)).then(report=>process.stdout.write(JSON.stringify(report)+'\n')).catch(()=>{
    process.stderr.write('NEO estate ArcGIS snapshot: blocked (see source layout and permissions)\n');
    process.exitCode=1;
  });
}
