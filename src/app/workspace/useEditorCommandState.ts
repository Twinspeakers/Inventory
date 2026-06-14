import { useEffect, useRef } from "react";
import {
  canSaveActiveEditorFile,
  EMPTY_SESSION_HISTORY,
  addSessionHistoryCommand,
  executeSaveFileCommand,
  isSaveFileShortcut,
  redoSessionHistory,
  undoSessionHistory,
  type ActiveEditorCommands,
  type EditorSaveState,
  type SessionHistory,
  type SessionHistoryCommand,
} from "../../features/editors";
import type { NvdHistoryState, PersistedOpenedNvdDocument, PersistedOpenedNvvDocument, UndoContext } from "../appTypes";
import { isEditableEventTarget } from "../workspace/workspaceState";
import type { SceneMode } from "../../features/sceneViewer";
import type { Dispatch, SetStateAction } from "react";

export function useEditorCommandState({
  activeInventoryManifestPath,
  activeNvdDocument,
  activeNvvDocument,
  hasUnsavedNvdChanges,
  libraryHistory,
  nvdHistoryState,
  nvdSaveState,
  nvvHistory,
  nvvSaveState,
  sceneMode,
  undoContext,
  redoNvd,
  saveActiveNvdDocument,
  saveActiveNvvDocument,
  setLibraryHistory,
  setNvvHistory,
  setUndoContext,
  undoNvd,
}: {
  activeInventoryManifestPath: string | undefined;
  activeNvdDocument: PersistedOpenedNvdDocument | null;
  activeNvvDocument: PersistedOpenedNvvDocument | null;
  hasUnsavedNvdChanges: boolean;
  libraryHistory: SessionHistory;
  nvdHistoryState: NvdHistoryState;
  nvdSaveState: EditorSaveState;
  nvvHistory: SessionHistory;
  nvvSaveState: EditorSaveState;
  sceneMode: SceneMode;
  undoContext: UndoContext;
  redoNvd: () => void;
  saveActiveNvdDocument: () => Promise<boolean>;
  saveActiveNvvDocument: () => Promise<boolean>;
  setLibraryHistory: Dispatch<SetStateAction<SessionHistory>>;
  setNvvHistory: Dispatch<SetStateAction<SessionHistory>>;
  setUndoContext: Dispatch<SetStateAction<UndoContext>>;
  undoNvd: () => void;
}) {
  const activeEditorCommandsRef = useRef<ActiveEditorCommands | null>(null);
  const activeEditorCommands: ActiveEditorCommands | null =
    sceneMode === "nvd-document"
      ? {
          editorId: "nvd-document",
          fileName: activeNvdDocument?.document.title ?? null,
          canSave: Boolean(activeNvdDocument),
          saveState: nvdSaveState,
          saveFile: async () => {
            await saveActiveNvdDocument();
          },
        }
      : sceneMode === "nvv-document"
        ? {
            editorId: "nvv-document",
            fileName: activeNvvDocument?.document.title ?? null,
            canSave: Boolean(activeNvvDocument),
            saveState: nvvSaveState,
            saveFile: async () => {
              await saveActiveNvvDocument();
            },
          }
        : null;
  const canSaveFile = canSaveActiveEditorFile(activeEditorCommands);
  const usesNvdHistory = undoContext === "nvd" && sceneMode === "nvd-document";
  const usesNvvHistory = undoContext === "nvv" && sceneMode === "nvv-document";
  const libraryUndoCommand = libraryHistory.undoStack[libraryHistory.undoStack.length - 1];
  const libraryRedoCommand = libraryHistory.redoStack[libraryHistory.redoStack.length - 1];
  const nvvUndoCommand = nvvHistory.undoStack[nvvHistory.undoStack.length - 1];
  const nvvRedoCommand = nvvHistory.redoStack[nvvHistory.redoStack.length - 1];
  const canUndo = usesNvdHistory ? nvdHistoryState.canUndo : usesNvvHistory ? Boolean(nvvUndoCommand) : Boolean(libraryUndoCommand);
  const canRedo = usesNvdHistory ? nvdHistoryState.canRedo : usesNvvHistory ? Boolean(nvvRedoCommand) : Boolean(libraryRedoCommand);
  const undoLabel = usesNvdHistory
    ? "Undo"
    : usesNvvHistory
      ? nvvUndoCommand
        ? `Undo ${nvvUndoCommand.label}`
        : "Undo"
      : libraryUndoCommand
        ? `Undo ${libraryUndoCommand.label}`
        : "Undo";
  const redoLabel = usesNvdHistory
    ? "Redo"
    : usesNvvHistory
      ? nvvRedoCommand
        ? `Redo ${nvvRedoCommand.label}`
        : "Redo"
      : libraryRedoCommand
        ? `Redo ${libraryRedoCommand.label}`
        : "Redo";
  activeEditorCommandsRef.current = activeEditorCommands;

  function addLibraryHistoryCommand(command: SessionHistoryCommand) {
    setUndoContext("library");
    setLibraryHistory((history) => addSessionHistoryCommand(history, command));
  }

  function undoActiveContext() {
    if (usesNvdHistory) {
      undoNvd();
      return;
    }

    if (usesNvvHistory) {
      nvvUndoCommand?.undo();
      setNvvHistory((history) => undoSessionHistory(history));
      return;
    }

    libraryUndoCommand?.undo();
    setLibraryHistory((history) => undoSessionHistory(history));
  }

  function redoActiveContext() {
    if (usesNvdHistory) {
      redoNvd();
      return;
    }

    if (usesNvvHistory) {
      nvvRedoCommand?.redo();
      setNvvHistory((history) => redoSessionHistory(history));
      return;
    }

    libraryRedoCommand?.redo();
    setLibraryHistory((history) => redoSessionHistory(history));
  }

  function handleSaveFileCommand() {
    executeSaveFileCommand(activeEditorCommandsRef.current);
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isSaveFileShortcut(event)) {
        return;
      }

      event.preventDefault();
      handleSaveFileCommand();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleHistoryShortcut(event: KeyboardEvent) {
      if (
        isEditableEventTarget(event.target) ||
        !(event.ctrlKey || event.metaKey) ||
        event.altKey
      ) {
        return;
      }

      const key = event.key.toLowerCase();
      const isUndo = key === "z" && !event.shiftKey;
      const isRedo = key === "y" || (key === "z" && event.shiftKey);

      if (!isUndo && !isRedo) {
        return;
      }

      event.preventDefault();
      isUndo ? undoActiveContext() : redoActiveContext();
    }

    window.addEventListener("keydown", handleHistoryShortcut);
    return () => window.removeEventListener("keydown", handleHistoryShortcut);
  }, [libraryRedoCommand, libraryUndoCommand, nvvRedoCommand, nvvUndoCommand, usesNvdHistory, usesNvvHistory]);

  useEffect(() => {
    setLibraryHistory(EMPTY_SESSION_HISTORY);
    setNvvHistory(EMPTY_SESSION_HISTORY);
    setUndoContext("library");
  }, [activeInventoryManifestPath]);

  useEffect(() => {
    if (!hasUnsavedNvdChanges) {
      return;
    }

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedNvdChanges]);

  return {
    addLibraryHistoryCommand,
    canRedo,
    canSaveFile,
    canUndo,
    handleSaveFileCommand,
    redoActiveContext,
    redoLabel,
    undoActiveContext,
    undoLabel,
  };
}

