import { Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface OpenFile {
  id: string;
  name: string;
  path?: string;
  content: string;
  /** Set when file is from workspace; used for save. */
  fileHandle?: FileSystemFileHandle;
  /** Desktop mode — relative path under workspace root */
  relPath?: string;
  /** True when content has changed since last save. */
  dirty?: boolean;
}

interface EditorTabsProps {
  files: OpenFile[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  /** Save active file (Ctrl+S). */
  onSave?: () => void;
  /** True when the active file has unsaved changes. */
  canSave?: boolean;
}

const EditorTabs = ({ files, activeId, onSelect, onClose, onSave, canSave }: EditorTabsProps) => {
  if (files.length === 0) {
    return (
      <div className="flex h-8 items-center border-b border-cursor-border bg-cursor-sidebar px-2">
        <span className="text-[11px] text-cursor-text-muted">No file open</span>
      </div>
    );
  }

  return (
    <div className="flex h-8 shrink-0 items-center border-b border-cursor-border bg-cursor-sidebar">
      <div className="flex min-w-0 flex-1 items-center gap-px overflow-x-auto">
        {files.map((file) => (
          <div
            key={file.id}
            role="tab"
            aria-selected={activeId === file.id}
            className={cn(
              "flex h-full cursor-pointer items-center gap-1.5 border-r border-cursor-border/80 px-2.5 text-[11px] transition-colors duration-fast",
              activeId === file.id
                ? "bg-cursor-editor text-cursor-text"
                : "bg-cursor-hover/80 text-cursor-text-muted hover:bg-cursor-border hover:text-cursor-text"
            )}
            onClick={() => onSelect(file.id)}
          >
            <span className="truncate max-w-[120px]">
              {file.name}
              {file.dirty && <span className="ml-1 text-orange-500">●</span>}
            </span>
            <button
              type="button"
              className="rounded-sm p-0.5 transition-colors duration-fast hover:bg-cursor-border"
              onClick={(e) => {
                e.stopPropagation();
                onClose(file.id);
              }}
              aria-label={`Close ${file.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
      {onSave && (
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          title="Save (Ctrl+S)"
          aria-label="Save file"
          className={cn(
            "mr-1 flex h-6 shrink-0 items-center gap-1 rounded px-2 text-[11px] transition-colors duration-fast",
            canSave
              ? "text-cursor-accent hover:bg-cursor-border"
              : "cursor-default text-cursor-text-muted/50"
          )}
        >
          <Save className="h-3 w-3" />
          Save
        </button>
      )}
    </div>
  );
};

export default EditorTabs;
