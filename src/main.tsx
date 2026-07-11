import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { NvdFramePropertiesWindowApp } from "./features/nvdEditor/NvdFramePropertiesWindowApp";
import { isNvdFramePropertiesWindowRoute } from "./features/nvdEditor";
import { TagLibraryWindowApp } from "./features/tagLibrary/TagLibraryWindowApp";
import { isTagLibraryWindowRoute } from "./features/tagLibrary/tagLibraryWindowBridge";
import "./features/nvdEditor/fonts/nvdFonts.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isTagLibraryWindowRoute() ? (
      <TagLibraryWindowApp />
    ) : isNvdFramePropertiesWindowRoute() ? (
      <NvdFramePropertiesWindowApp />
    ) : (
      <App />
    )}
  </React.StrictMode>,
);
