"use client"

import { useState, useCallback } from "react"
import { NodeViewWrapper } from "@tiptap/react"
import { Button } from "@/components/ui/button"
import { Pencil, Trash2, X } from "lucide-react"
import type { ReactNodeViewProps } from "@tiptap/react"

function decodeContent(data: string): string {
  if (!data) return ""
  try {
    return atob(data)
  } catch {
    return ""
  }
}

function encodeContent(text: string): string {
  try {
    return btoa(text)
  } catch {
    return ""
  }
}

export function MaskedBlockView({ node, updateAttributes, deleteNode }: ReactNodeViewProps) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(() => decodeContent(node.attrs.data ?? ""))

  const placeholder = node.attrs.placeholder ?? "Ver conteúdo"
  const hasContent = !!node.attrs.data

  const openEdit = useCallback(() => {
    setValue(decodeContent(node.attrs.data ?? ""))
    setEditing(true)
  }, [node.attrs.data])

  const saveAndClose = useCallback(() => {
    updateAttributes({ data: encodeContent(value) })
    setEditing(false)
  }, [value, updateAttributes])

  const cancelEdit = useCallback(() => {
    setValue(decodeContent(node.attrs.data ?? ""))
    setEditing(false)
  }, [node.attrs.data])

  if (editing) {
    return (
      <NodeViewWrapper as="span" className="nota-masked-block-editor inline-block align-middle">
        <div className="rounded-lg border-2 border-[var(--aw-accent)] bg-[var(--aw-card)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--aw-text-muted)]">Conteúdo do bloco recolhido</span>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="sm" onClick={deleteNode} title="Apagar bloco">
                <Trash2 className="size-4 text-[var(--aw-danger)]" />
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="size-4" />
              </Button>
              <Button type="button" size="sm" onClick={saveAndClose}>
                Guardar
              </Button>
            </div>
          </div>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Cole aqui o texto longo (chaves, logs, etc.)"
            className="min-h-[120px] w-full resize-y rounded border border-[var(--aw-border)] bg-[var(--aw-bg)] px-3 py-2 font-mono text-sm text-[var(--aw-text)] placeholder:text-[var(--aw-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--aw-accent)]"
            autoFocus
          />
        </div>
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper as="span" className="nota-masked-block-editor inline-flex align-middle">
      <button
        type="button"
        onClick={openEdit}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-[var(--aw-border)] bg-[var(--aw-border)]/20 px-3 py-1.5 text-left text-sm transition-colors hover:border-[var(--aw-accent)]/50 hover:bg-[var(--aw-border)]/30"
      >
        <span className="rounded bg-[var(--aw-card)] px-1.5 py-0.5 font-mono text-xs text-[var(--aw-text-muted)]">
          [ ]
        </span>
        <span className="text-[var(--aw-text-muted)]">
          {hasContent ? placeholder : "Clique para adicionar conteúdo recolhido"}
        </span>
        <Pencil className="size-3.5 shrink-0 text-[var(--aw-text-muted)]" />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); deleteNode() }}
        className="ml-1 inline-flex shrink-0 items-center justify-center rounded p-1 text-[var(--aw-text-muted)] transition-colors hover:bg-[var(--aw-danger)]/20 hover:text-[var(--aw-danger)]"
        title="Apagar bloco"
      >
        <Trash2 className="size-3.5" />
      </button>
    </NodeViewWrapper>
  )
}
