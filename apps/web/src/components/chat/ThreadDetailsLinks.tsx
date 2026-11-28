import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { externalLinkLabel } from "@t3tools/shared/externalLinks";
import { LinkIcon } from "lucide-react";
import { useState } from "react";

import { orchestrationEnvironment } from "../../state/orchestration";
import { useEnvironmentQuery } from "../../state/query";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { ThreadDetailsControl } from "./ThreadDetailsControl";
import { ThreadDetailsSection } from "./ThreadDetailsSection";
import { THREAD_DETAILS_PANEL_ICON_CLASS } from "./threadDetailsPanelStyles";

const COLLAPSED_COUNT = 5;

/** Web links the user wrote in this thread, newest first. Hidden while there are none. */
export function ThreadDetailsLinks(props: {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
}) {
  const [expanded, setExpanded] = useState(false);
  const links =
    useEnvironmentQuery(
      orchestrationEnvironment.threadLinks({
        environmentId: props.environmentId,
        input: { threadId: props.threadId },
      }),
    ).data?.links ?? [];
  if (links.length === 0) return null;
  const shown = expanded ? links : links.slice(0, COLLAPSED_COUNT);

  return (
    <ThreadDetailsSection headingId="thread-details-links-heading" title="Links">
      <ul className="m-0 list-none p-0">
        {shown.map((link) => {
          const label = externalLinkLabel(link.url);
          return (
            <li key={link.url} className="flex items-center rounded-lg">
              <Tooltip>
                <TooltipTrigger
                  delay={200}
                  render={
                    <ThreadDetailsControl
                      size="sm"
                      variant="ghost"
                      part="row"
                      multiline
                      render={<a href={link.url} target="_blank" rel="noopener noreferrer" />}
                    />
                  }
                >
                  <LinkIcon aria-hidden className={THREAD_DETAILS_PANEL_ICON_CLASS} />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-sm font-medium leading-4 text-foreground/85">
                      {label.site}
                    </span>
                    {label.detail ? (
                      <span className="truncate text-2xs font-normal leading-4 text-muted-foreground">
                        {label.detail}
                      </span>
                    ) : null}
                  </span>
                </TooltipTrigger>
                <TooltipPopup side="left">
                  <span className="block max-w-80 break-all">{link.url}</span>
                </TooltipPopup>
              </Tooltip>
            </li>
          );
        })}
      </ul>
      {links.length > COLLAPSED_COUNT ? (
        <ThreadDetailsControl
          size="xs"
          variant="ghost"
          part="row"
          tone="muted"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show fewer" : `Show all ${links.length}`}
        </ThreadDetailsControl>
      ) : null}
    </ThreadDetailsSection>
  );
}
