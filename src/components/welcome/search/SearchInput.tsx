import { forwardRef, useImperativeHandle, useRef } from "react";
import { Search } from "lucide-react";

export interface SearchInputHandle {
  focus: () => void;
}

interface SearchInputProps {
  /** When user focuses or presses Enter, open Find in Files (e.g. call showSearch). */
  onOpenSearch?: () => void;
}

const SearchInput = forwardRef<SearchInputHandle, SearchInputProps>(
  function SearchInput({ onOpenSearch }, ref) {
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
    }));

    const handleFocus = () => onOpenSearch?.();
    const handleClick = () => onOpenSearch?.();
    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onOpenSearch?.();
      }
    };

    return (
      <div className="flex h-6 items-center gap-1.5 rounded border border-cursor-border/60 bg-cursor-editor/80 px-2 text-[11px] text-cursor-text-muted transition-colors duration-fast hover:border-cursor-border hover:bg-cursor-editor focus-within:border-cursor-border focus-within:bg-cursor-editor focus-within:ring-1 focus-within:ring-cursor-border">
        <Search className="h-3 w-3 shrink-0 opacity-70" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search files..."
          className="w-36 border-none bg-transparent text-cursor-text placeholder:text-cursor-text-muted focus:outline-none focus:ring-0"
          aria-label="Search files"
          onFocus={handleFocus}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
        />
      </div>
    );
  }
);

export default SearchInput;
