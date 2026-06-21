import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { ambiguousSenseRules, safeCrossDomainCollisionTerms } from "./tagAmbiguity";

type CollisionEntry = {
  domain: string;
  id: string;
};

describe("tag ambiguity audit", () => {
  it("classifies every current cross-domain collision as ambiguous or intentionally safe", () => {
    const collisions = collectCrossDomainCollisionTerms();
    const ambiguousTerms = new Set(ambiguousSenseRules.flatMap((rule) => rule.triggerTerms));
    const unclassifiedCollisions = [...collisions.keys()].filter(
      (term) => !ambiguousTerms.has(term) && !safeCrossDomainCollisionTerms.has(term),
    );

    expect(unclassifiedCollisions).toEqual([]);
  });
});

function collectCrossDomainCollisionTerms() {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const tagRoot = path.resolve(currentDirectory, "../tags");
  const entriesByTerm = new Map<string, CollisionEntry[]>();

  for (const filePath of walkTagFiles(tagRoot)) {
    const fileText = fs.readFileSync(filePath, "utf8");
    const relativePath = path.relative(tagRoot, filePath).replace(/\\/g, "/");
    const domain = relativePath.split("/")[0] ?? "";

    for (const definition of parseTagDefinitions(fileText)) {
      for (const value of [definition.label, ...definition.aliases]) {
        const normalized = normalizeCollisionTerm(value);

        if (!normalized) {
          continue;
        }

        const entries = entriesByTerm.get(normalized) ?? [];
        entries.push({ domain, id: definition.id });
        entriesByTerm.set(normalized, entries);
      }
    }
  }

  return new Map(
    [...entriesByTerm.entries()].filter(([, entries]) => {
      const uniqueIds = new Set(entries.map((entry) => entry.id));
      const uniqueDomains = new Set(entries.map((entry) => entry.domain));
      return uniqueIds.size > 1 && uniqueDomains.size > 1;
    }),
  );
}

function walkTagFiles(root: string) {
  const files: string[] = [];
  const pending = [root];

  while (pending.length > 0) {
    const currentPath = pending.pop() ?? "";

    for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        pending.push(entryPath);
        continue;
      }

      if (entry.isFile() && entryPath.endsWith(".ts")) {
        files.push(entryPath);
      }
    }
  }

  return files;
}

function parseTagDefinitions(fileText: string) {
  const definitions: Array<{ aliases: string[]; id: string; label: string }> = [];
  const tagPattern = /tag\(\s*"([^"]+)"\s*,\s*\{([\s\S]*?)\}\s*\)/g;

  for (const match of fileText.matchAll(tagPattern)) {
    const id = match[1] ?? "";
    const body = match[2] ?? "";
    const label = body.match(/label:\s*"([^"]+)"/)?.[1] ?? "";
    const aliasBlock = body.match(/aliases:\s*\[([\s\S]*?)\]/)?.[1] ?? "";
    const aliases = [...aliasBlock.matchAll(/"([^"]+)"/g)].map((aliasMatch) => aliasMatch[1] ?? "");

    definitions.push({ aliases, id, label });
  }

  return definitions;
}

function normalizeCollisionTerm(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
