import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/contexts/ThemeContext"
import { ZenModeProvider } from "@/contexts/ZenModeContext"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <ZenModeProvider>
        <App />
      </ZenModeProvider>
    </ThemeProvider>
  </StrictMode>
)
