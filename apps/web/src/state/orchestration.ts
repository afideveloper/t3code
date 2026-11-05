import { createOrchestrationEnvironmentAtoms } from "@t3tools/client-runtime/state/orchestration";

import { connectionAtomRuntime } from "../connection/runtime";
import { environmentThreadShells } from "./threads";

export const orchestrationEnvironment = createOrchestrationEnvironmentAtoms(connectionAtomRuntime, {
  latestUserMessageAtAtom: environmentThreadShells.latestUserAuthoredMessageAtAtom,
});
