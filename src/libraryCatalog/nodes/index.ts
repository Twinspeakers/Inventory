import type { LibraryNodeTemplate } from "../types";
import { generatedLibraryNodeTemplates } from "./generatedNodeTemplates";
import { createVirtualLibraryRootNode } from "./virtualNodes";

const generatedTopLevelTemplates = generatedLibraryNodeTemplates.filter((template) => {
  const path = template.id.replace(/^tag:/, "");
  return path.split("/").length === 1;
});

const virtualLibraryNodeTemplates = [createVirtualLibraryRootNode(generatedTopLevelTemplates)];

export const allLibraryNodeTemplates: LibraryNodeTemplate[] = virtualLibraryNodeTemplates.concat(generatedLibraryNodeTemplates);

export const libraryNodeTemplates: LibraryNodeTemplate[] = allLibraryNodeTemplates;
