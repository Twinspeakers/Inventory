import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { TagLibraryWindowApp } from "./features/tagLibrary/TagLibraryWindowApp";
import { isTagLibraryWindowRoute } from "./features/tagLibrary/tagLibraryWindowBridge";
import "./features/nvdEditor/fonts/nvdFonts.css";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isTagLibraryWindowRoute() ? <TagLibraryWindowApp /> : <App />}
  </React.StrictMode>,
);
