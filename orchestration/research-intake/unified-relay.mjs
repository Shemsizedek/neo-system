import { createRelayService } from './relay-service.mjs';
import { createTaskService } from './task-service.mjs';
// Internal facade only; do not expose as HTTP without authenticated middleware.
export function createUnifiedRelay(dependencies) {
  const identity=createRelayService(dependencies);
  const tasks=createTaskService(dependencies);
  return Object.freeze({register:tasks.register,claim:tasks.claim,complete:identity.complete,enroll:identity.enroll,revoke:identity.revoke});
}
