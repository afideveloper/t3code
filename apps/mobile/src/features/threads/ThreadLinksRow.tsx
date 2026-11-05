import type { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { externalLinkLabel } from "@t3tools/shared/externalLinks";
import { Pressable, ScrollView, View } from "react-native";

import { AppText as Text } from "../../components/ui/AppText";
import { SymbolView } from "../../components/ui/AppSymbol";
import { tryOpenExternalUrl } from "../../lib/openExternalUrl";
import { orchestrationEnvironment } from "../../state/orchestration";
import { useEnvironmentQuery } from "../../state/query";

/** Web links the user wrote in this thread, newest first, such as the Slack thread it came from. */
export function ThreadLinksRow(props: {
  readonly environmentId: EnvironmentId;
  readonly threadId: ThreadId;
}) {
  const links =
    useEnvironmentQuery(
      orchestrationEnvironment.threadLinks({
        environmentId: props.environmentId,
        input: { threadId: props.threadId },
      }),
    ).data?.links ?? [];
  if (links.length === 0) return null;
  return (
    <View className="flex-row items-center gap-2 pb-2 pl-4">
      <SymbolView name="link" size={12} tintColorClassName="accent-foreground-muted" />
      <Text className="text-xs text-foreground-muted">Links</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-1">
        <View className="flex-row gap-1 pr-4">
          {links.map((link) => {
            const label = externalLinkLabel(link.url);
            const text = label.detail ? `${label.site} · ${label.detail}` : label.site;
            return (
              <Pressable
                key={link.url}
                accessibilityRole="link"
                accessibilityLabel={`Open ${text}`}
                className="max-w-48 flex-row items-center rounded-full bg-subtle px-2.5 py-1"
                onPress={() => void tryOpenExternalUrl(link.url, "thread-link")}
              >
                <Text className="shrink text-xs text-foreground" numberOfLines={1}>
                  {text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
