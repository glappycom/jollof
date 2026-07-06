import { useState } from "react";
import { ChevronRight, ChevronDown, Folder, FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FileTreeNode } from "@/lib/workspace";
import { FileIcon } from "./fileIcons";

interface FileTreeProps {
  rootName: string;
  topLevelNodes: FileTreeNode[];
  expandedPaths: Set<string>;
  childCache: Record<string, FileTreeNode[]>;
  onExpandDirectory: (node: FileTreeNode) => void;
  onOpenFile: (node: FileTreeNode) => void;
  onOpenFolder: () => void;
  loadingPath: string | null;
}

function sortNodes(nodes: FileTreeNode[]): FileTreeNode[] {
  return [...nodes].sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  });
}

function TreeRow({
  node,
  level,
  isExpanded,
  isLoading,
  onExpand,
  onOpenFile,
}: {
  node: FileTreeNode;
  level: number;
  isExpanded: boolean;
  isLoading: boolean;
  onExpand: (node: FileTreeNode) => void;
  onOpenFile: (node: FileTreeNode) => void;
}) {
  const isDir = node.kind === "directory";
  const paddingLeft = 8 + level * 12;

  if (isDir) {
    return (
      <div
        role="button"
        tabIndex={0}
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded-r-sm py-0.5 pr-1.5 text-[11px] text-cursor-text transition-colors duration-fast hover:bg-cursor-hover",
          isLoading && "opacity-70"
        )}
        style={{ paddingLeft }}
        onClick={() => onExpand(node)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onExpand(node);
          }
        }}
      >
        {isExpanded ? (
          <ChevronDown className="h-3 w-3 shrink-0 text-cursor-text-muted" />
        ) : (
          <ChevronRight className="h-3 w-3 shrink-0 text-cursor-text-muted" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-cursor-text-muted" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-cursor-text-muted" />
        )}
        <span className="truncate">{node.name}</span>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className="flex cursor-pointer items-center gap-1 rounded-r-sm py-0.5 pr-1.5 text-[11px] text-cursor-text transition-colors duration-fast hover:bg-cursor-hover"
      style={{ paddingLeft: paddingLeft + 18 }}
      onClick={() => onOpenFile(node)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenFile(node);
        }
      }}
    >
      <FileIcon name={node.name} />
      <span className="truncate">{node.name}</span>
    </div>
  );
}

function TreeLevel({
  nodes,
  level,
  expandedPaths,
  childCache,
  loadingPath,
  onExpandDirectory,
  onOpenFile,
}: {
  nodes: FileTreeNode[];
  level: number;
  expandedPaths: Set<string>;
  childCache: Record<string, FileTreeNode[]>;
  loadingPath: string | null;
  onExpandDirectory: (node: FileTreeNode) => void;
  onOpenFile: (node: FileTreeNode) => void;
}) {
  const sorted = sortNodes(nodes);
  return (
    <>
      {sorted.map((node) => {
        const isExpanded = expandedPaths.has(node.path);
        const isDir = node.kind === "directory";
        const isLoading = loadingPath === node.path;
        const children = isDir && isExpanded ? childCache[node.path] : undefined;

        return (
          <div key={node.path}>
            <TreeRow
              node={node}
              level={level}
              isExpanded={isExpanded}
              isLoading={isLoading}
              onExpand={onExpandDirectory}
              onOpenFile={onOpenFile}
            />
            {isDir && isExpanded && children !== undefined && (
              <TreeLevel
                nodes={children}
                level={level + 1}
                expandedPaths={expandedPaths}
                childCache={childCache}
                loadingPath={loadingPath}
                onExpandDirectory={onExpandDirectory}
                onOpenFile={onOpenFile}
              />
            )}
          </div>
        );
      })}
    </>
  );
}

function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-cursor-border">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-1 py-1 pl-1.5 pr-2 text-left text-[11px] text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
        onClick={() => setOpen((o) => !o)}
      >
        {open ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0" />
        )}
        <span className="truncate font-medium">{title}</span>
      </button>
      {open && <div className="pb-2 pl-4 pr-2 text-xs text-cursor-text-muted">{children}</div>}
    </div>
  );
}

export default function FileTree({
  rootName,
  topLevelNodes,
  expandedPaths,
  childCache,
  onExpandDirectory,
  onOpenFile,
  onOpenFolder,
  loadingPath,
}: FileTreeProps) {
  const [rootExpanded, setRootExpanded] = useState(true);
  const displayName = rootName.toUpperCase();
  const sortedTopLevel = sortNodes(topLevelNodes);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto py-1">
        <div
          role="button"
          tabIndex={0}
          className="flex cursor-pointer items-center gap-1 rounded-r-sm py-0.5 pr-1.5 text-[11px] text-cursor-text transition-colors duration-fast hover:bg-cursor-hover"
          style={{ paddingLeft: 8 }}
          onClick={() => setRootExpanded((e) => !e)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setRootExpanded((e) => !e);
            }
          }}
        >
          {rootExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-cursor-text-muted" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-cursor-text-muted" />
          )}
          <Folder className="h-3.5 w-3.5 shrink-0 text-cursor-text-muted" />
          <span className="truncate font-medium">{displayName}</span>
        </div>
        {rootExpanded && (
          <TreeLevel
            nodes={sortedTopLevel}
            level={0}
            expandedPaths={expandedPaths}
            childCache={childCache}
            loadingPath={loadingPath}
            onExpandDirectory={onExpandDirectory}
            onOpenFile={onOpenFile}
          />
        )}
        <div className="mt-1">
          <button
            type="button"
            className="mx-1.5 rounded-sm px-1.5 py-0.5 text-[11px] text-cursor-text-muted hover:bg-cursor-hover hover:text-cursor-text"
            onClick={(e) => {
              e.stopPropagation();
              onOpenFolder();
            }}
          >
            Open different folder…
          </button>
        </div>
      </div>

      <div className="shrink-0">
        <CollapsibleSection title="OUTLINE" defaultOpen={false}>
          Document outline will appear here when a file is open.
        </CollapsibleSection>
        <CollapsibleSection title="TIMELINE" defaultOpen={false}>
          File history and changes over time.
        </CollapsibleSection>
      </div>
    </div>
  );
}
