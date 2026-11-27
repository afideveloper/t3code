import * as Schema from "effect/Schema";

export const SidebarProjectTab = Schema.Struct({
  id: Schema.String,
  name: Schema.String,
  projectKeys: Schema.Array(Schema.String),
});
export type SidebarProjectTab = typeof SidebarProjectTab.Type;

export const SidebarProjectTabsState = Schema.Struct({
  groups: Schema.Array(SidebarProjectTab),
  activeGroupId: Schema.NullOr(Schema.String),
});
export const EMPTY_PROJECT_TABS: typeof SidebarProjectTabsState.Type = {
  groups: [],
  activeGroupId: null,
};

interface TabProject {
  readonly memberProjects: readonly { readonly physicalProjectKey: string }[];
}

export function projectTabMemberKeys(project: TabProject): string[] {
  return project.memberProjects.map((member) => member.physicalProjectKey);
}

export function resolveProjectTabProjects<T extends TabProject>(
  projects: readonly T[],
  group: SidebarProjectTab,
): T[] {
  const keys = new Set(group.projectKeys);
  return projects.filter((project) => projectTabMemberKeys(project).some((key) => keys.has(key)));
}

export function toggleProjectTabMember(
  keys: readonly string[],
  project: TabProject,
  checked: boolean,
): string[] {
  const memberKeys = new Set(projectTabMemberKeys(project));
  return checked
    ? [...new Set([...keys, ...memberKeys])]
    : keys.filter((key) => !memberKeys.has(key));
}
