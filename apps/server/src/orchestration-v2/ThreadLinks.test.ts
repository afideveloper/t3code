import { assert, it } from "@effect/vitest";
import {
  EventId,
  MessageId,
  ProjectId,
  ProviderInstanceId,
  ThreadId,
  type OrchestrationV2DomainEvent,
} from "@t3tools/contracts";
import * as DateTime from "effect/DateTime";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

import * as SqlitePersistence from "../persistence/Sqlite.ts";
import * as ProjectionStore from "./ProjectionStore.ts";
import * as ProjectStore from "./ProjectStore.ts";
import * as ThreadLinks from "./ThreadLinks.ts";

const layerTest = Layer.mergeAll(ThreadLinks.layer, ProjectionStore.layer, ProjectStore.layer).pipe(
  Layer.provideMerge(SqlitePersistence.layerMemory),
);

const providerInstanceId = ProviderInstanceId.make("codex");
const projectId = ProjectId.make("project");
const at = (minute: number) => DateTime.makeUnsafe(Date.UTC(2026, 8, 27, 0, minute));

const createProject = Effect.flatMap(ProjectStore.ProjectStoreV2, (projects) =>
  projects.apply({
    sequence: 0,
    eventId: EventId.make(`created:${projectId}`),
    aggregateKind: "project",
    aggregateId: projectId,
    occurredAt: DateTime.formatIso(at(0)),
    commandId: null,
    causationEventId: null,
    correlationId: null,
    metadata: {},
    type: "project.created",
    payload: {
      projectId,
      title: projectId,
      workspaceRoot: `/work/${projectId}`,
      defaultModelSelection: null,
      scripts: [],
      createdAt: DateTime.formatIso(at(0)),
      updatedAt: DateTime.formatIso(at(0)),
    },
  }),
);

const thread = (threadId: ThreadId): OrchestrationV2DomainEvent => ({
  id: EventId.make(`created:${threadId}`),
  type: "thread.created",
  threadId,
  providerInstanceId,
  occurredAt: at(0),
  payload: {
    createdBy: "user",
    creationSource: "web",
    id: threadId,
    projectId,
    title: threadId,
    providerInstanceId,
    modelSelection: { instanceId: providerInstanceId, model: "gpt-5" },
    runtimeMode: "full-access",
    interactionMode: "default",
    branch: null,
    worktreePath: null,
    activeProviderThreadId: null,
    lineage: { parentThreadId: null, relationshipToParent: null, rootThreadId: threadId },
    forkedFrom: null,
    createdAt: at(0),
    updatedAt: at(0),
    archivedAt: null,
    settledOverride: null,
    settledAt: null,
    lastVisitedAt: null,
    deletedAt: null,
  },
});

const message = (
  threadId: ThreadId,
  id: string,
  text: string,
  minute: number,
  author: { readonly role?: "user" | "assistant"; readonly createdBy?: "user" | "agent" } = {},
): OrchestrationV2DomainEvent => ({
  id: EventId.make(`message:${id}`),
  type: "message.updated",
  threadId,
  providerInstanceId,
  occurredAt: at(minute),
  payload: {
    createdBy: author.createdBy ?? (author.role === "assistant" ? "agent" : "user"),
    creationSource: author.role === "assistant" ? "provider" : "web",
    id: MessageId.make(id),
    threadId,
    runId: null,
    nodeId: null,
    role: author.role ?? "user",
    text,
    attachments: [],
    streaming: false,
    createdAt: at(minute),
    updatedAt: at(minute),
  },
});

it.effect("ThreadLinks lists links the user wrote in this thread, newest message first", () =>
  Effect.gen(function* () {
    const projections = yield* ProjectionStore.ProjectionStoreV2;
    const links = yield* ThreadLinks.ThreadLinks;
    const threadId = ThreadId.make("thread:links");
    const otherThreadId = ThreadId.make("thread:other");
    const slack = "https://acme.slack.com/archives/C01/p100";
    const jira = "https://acme.atlassian.net/browse/MGR-1";
    yield* createProject;
    yield* Effect.forEach(
      [
        thread(threadId),
        thread(otherThreadId),
        message(threadId, "first", `See ${slack}`, 1),
        message(threadId, "reply", "Docs: https://docs.example.com/guide", 2, {
          role: "assistant",
        }),
        message(threadId, "notice", "Woke for https://ci.example.com/run/1", 3, {
          createdBy: "agent",
        }),
        message(threadId, "local", "Running on http://localhost:3000", 4),
        message(threadId, "latest", `${slack} again, and ${jira}`, 5),
        message(otherThreadId, "elsewhere", "https://example.com/other", 6),
      ],
      projections.apply,
      { discard: true },
    );

    const result = yield* links.list(threadId);

    assert.deepEqual(
      result.links.map((link) => [link.url, link.messageId]),
      [
        [slack, MessageId.make("latest")],
        [jira, MessageId.make("latest")],
      ],
    );
  }).pipe(Effect.provide(layerTest)),
);
