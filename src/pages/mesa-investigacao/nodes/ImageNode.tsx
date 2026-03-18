import { memo, useState, useCallback, useRef, useEffect } from "react"
import { Handle, Position, type Node, type NodeProps, useReactFlow } from "@xyflow/react"
import { X, Lock, LockOpen } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { ImageNodeData } from "../types"
import { MESA_CATEGORIES, getCategoryById } from "../types"

export type ImageNodeType = Node<ImageNodeData, "image">

function ImageNodeComponent({ id, data }: NodeProps<ImageNodeType>) {
  const { deleteElements, setNodes } = useReactFlow()
  const [showCategoryBar, setShowCategoryBar] = useState(false)
  const [lockHighlight, setLockHighlight] = useState(false)
  const lockHighlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onRemove = () => {
    deleteElements({ nodes: [{ id }] })
  }

  const isLocked = data.locked === true
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

  const onLockedImagePointerDown = useCallback((e: React.PointerEvent) => {
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

  useEffect(() => {
    return () => {
      if (lockHighlightTimeoutRef.current) clearTimeout(lockHighlightTimeoutRef.current)
    }
  }, [])

  const category = getCategoryById(data.categoryId)

  const setCategory = useCallback(
    (categoryId: string) => {
      setNodes((nds) =>
        nds.map((n) =>
          n.id === id ? { ...n, data: { ...n.data, categoryId } } : n
        )
      )
      setShowCategoryBar(false)
    },
    [id, setNodes]
  )

  return (
    <div
      className="relative overflow-hidden rounded-lg border-2 border-[var(--aw-mesa-node-border)] bg-[var(--aw-mesa-node-bg)] shadow-lg shadow-black/20"
      onMouseEnter={() => setShowCategoryBar(true)}
      onMouseLeave={() => setShowCategoryBar(false)}
      onPointerDown={isLocked ? onLockedImagePointerDown : undefined}
    >
      {/* Barra/badge superior com a cor da categoria */}
      {category && (
        <div
          className="absolute left-0 right-0 top-0 z-10 h-1.5 shrink-0"
          style={{ backgroundColor: category.color }}
          title={category.label}
        />
      )}
      <div className={data.scanline ? "scanline" : ""}>
        <img
          src={data.dataUrl}
          alt=""
          className="block max-h-[280px] min-h-[80px] min-w-[120px] max-w-[320px] object-contain"
          draggable={false}
        />
      </div>
      <div className="absolute right-1 top-1 z-20 flex items-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className={`nodrag nopan h-4 w-4 rounded-full bg-[var(--aw-mesa-node-bg)]/40 text-[var(--aw-text-muted)]/40 shadow-md hover:bg-[var(--aw-mesa-node-border)]/50 hover:text-[var(--aw-text)] ${isLocked && lockHighlight ? "comment-lock-highlight" : ""}`}
          onClick={toggleLock}
          type="button"
          title={isLocked ? "Desbloquear imagem" : "Bloquear imagem"}
        >
          {isLocked ? <Lock className="size-[0.425rem] comment-lock-icon" /> : <LockOpen className="size-[0.425rem]" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="nodrag nopan h-4 w-4 rounded-full bg-[var(--aw-mesa-node-bg)]/40 text-[var(--aw-text-muted)]/40 shadow-md hover:bg-[var(--aw-danger)]/20 hover:text-[var(--aw-danger)]"
          onClick={onRemove}
          type="button"
        >
          <X className="size-2" />
        </Button>
      </div>

      {/* Toolbar flutuante: só as corzinhas, estilo pontinhos do MacBook */}
      {showCategoryBar && (
        <div
          className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-2 rounded-full border border-[var(--aw-mesa-node-border)] bg-[var(--aw-mesa-node-bg)]/90 px-3 py-2 shadow-lg backdrop-blur-sm"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {MESA_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all hover:scale-110 ${
                data.categoryId === cat.id ? "ring-2 ring-offset-2 ring-offset-[var(--aw-mesa-node-bg)]" : ""
              }`}
              style={{
                backgroundColor: cat.color,
                opacity: data.categoryId === cat.id ? 1 : 0.7,
                ...(data.categoryId === cat.id ? { boxShadow: `0 0 0 1px ${cat.color}` } : {}),
              }}
              title={cat.label}
            />
          ))}
        </div>
      )}

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

export const ImageNode = memo(ImageNodeComponent)
