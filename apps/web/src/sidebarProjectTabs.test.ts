import { describe, expect, it } from "vite-plus/test";
import {
  projectTabMemberKeys,
  resolveProjectTabProjects,
  toggleProjectTabMember,
} from "./sidebarProjectTabs";

describe("sidebar project groups", () => {
  it("keeps membership when repository grouping splits or joins environments", () => {
    const local = {
      projectKey: "local:/repo",
      memberProjects: [{ physicalProjectKey: "local:/repo" }],
    };
    const remote = {
      projectKey: "remote:/repo",
      memberProjects: [{ physicalProjectKey: "remote:/repo" }],
    };
    const joined = {
      projectKey: "github:org/repo",
      memberProjects: [...local.memberProjects, ...remote.memberProjects],
    };
    const unrelated = {
      projectKey: "other:/repo",
      memberProjects: [{ physicalProjectKey: "other:/repo" }],
    };
    const group = { id: "work", name: "Work", projectKeys: projectTabMemberKeys(joined) };

    expect(resolveProjectTabProjects([local, remote, unrelated], group)).toEqual([local, remote]);
    expect(
      resolveProjectTabProjects([joined, unrelated], {
        ...group,
        projectKeys: projectTabMemberKeys(local),
      }),
    ).toEqual([joined]);
    expect(
      resolveProjectTabProjects([remote, unrelated], {
        ...group,
        projectKeys: projectTabMemberKeys(local),
      }),
    ).toEqual([]);
    const withoutLocal = toggleProjectTabMember(group.projectKeys, local, false);
    const withoutEither = toggleProjectTabMember(withoutLocal, remote, false);
    expect(resolveProjectTabProjects([joined], { ...group, projectKeys: withoutEither })).toEqual(
      [],
    );
  });

  it("preserves unavailable members while changing the visible selection", () => {
    const project = {
      projectKey: "github:org/repo",
      memberProjects: [
        { physicalProjectKey: "local:/repo" },
        { physicalProjectKey: "remote:/repo" },
      ],
    };
    const original = ["offline:/other", ...projectTabMemberKeys(project)];
    const removed = toggleProjectTabMember(original, project, false);
    expect(removed).toEqual(["offline:/other"]);
    expect(toggleProjectTabMember(removed, project, true)).toEqual(original);
    expect(toggleProjectTabMember(original, project, true)).toEqual(original);
    expect(
      resolveProjectTabProjects([project], { id: "empty", name: "Empty", projectKeys: [] }),
    ).toEqual([]);
  });
});
