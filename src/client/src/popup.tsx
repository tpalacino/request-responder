import { FluentProvider, webDarkTheme } from "@fluentui/react-components";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Popup } from "./RulePopup";
import "./popup.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <FluentProvider theme={webDarkTheme}>
      <Popup />
    </FluentProvider>
  </StrictMode>,
);
