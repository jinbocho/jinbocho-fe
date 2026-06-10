import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "@/App";
import { ToastProvider } from "@/components/ui/Toast";
import { initI18n } from "@/features/i18n/store";
import { initTheme } from "@/features/theme/store";
import { queryClient } from "@/lib/queryClient";
import "@/styles/index.css";

// Apply the saved/system theme and language before first paint to avoid a flash.
initTheme();
initI18n();

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element #root not found");

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <App />
      </ToastProvider>
    </QueryClientProvider>
  </StrictMode>,
);
