/**
 * Outline/symbols for Go to Symbol (Ctrl+Shift+O). Uses Acorn for JS/TS-like files.
 */

import * as acorn from "acorn";

export type SymbolKind = "function" | "class" | "variable";

export interface SymbolEntry {
  name: string;
  kind: SymbolKind;
  line: number;
}

const JS_EXT = new Set([".js", ".mjs", ".cjs", ".jsx"]);

function hasJSExt(path: string): boolean {
  const i = path.lastIndexOf(".");
  return i >= 0 && JS_EXT.has(path.slice(i).toLowerCase());
}

function getLineFromNode(node: acorn.Node): number {
  const loc = (node as acorn.Node & { loc?: { start: { line: number } } }).loc;
  return loc?.start?.line ?? 1;
}

function getNameFromNode(node: acorn.Node): string | null {
  const n = node as acorn.Node & { id?: { name: string }; key?: { name: string }; name?: string };
  if (n.id && "name" in n.id) return n.id.name;
  if (n.key && "name" in n.key) return n.key.name;
  if (n.name) return n.name;
  return null;
}

/**
 * Extract top-level symbols (functions, classes, exported/const declarations) for outline.
 * Returns empty array for non-JS or on parse error.
 */
export function getSymbols(path: string, content: string): SymbolEntry[] {
  if (!hasJSExt(path)) return [];

  try {
    const ast = acorn.parse(content, {
      ecmaVersion: "latest",
      sourceType: "module",
      locations: true,
      allowHashBang: true,
      allowAwaitOutsideFunction: true,
    }) as acorn.Node & { body?: acorn.Node[] };

    const symbols: SymbolEntry[] = [];
    const body = ast.body;
    if (!Array.isArray(body)) return symbols;

    for (const node of body) {
      const line = getLineFromNode(node);
      const type = node.type as string;

      if (type === "FunctionDeclaration") {
        const name = getNameFromNode(node);
        if (name) symbols.push({ name, kind: "function", line });
        continue;
      }
      if (type === "ClassDeclaration") {
        const name = getNameFromNode(node);
        if (name) symbols.push({ name, kind: "class", line });
        continue;
      }
      if (type === "VariableDeclaration") {
        const decl = node as acorn.Node & { declarations: acorn.Node[] };
        for (const d of decl.declarations || []) {
          const id = (d as acorn.Node & { id: acorn.Node }).id;
          const name = id && "name" in id ? (id as { name: string }).name : null;
          if (name) symbols.push({ name, kind: "variable", line: getLineFromNode(d) });
        }
        continue;
      }
      if (type === "ExportNamedDeclaration" || type === "ExportDefaultDeclaration") {
        const decl = node as acorn.Node & { declaration?: acorn.Node };
        const inner = decl.declaration;
        if (!inner) continue;
        const innerType = inner.type as string;
        if (innerType === "FunctionDeclaration" || innerType === "ClassDeclaration") {
          const name = getNameFromNode(inner);
          if (name) symbols.push({ name, kind: innerType === "ClassDeclaration" ? "class" : "function", line: getLineFromNode(inner) });
        }
        if (innerType === "VariableDeclaration") {
          const v = inner as acorn.Node & { declarations: acorn.Node[] };
          for (const d of v.declarations || []) {
            const id = (d as acorn.Node & { id: acorn.Node }).id;
            const name = id && "name" in id ? (id as { name: string }).name : null;
            if (name) symbols.push({ name, kind: "variable", line: getLineFromNode(d) });
          }
        }
      }
    }

    return symbols;
  } catch {
    return [];
  }
}
