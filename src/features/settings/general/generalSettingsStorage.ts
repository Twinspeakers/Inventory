const nvdSaveReminderEnabledKey = "inventory.settings.nvdSaveReminderEnabled";
const nvdStyleResetConfirmationEnabledKey = "inventory.settings.nvdStyleResetConfirmationEnabledV2";

export function readNvdSaveReminderEnabled() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(nvdSaveReminderEnabledKey) !== "false";
}

export function storeNvdSaveReminderEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(nvdSaveReminderEnabledKey, String(enabled));
  } catch {
    // Settings persistence is a convenience; the live app can continue without it.
  }
}

export function readNvdStyleResetConfirmationEnabled() {
  if (typeof window === "undefined") {
    return true;
  }

  return window.localStorage.getItem(nvdStyleResetConfirmationEnabledKey) !== "false";
}

export function storeNvdStyleResetConfirmationEnabled(enabled: boolean) {
  try {
    window.localStorage.setItem(nvdStyleResetConfirmationEnabledKey, String(enabled));
  } catch {
    // Settings persistence is a convenience; the live app can continue without it.
  }
}
