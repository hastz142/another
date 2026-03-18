import { memo, useState, useCallback, useRef, useEffect } from "react"
import { Handle, Position, type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { X, GripVertical, Lock, LockOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import type { CommentNodeData } from "../types"

export type CommentNodeType = Node<CommentNodeData, "comment">

const MIN_W = 160
const MIN_H = 88
const MAX_W = 480
const MAX_H = 400

/** Altura mínima reservada para a barra inferior (ícone de redimensionar), para nunca ser cortada. */
const BOTTOM_BAR_MIN_H = 28

function CommentNodeComponent({ id, data }: NodeProps<CommentNodeType>) {
  const { setNodes, deleteElements } = useReactFlow()
  const [localText, setLocalText] = useState(data.text)
  const [isResizing, setIsResizing] = useState(false)
  const [lockHighlight, setLockHighlight] = useState(false)
  const startRef = useRef({ x: 0, y: 0, w: data.width ?? 200, h: data.height ?? 100 })
  const lockHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const width = data.width ?? 200
  const height = data.height ?? 100

  const updateNodeData = useCallback(
    (updates: Partial<CommentNodeData>) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, ...updates } } : n
        )
      )
    },
    [id, setNodes]
  )

  const onBlur = () => {
    if (localText !== data.text) updateNodeData({ text: localText })
  }

  const onResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsResizing(true)
      startRef.current = { x: e.clientX, y: e.clientY, w: width, h: height }
    },
    [width, height]
  )

  useEffect(() => {
    return () => {
      if (lockHighlightTimeoutRef.current) clearTimeout(lockHighlightTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (!isResizing) return
    const onMove = (e: MouseEvent) => {
      const dw = e.clientX - startRef.current.x
      const dh = e.clientY - startRef.current.y
      const newW = Math.min(MAX_W, Math.max(MIN_W, startRef.current.w + dw))
      const newH = Math.min(MAX_H, Math.max(MIN_H, startRef.current.h + dh))
      updateNodeData({ width: newW, height: newH })
    }
    const onUp = () => setIsResizing(false)
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [isResizing, updateNodeData])

  const onRemove = () => {
    deleteElements({ nodes: [{ id }] })
  }

  const isLocked = data.locked === true

  const onLockedCommentPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isLocked) return
    e.stopPropagation()
    e.preventDefault()
    if (lockHighlightTimeoutRef.current) clearTimeout(lockHighlightTimeoutRef.current)
    setLockHighlight(true)
    lockHighlightTimeoutRef.current = setTimeout(() => {
      setLockHighlight(false)
      lockHighlightTimeoutRef.current = null
    }, 450)
  }, [isLocked])

  const toggleLock = useCallback(() => {
    const nextLocked = !isLocked
    setNodes((nds) =>
      nds.map((n) =>
        n.id === id
          ? { ...n, data: { ...n.data, locked: nextLocked }, draggable: !nextLocked }
          : n
      )
    )
  }, [id, isLocked, setNodes])

  return (
    <div
      className="flex min-w-0 flex-col overflow-hidden rounded-lg border-2 border-[var(--aw-mesa-node-border)] bg-[var(--aw-mesa-node-bg)] shadow-lg shadow-black/20"
      style={{ width, height, minWidth: MIN_W, minHeight: MIN_H, maxWidth: MAX_W, maxHeight: MAX_H }}
      onPointerDown={isLocked ? onLockedCommentPointerDown : undefined}
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-[var(--aw-mesa-node-border)] px-2 py-1.5">
        <span className="truncate text-xs font-medium text-[var(--aw-text-muted)]">Comentário</span>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            className={`nodrag nopan h-6 w-6 rounded text-[var(--aw-text-muted)] hover:bg-[var(--aw-mesa-node-border)]/50 hover:text-[var(--aw-text)] ${isLocked && lockHighlight ? "comment-lock-highlight" : ""}`}
            onClick={toggleLock}
            type="button"
            title={isLocked ? "Desbloquear comentário" : "Bloquear comentário"}
          >
            {isLocked ? <Lock className="size-3 comment-lock-icon" /> : <LockOpen className="size-3" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="nodrag nopan h-6 w-6 shrink-0 rounded text-[var(--aw-text-muted)]/40 hover:bg-[var(--aw-danger)]/20 hover:text-[var(--aw-danger)]"
            onClick={onRemove}
            type="button"
          >
            <X className="size-3.5" />
          </Button>
        </div>
      </div>
      <Textarea
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={onBlur}
        readOnly={isLocked}
        placeholder="Escreva aqui..."
        className="min-h-0 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-[var(--aw-text)] placeholder:text-[var(--aw-text-muted)] focus-visible:ring-0"
        style={{ minHeight: 24 }}
      />
      <div
        className="flex shrink-0 items-center justify-end border-t border-[var(--aw-mesa-node-border)] p-1.5 text-[var(--aw-text-muted)]"
        style={{ minHeight: BOTTOM_BAR_MIN_H }}
      >
        {!isLocked && (
          <div
            role="button"
            tabIndex={0}
            onMouseDown={onResizeStart}
            className="nodrag nopan cursor-se-resize rounded p-0.5 hover:bg-[var(--aw-mesa-node-border)]/40"
            title="Arrastar para redimensionar"
          >
            <GripVertical className="size-4" />
          </div>
        )}
      </div>
      {/* 4 lados, cada um como source + target para ligar de/para qualquer lado */}
      <Handle id="top-target" type="target" position={Position.Top} className="!h-3 !w-3 !border-2 !border-[var(--aw-mesa-node-border)] !bg-[var(--aw-mesa-node-handle)]" />
      <Handle id="top-source" type="source" position={Position.Top} className="!h-3 !w-3 !border-2 !border-[var(--aw-mesa-node-border)] !bg-[var(--aw-mesa-node-handle)]" />
      <Handle id="right-target" type="target" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[var(--aw-mesa-node-border)] !bg-[var(--aw-mesa-node-handle)]" />
      <Handle id="right-source" type="source" position={Position.Right} className="!h-3 !w-3 !border-2 !border-[var(--aw-mesa-node-border)] !bg-[var(--aw-mesa-node-handle)]" />
      <Handle id="bottom-target" type="target" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-[var(--aw-mesa-node-border)] !bg-[var(--aw-mesa-node-handle)]" />
      <Handle id="bottom-source" type="source" position={Position.Bottom} className="!h-3 !w-3 !border-2 !border-[var(--aw-mesa-node-border)] !bg-[var(--aw-mesa-node-handle)]" />
      <Handle id="left-target" type="target" position={Position.Left} className="!h-3 !w-3 !border-2 !border-[var(--aw-mesa-node-border)] !bg-[var(--aw-mesa-node-handle)]" />
      <Handle id="left-source" type="source" position={Position.Left} className="!h-3 !w-3 !border-2 !border-[var(--aw-mesa-node-border)] !bg-[var(--aw-mesa-node-handle)]" />
    </div>
  )
}

export const CommentNode = memo(CommentNodeComponent)
