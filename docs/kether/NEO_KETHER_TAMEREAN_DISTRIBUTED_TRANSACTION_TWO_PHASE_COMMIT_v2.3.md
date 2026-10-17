# NEO Kether Tamerean Distributed Transaction & Two-Phase Commit Kernel v2.3

LOCAL COMMIT != GLOBAL COMMIT

PREPARED != COMMITTED

COORDINATOR FAILURE != PERMISSION TO GUESS

COMMIT requires all participant prepare certificates. Coordinator epochs reject stale decisions. Timeout without a durable decision enters IN_DOUBT. Participants verify and record one decision hash.

A protocol COMMIT proves agreement under the encoded protocol; it does not prove successful external-world outcomes. PROOF OF ACTION != PROOF OF OUTCOME.
