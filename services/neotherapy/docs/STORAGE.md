# NEOTHERAPY-STORAGE-001

Durable single-instance storage adapter for Neotherapy.

The adapter uses atomic file replacement and restrictive file permissions. Configure `NEOTHERAPY_DATA_PATH` to a path on a persistent encrypted volume.

This is durable across process restarts **only when the configured filesystem itself is persistent**. It is not a distributed database and must not be used concurrently by multiple application instances. Multi-instance production deployment requires a transactional managed datastore in a later gate.

Participant records remain in a dedicated Neotherapy data path and are not exported into general NEO intelligence stores.
