import {
  IsoDateTime,
  MessageId,
  type OrchestrationV2ThreadLink,
  type OrchestrationV2ThreadLinks,
  ThreadId,
} from "@t3tools/contracts";
import { extractExternalLinks } from "@t3tools/shared/externalLinks";
import * as NodeSqliteClient from "@t3tools/shared/nodeSqliteClient";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Schema from "effect/Schema";
import * as SqlClient from "effect/sql/SqlClient";
import * as SqlSchema from "effect/sql/SqlSchema";

class ThreadLinksError extends Schema.TaggedError<ThreadLinksError>()("ThreadLinksError", {
  cause: Schema.Defect(),
}) {
  override get message(): string {
    return "Could not read this thread's links.";
  }
}

export class ThreadLinks extends Context.Service<
  ThreadLinks,
  {
    readonly list: (
      threadId: ThreadId,
    ) => Effect.Effect<OrchestrationV2ThreadLinks, ThreadLinksError>;
  }
>()("t3/orchestration-v2/ThreadLinks") {}

// The card lists a handful; a thread that pasted more keeps its newest.
const LINK_LIMIT = 30;
// Caps the read for threads with very long histories of pasted links.
const MESSAGE_LIMIT = 500;

const LinkMessageRow = Schema.Struct({
  messageId: MessageId,
  sentAt: IsoDateTime,
  text: Schema.String,
});

/** @public */
export const make = Effect.gen(function* () {
  const sql = yield* SqlClient.SqlClient;

  // Agent notices and wakes also use the user role; only what the user wrote counts.
  const linkMessages = SqlSchema.findAll({
    Request: Schema.Struct({ threadId: ThreadId }),
    Result: LinkMessageRow,
    execute: ({ threadId }) => sql`
      SELECT
        messages.message_id AS "messageId",
        messages.created_at AS "sentAt",
        json_extract(messages.payload_json, '$.text') AS text
      FROM orchestration_v2_projection_messages AS messages
      WHERE messages.thread_id = ${threadId}
        AND messages.role = 'user'
        AND COALESCE(json_extract(messages.payload_json, '$.createdBy'), 'user') = 'user'
        AND instr(json_extract(messages.payload_json, '$.text'), '://') > 0
      ORDER BY messages.created_at DESC, messages.message_id DESC
      LIMIT ${MESSAGE_LIMIT}
    `,
  });

  const list = Effect.fn("ThreadLinks.list")(function* (threadId: ThreadId) {
    const rows = yield* linkMessages({ threadId }).pipe(
      NodeSqliteClient.readOnly,
      Effect.mapError((cause) => new ThreadLinksError({ cause })),
    );
    const links = new Map<string, OrchestrationV2ThreadLink>();
    for (const row of rows) {
      for (const url of extractExternalLinks(row.text)) {
        if (links.size >= LINK_LIMIT) return { links: [...links.values()] };
        if (!links.has(url)) links.set(url, { url, messageId: row.messageId, sentAt: row.sentAt });
      }
    }
    return { links: [...links.values()] };
  });

  return ThreadLinks.of({ list });
});

export const layer = Layer.effect(ThreadLinks, make);
