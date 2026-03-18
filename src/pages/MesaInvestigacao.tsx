import { useSearchParams } from "react-router-dom"
import { MesaInvestigacaoCanvas } from "./mesa-investigacao/MesaInvestigacaoCanvas"

export function MesaInvestigacao() {
  const [searchParams] = useSearchParams()
  const focusNodeId = searchParams.get("focus") ?? undefined

  return (
    <div className="flex h-full flex-col">
      <MesaInvestigacaoCanvas focusNodeId={focusNodeId} />
    </div>
  )
}
