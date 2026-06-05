export type EditorSaveState = "idle" | "dirty" | "saving" | "saved" | "error";

export type ActiveEditorCommands = {
  editorId: string;
  fileName: string | null;
  canSave: boolean;
  saveState: EditorSaveState;
  saveFile: () => Promise<void>;
};

export function canSaveActiveEditorFile(editor: ActiveEditorCommands | null): editor is ActiveEditorCommands {
  return Boolean(editor?.canSave && editor.fileName && editor.saveState !== "saving");
}

export function executeSaveFileCommand(editor: ActiveEditorCommands | null) {
  if (!canSaveActiveEditorFile(editor)) {
    return false;
  }

  void editor.saveFile();
  return true;
}

export function isSaveFileShortcut(event: Pick<KeyboardEvent, "altKey" | "ctrlKey" | "key" | "metaKey" | "shiftKey">) {
  return (event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === "s";
}
