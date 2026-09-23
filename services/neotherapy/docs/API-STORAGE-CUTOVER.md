# API storage cutover

`api/neotherapy-storage.mjs` is the storage-backed candidate for the Neotherapy API.

It reports `persistent: true` only with the explicit qualifier that `NEOTHERAPY_DATA_PATH` must reside on a persistent volume, and reports `multiInstanceSafe: false`.

The existing `api/neotherapy.mjs` remains untouched until deployment configuration supplies a persistent volume. This prevents a false production-persistence claim on ephemeral serverless filesystems.

Cutover gate:
1. provision persistent encrypted volume;
2. set `NEOTHERAPY_DATA_PATH`;
3. run storage tests;
4. replace the ephemeral handler with the storage-backed handler;
5. verify restart persistence;
6. wire UI writes only after verification.
