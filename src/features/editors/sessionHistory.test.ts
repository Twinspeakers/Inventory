import { describe, expect, it, vi } from "vitest";
import {
  EMPTY_SESSION_HISTORY,
  addSessionHistoryCommand,
  redoSessionHistory,
  undoSessionHistory,
} from "./sessionHistory";

describe("session history", () => {
  it("routes reversible commands through undo and redo stacks", () => {
    const withCommand = addSessionHistoryCommand(EMPTY_SESSION_HISTORY, {
      label: "Rename",
      redo: vi.fn(),
      undo: vi.fn(),
    });
    const undone = undoSessionHistory(withCommand);
    const redone = redoSessionHistory(undone);

    expect(redone.undoStack).toHaveLength(1);
    expect(redone.redoStack).toHaveLength(0);
  });
});
