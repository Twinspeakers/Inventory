import { useState } from "react";
import type { NvdTextSelection } from "../document/nvdRichText";

export function useNvdA4SelectionController({
  onSelectionChange,
}: {
  onSelectionChange: (selection: NvdTextSelection) => void;
}) {
  const [activeSelection, setActiveSelection] = useState<NvdTextSelection | null>(null);
  const [bridgeFocusRequestKey, setBridgeFocusRequestKey] = useState(0);

  function handleSelectionRequest(selection: NvdTextSelection) {
    setActiveSelection(selection);
    setBridgeFocusRequestKey((value) => value + 1);
    onSelectionChange(selection);
  }

  return {
    activeSelection,
    bridgeFocusRequestKey,
    handleSelectionRequest,
  };
}
