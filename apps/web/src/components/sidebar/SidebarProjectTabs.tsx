import { PencilIcon, PlusIcon } from "lucide-react";
import { useId, useState } from "react";
import type { SidebarProjectSnapshot } from "~/sidebarProjectGrouping";
import {
  projectTabMemberKeys,
  resolveProjectTabProjects,
  toggleProjectTabMember,
  type SidebarProjectTab,
} from "~/sidebarProjectTabs";
import { cn, randomUUID } from "~/lib/utils";
import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Tooltip, TooltipPopup, TooltipTrigger } from "../ui/tooltip";
import { SidebarHeaderIconButton } from "./SidebarThreadHeader";

export function SidebarProjectTabs({
  groups,
  activeGroupId,
  hasProjectFilter,
  projects,
  selectedProjectKeys,
  onSelect,
  onSave,
  onDelete,
}: {
  groups: readonly SidebarProjectTab[];
  activeGroupId: string | null;
  hasProjectFilter: boolean;
  projects: readonly SidebarProjectSnapshot[];
  selectedProjectKeys: readonly string[];
  onSelect: (id: string | null) => void;
  onSave: (group: SidebarProjectTab) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState<SidebarProjectTab | null>(null);
  const activeGroup = groups.find((group) => group.id === activeGroupId);
  const options = [{ id: null, name: "All" }, ...groups];

  return (
    <>
      <div className="flex min-w-0 items-center gap-1 px-1 pb-1 pt-2">
        <div
          role="group"
          aria-label="Project groups"
          className="flex min-w-0 flex-1 gap-1 overflow-x-auto"
        >
          {options.map((group) => (
            <Tooltip key={group.id ?? "all"}>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    aria-pressed={
                      group.id === activeGroupId && (group.id !== null || !hasProjectFilter)
                    }
                    className={cn(
                      "max-w-32 shrink-0 truncate rounded-md px-2.5 py-1.5 text-xs font-medium outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
                      group.id === activeGroupId && (group.id !== null || !hasProjectFilter)
                        ? "bg-sidebar-row-selected text-sidebar-foreground"
                        : "text-sidebar-muted-foreground hover:bg-sidebar-row-hover hover:text-sidebar-foreground",
                    )}
                    onClick={() => onSelect(group.id)}
                  />
                }
              >
                {group.name}
              </TooltipTrigger>
              <TooltipPopup>{group.name}</TooltipPopup>
            </Tooltip>
          ))}
        </div>
        {activeGroup ? (
          <SidebarHeaderIconButton
            label={`Edit project group: ${activeGroup.name}`}
            onClick={() => setEditing(activeGroup)}
          >
            <PencilIcon />
          </SidebarHeaderIconButton>
        ) : null}
        <SidebarHeaderIconButton
          label="New project group"
          onClick={() =>
            setEditing({
              id: randomUUID(),
              name: "",
              projectKeys: projects
                .filter((project) => selectedProjectKeys.includes(project.projectKey))
                .flatMap(projectTabMemberKeys),
            })
          }
        >
          <PlusIcon />
        </SidebarHeaderIconButton>
      </div>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        {editing ? (
          <ProjectGroupEditor
            key={editing.id}
            group={editing}
            existing={groups.some((group) => group.id === editing.id)}
            groups={groups}
            projects={projects}
            onSave={(group) => {
              onSave(group);
              setEditing(null);
            }}
            onDelete={() => {
              onDelete(editing.id);
              setEditing(null);
            }}
            onCancel={() => setEditing(null)}
          />
        ) : null}
      </Dialog>
    </>
  );
}

function ProjectGroupEditor({
  group,
  existing,
  groups,
  projects,
  onSave,
  onDelete,
  onCancel,
}: {
  group: SidebarProjectTab;
  existing: boolean;
  groups: readonly SidebarProjectTab[];
  projects: readonly SidebarProjectSnapshot[];
  onSave: (group: SidebarProjectTab) => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const nameId = useId();
  const [name, setName] = useState(group.name);
  const [projectKeys, setProjectKeys] = useState(group.projectKeys);
  const [query, setQuery] = useState("");
  const selectedProjects = resolveProjectTabProjects(projects, { ...group, projectKeys });
  const selectedKeys = new Set(selectedProjects.map((project) => project.projectKey));
  const duplicateName = groups.some(
    (candidate) =>
      candidate.id !== group.id &&
      candidate.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
  );
  const filteredProjects = projects.filter((project) =>
    project.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  return (
    <DialogPopup>
      <form
        className="flex min-h-0 flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim() || duplicateName) return;
          onSave({ ...group, name: name.trim(), projectKeys });
        }}
      >
        <DialogHeader>
          <DialogTitle>{existing ? "Edit project group" : "New project group"}</DialogTitle>
          <DialogDescription>
            Choose the projects to show together in a sidebar tab. Groups are saved in this browser
            or desktop app.
          </DialogDescription>
        </DialogHeader>
        <DialogPanel>
          <div className="space-y-2">
            <label htmlFor={nameId} className="text-sm font-medium">
              Group name
            </label>
            <Input
              id={nameId}
              autoFocus
              value={name}
              maxLength={48}
              placeholder="e.g. Mengantar"
              aria-invalid={duplicateName}
              onValueChange={setName}
            />
            {duplicateName ? (
              <p role="alert" className="text-xs text-destructive">
                A group with this name already exists.
              </p>
            ) : null}
          </div>
          <Input
            type="search"
            aria-label="Search group projects"
            placeholder="Search projects…"
            value={query}
            onValueChange={setQuery}
          />
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {filteredProjects.map((project) => (
              <label
                key={project.projectKey}
                className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted"
              >
                <Checkbox
                  checked={selectedKeys.has(project.projectKey)}
                  onCheckedChange={(checked) =>
                    setProjectKeys((keys) => toggleProjectTabMember(keys, project, checked))
                  }
                />
                <span className="min-w-0 break-words text-sm">{project.displayName}</span>
              </label>
            ))}
            {filteredProjects.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No projects found.</p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {selectedProjects.length} projects selected
            </p>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              disabled={projectKeys.length === 0}
              onClick={() => setProjectKeys([])}
            >
              Clear selection
            </Button>
          </div>
        </DialogPanel>
        <DialogFooter>
          {existing ? (
            <Button type="button" variant="destructive-outline" onClick={onDelete}>
              Delete group
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={!name.trim() || duplicateName}>
            Save group
          </Button>
        </DialogFooter>
      </form>
    </DialogPopup>
  );
}
