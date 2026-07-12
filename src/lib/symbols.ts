/**
 * Outline/symbols for Go to Symbol (Ctrl+Shift+O).
 * Uses TypeScript AST for JS/TS (including interfaces & types).
 */

import ts from "typescript";
import { extensionOf } from "@/lib/language";

export type SymbolKind = "function" | "class" | "variable" | "interface" | "type";

export interface SymbolEntry {
  name: string;
  kind: SymbolKind;
  line: number;
}

const TS_JS_EXT = new Set([
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

function scriptKindForPath(path: string): ts.ScriptKind {
  const ext = extensionOf(path);
  if (ext === ".tsx") return ts.ScriptKind.TSX;
  if (ext === ".jsx") return ts.ScriptKind.JSX;
  if (ext === ".ts" || ext === ".mts" || ext === ".cts") return ts.ScriptKind.TS;
  return ts.ScriptKind.JS;
}

function lineOf(node: ts.Node, sf: ts.SourceFile): number {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
}

function pushVarNames(
  decl: ts.VariableDeclarationList,
  sf: ts.SourceFile,
  out: SymbolEntry[]
) {
  for (const d of decl.declarations) {
    if (ts.isIdentifier(d.name)) {
      out.push({ name: d.name.text, kind: "variable", line: lineOf(d, sf) });
    }
  }
}

/**
 * Extract top-level symbols for outline. Empty for non-JS/TS or on error.
 */
export function getSymbols(path: string, content: string): SymbolEntry[] {
  if (!TS_JS_EXT.has(extensionOf(path))) return [];

  const fileName = path.replace(/\\/g, "/").split("/").pop() || "file.ts";
  try {
    const sf = ts.createSourceFile(
      fileName,
      content,
      ts.ScriptTarget.Latest,
      true,
      scriptKindForPath(path)
    );
    const symbols: SymbolEntry[] = [];

    const visit = (node: ts.Node) => {
      if (ts.isFunctionDeclaration(node) && node.name) {
        symbols.push({ name: node.name.text, kind: "function", line: lineOf(node, sf) });
        return;
      }
      if (ts.isClassDeclaration(node) && node.name) {
        symbols.push({ name: node.name.text, kind: "class", line: lineOf(node, sf) });
        return;
      }
      if (ts.isInterfaceDeclaration(node)) {
        symbols.push({ name: node.name.text, kind: "interface", line: lineOf(node, sf) });
        return;
      }
      if (ts.isTypeAliasDeclaration(node)) {
        symbols.push({ name: node.name.text, kind: "type", line: lineOf(node, sf) });
        return;
      }
      if (ts.isVariableStatement(node)) {
        pushVarNames(node.declarationList, sf, symbols);
        return;
      }
      if (ts.isExportAssignment(node)) return;
      if (ts.isExportDeclaration(node)) return;
    };

    for (const stmt of sf.statements) {
      if (ts.isExportDeclaration(stmt) || ts.isImportDeclaration(stmt)) continue;
      if (
        ts.isFunctionDeclaration(stmt) ||
        ts.isClassDeclaration(stmt) ||
        ts.isInterfaceDeclaration(stmt) ||
        ts.isTypeAliasDeclaration(stmt) ||
        ts.isVariableStatement(stmt)
      ) {
        visit(stmt);
        continue;
      }
      // export default / export { } with declaration
      if (ts.isExportAssignment(stmt)) continue;
      // `export function` etc. are still FunctionDeclaration with modifiers
      visit(stmt);
    }

    return symbols;
  } catch {
    return [];
  }
}
