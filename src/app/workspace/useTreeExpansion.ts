import type { Dispatch, SetStateAction } from "react";

export function useTreeExpansion({
  setTreeOpenNodeIds,
}: {
  setTreeOpenNodeIds: Dispatch<SetStateAction<Set<string>>>;
}) {
  function toggleTreeNode(nodeId: string) {
    setTreeOpenNodeIds((openIds) => {
      const nextOpenIds = new Set(openIds);

      if (nextOpenIds.has(nodeId)) {
        nextOpenIds.delete(nodeId);
      } else {
        nextOpenIds.add(nodeId);
      }

      return nextOpenIds;
    });
  }

  function openTreeNodePath(nodeIds: string[]) {
    setTreeOpenNodeIds((openIds) => {
      let changed = false;
      const nextOpenIds = new Set(openIds);

      for (const nodeId of nodeIds) {
        if (!nextOpenIds.has(nodeId)) {
          nextOpenIds.add(nodeId);
          changed = true;
        }
      }

      return changed ? nextOpenIds : openIds;
    });
  }

  return {
    openTreeNodePath,
    toggleTreeNode,
  };
}
