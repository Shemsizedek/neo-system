export function createStore(seed = {}) {
  const participants = new Map((seed.participants || []).map(x => [x.participantId, structuredClone(x)]));
  const stewardship = [...(seed.stewardship || [])].map(structuredClone);
  const reconciliations = [...(seed.reconciliations || [])].map(structuredClone);

  return {
    listParticipants() { return [...participants.values()].map(structuredClone); },
    getParticipant(id) { const x = participants.get(id); return x ? structuredClone(x) : null; },
    saveParticipant(record) {
      if (!record?.participantId) throw new Error("participantId required");
      participants.set(record.participantId, structuredClone(record));
      return structuredClone(record);
    },
    listStewardship(participantId) {
      return stewardship.filter(x => !participantId || x.participantId === participantId).map(structuredClone);
    },
    addStewardship(entry) {
      if (!entry?.entryId || !entry?.participantId) throw new Error("entryId and participantId required");
      stewardship.push(structuredClone(entry));
      return structuredClone(entry);
    },
    latestReconciliation() {
      return reconciliations.length ? structuredClone(reconciliations.at(-1)) : null;
    },
    addReconciliation(run) {
      reconciliations.push(structuredClone(run));
      return structuredClone(run);
    }
  };
}
