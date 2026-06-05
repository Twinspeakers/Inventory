export type SessionHistoryCommand = {
  label: string;
  redo: () => void;
  undo: () => void;
};

export type SessionHistory = {
  redoStack: SessionHistoryCommand[];
  undoStack: SessionHistoryCommand[];
};

export const EMPTY_SESSION_HISTORY: SessionHistory = {
  redoStack: [],
  undoStack: [],
};

export function addSessionHistoryCommand(
  history: SessionHistory,
  command: SessionHistoryCommand,
  maximumDepth = 100,
): SessionHistory {
  return {
    redoStack: [],
    undoStack: [...history.undoStack, command].slice(-maximumDepth),
  };
}

export function undoSessionHistory(history: SessionHistory): SessionHistory {
  const command = history.undoStack[history.undoStack.length - 1];

  if (!command) {
    return history;
  }

  return {
    redoStack: [...history.redoStack, command],
    undoStack: history.undoStack.slice(0, -1),
  };
}

export function redoSessionHistory(history: SessionHistory): SessionHistory {
  const command = history.redoStack[history.redoStack.length - 1];

  if (!command) {
    return history;
  }

  return {
    redoStack: history.redoStack.slice(0, -1),
    undoStack: [...history.undoStack, command],
  };
}
