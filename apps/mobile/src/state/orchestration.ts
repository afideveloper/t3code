import { createOrchestrationEnvironmentAtoms } from "@t3tools/client-runtime/state/orchestration";

import { connectionAtomRuntime } from "../connection/runtime";
import { recordReviewTurnDiffAnswer } from "./reviewTurnDiffs";
import { environmentThreadShells } from "./threads";

export const orchestrationEnvironment = createOrchestrationEnvironmentAtoms(connectionAtomRuntime, {
  onCheckpointDiffAnswer: recordReviewTurnDiffAnswer,
  latestUserMessageAtAtom: environmentThreadShells.latestUserAuthoredMessageAtAtom,
});
