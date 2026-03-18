import { useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { runMigrationOnce } from "@/lib/migrateLocalStorageToApi"
import { Home } from "@/pages/Home"
import { MesaInvestigacao } from "@/pages/MesaInvestigacao"
import { NotepadChecklistsPage } from "@/pages/notepad/NotepadChecklistsPage"
import { NotepadChecklistDetailPage } from "@/pages/notepad/NotepadChecklistDetailPage"
import { NotepadNotasPage } from "@/pages/notepad/NotepadNotasPage"
import { NotepadNotaDetailPage } from "@/pages/notepad/NotepadNotaDetailPage"
import { NotepadFluxosPage } from "@/pages/notepad/NotepadFluxosPage"
import { Senhas } from "@/pages/Senhas"
import { Bookmarks } from "@/pages/Bookmarks"
import { Ideias } from "@/pages/Ideias"
import { Pomodoro } from "@/pages/Pomodoro"
import { Rede } from "@/pages/Rede"
import { RestScreenSettingsPage } from "@/pages/RestScreenSettingsPage"
import { Financeiro } from "@/pages/Financeiro"
import Login from "@/pages/Login"
import { ProtectedRoute } from "@/components/auth/ProtectedRoute"
import { NetworkProvider } from "@/contexts/NetworkContext"
import { RestScreenProvider } from "@/contexts/RestScreenContext"

function App() {
  useEffect(() => {
    runMigrationOnce().catch(() => {})
  }, [])

  return (
    <BrowserRouter>
      <NetworkProvider>
        <RestScreenProvider>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="mesa-de-investigacao" element={<MesaInvestigacao />} />
            <Route path="notas" element={<NotepadNotasPage />} />
            <Route path="notas/:notaId" element={<NotepadNotaDetailPage />} />
            <Route path="checklists" element={<NotepadChecklistsPage />} />
            <Route path="checklists/:checklistId" element={<NotepadChecklistDetailPage />} />
            <Route path="fluxos" element={<NotepadFluxosPage />} />
            <Route path="senhas" element={<Senhas />} />
            <Route path="bookmarks" element={<Bookmarks />} />
            <Route path="ideias" element={<Ideias />} />
            <Route path="pomodoro" element={<Pomodoro />} />
            <Route path="descanso" element={<RestScreenSettingsPage />} />
            <Route path="rede" element={<Rede />} />
            <Route
              path="financeiro"
              element={
                <ProtectedRoute>
                  <Financeiro />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
        </RestScreenProvider>
      </NetworkProvider>
    </BrowserRouter>
  )
}

export default App
