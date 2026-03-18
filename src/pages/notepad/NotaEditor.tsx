import { useEditor, EditorContent } from "@tiptap/react"
import type { Editor } from "@tiptap/core"
import StarterKit from "@tiptap/starter-kit"
import TextAlign from "@tiptap/extension-text-align"
import { MaskedBlockExtension } from "./MaskedBlockExtension"
import { useCallback, useEffect, useState, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Code,
  SquareCode,
  SquareDashedBottomCode,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { SlashMenu, SLASH_ICONS, type SlashCommandItem } from "./SlashMenu"

function ensureHtml(content: string): string {
  const trimmed = (content || "").trim()
  if (!trimmed) return "<p></p>"
  if (trimmed.startsWith("<") && trimmed.includes(">")) return trimmed
  return `<p>${trimmed.replace(/\n/g, "</p><p>")}</p>`
}

type NotaEditorProps = {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  className?: string
  onAiRequest?: () => void
}

export function NotaEditor({ content, onChange, className, onAiRequest }: NotaEditorProps) {
  const [slashOpen, setSlashOpen] = useState(false)
  const [slashPos, setSlashPos] = useState<{ left: number; top: number } | null>(null)
  const [slashSelected, setSlashSelected] = useState(0)
  const slashOpenRef = useRef(false)
  const slashInsertFromRef = useRef<number | null>(null)
  const editorRef = useRef<Editor | null>(null)
  slashOpenRef.current = slashOpen

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      MaskedBlockExtension,
    ],
    content: ensureHtml(content),
    editorProps: {
      attributes: {
        class:
          "nota-editor-prose min-h-[280px] w-full px-3 py-2 text-[var(--aw-text)] placeholder:text-[var(--aw-text-muted)] focus:outline-none font-sans",
      },
      handleDOMEvents: {
        blur: () => {
          const ed = editorRef.current
          if (ed) onChange(ed.getHTML())
        },
      },
      handleKeyDown: (view, event) => {
        if (event.key === "/" && !slashOpenRef.current) {
          slashInsertFromRef.current = view.state.selection.from
          const coords = view.coordsAtPos(view.state.selection.from)
          setSlashPos({ left: coords.left, top: coords.bottom + 4 })
          setSlashSelected(0)
          setSlashOpen(true)
          event.preventDefault()
          return true
        }
        return false
      },
    },
  })
  editorRef.current = editor

  const slashItems = useMemo((): SlashCommandItem[] => {
    if (!editor) return []
    const items: SlashCommandItem[] = [
      { id: "h1", label: "Título 1", shortcut: "/h1", icon: SLASH_ICONS.h1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
      { id: "h2", label: "Título 2", shortcut: "/h2", icon: SLASH_ICONS.h2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
      { id: "h3", label: "Título 3", shortcut: "/h3", icon: SLASH_ICONS.h3, run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
      { id: "bold", label: "Negrito", shortcut: "/bold", icon: SLASH_ICONS.bold, run: () => editor.chain().focus().toggleBold().run() },
      { id: "center", label: "Centralizar", shortcut: "/center", icon: SLASH_ICONS.center, run: () => editor.chain().focus().setTextAlign("center").run() },
      { id: "left", label: "Alinhar à esquerda", shortcut: "/left", icon: SLASH_ICONS.left, run: () => editor.chain().focus().setTextAlign("left").run() },
      { id: "right", label: "Alinhar à direita", shortcut: "/right", icon: SLASH_ICONS.right, run: () => editor.chain().focus().setTextAlign("right").run() },
      { id: "bullet", label: "Lista com marcadores", shortcut: "/bullet", icon: SLASH_ICONS.bullet, run: () => editor.chain().focus().toggleBulletList().run() },
      { id: "ordered", label: "Lista numerada", shortcut: "/ordered", icon: SLASH_ICONS.ordered, run: () => editor.chain().focus().toggleOrderedList().run() },
      { id: "code", label: "Código inline", shortcut: "/code", icon: SLASH_ICONS.code, run: () => editor.chain().focus().toggleCode().run() },
      { id: "codeBlock", label: "Bloco de código", shortcut: "/codeblock", icon: SLASH_ICONS.codeBlock, run: () => editor.chain().focus().toggleCodeBlock().run() },
      {
        id: "masked",
        label: "Bloco recolhido (texto longo)",
        shortcut: "/masked",
        icon: SLASH_ICONS.masked,
        run: () => {
          const pos = slashInsertFromRef.current
          if (typeof pos === "number") {
            editor.chain().focus().setTextSelection(pos).insertMaskedBlock().run()
            slashInsertFromRef.current = null
          } else {
            editor.chain().focus().insertMaskedBlock().run()
          }
        },
      },
    ]
    if (onAiRequest) {
      items.push({ id: "ai", label: "Melhorar com IA", shortcut: "/ai", icon: SLASH_ICONS.ai, run: onAiRequest })
    }
    return items
  }, [editor, onAiRequest])

  useEffect(() => {
    if (!editor) return
    const handler = () => onChange(editor.getHTML())
    editor.on("update", handler)
    return () => {
      editor.off("update", handler)
    }
  }, [editor, onChange])

  const ToolbarButton = useCallback(
    ({
      onClick,
      active,
      title,
      children,
    }: {
      onClick: () => void
      active?: boolean
      title: string
      children: React.ReactNode
    }) => (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-8 w-8 shrink-0",
          active && "bg-[var(--aw-accent)]/20 text-[var(--aw-accent)]"
        )}
        onClick={onClick}
        title={title}
      >
        {children}
      </Button>
    ),
    []
  )

  if (!editor) return null

  return (
    <div className={cn("flex flex-col rounded-md border border-[var(--aw-border)] bg-[var(--aw-card)]", className)}>
      {/* Toolbar com glassmorphism */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-[var(--aw-border)] bg-[var(--aw-card)]/80 px-2 py-1.5 backdrop-blur-[10px]">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Negrito (Ctrl+B)"
        >
          <Bold className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Itálico (Ctrl+I)"
        >
          <Italic className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="Sublinhado (Ctrl+U)"
        >
          <UnderlineIcon className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[var(--aw-border)]" />
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="Alinhar à esquerda"
        >
          <AlignLeft className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="Centrar"
        >
          <AlignCenter className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="Alinhar à direita"
        >
          <AlignRight className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[var(--aw-border)]" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Lista com marcadores"
        >
          <List className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Lista numerada"
        >
          <ListOrdered className="size-4" />
        </ToolbarButton>
        <span className="mx-1 h-5 w-px bg-[var(--aw-border)]" />
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="Código inline (Ctrl+E)"
        >
          <Code className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive("codeBlock")}
          title="Bloco de código"
        >
          <SquareCode className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().insertMaskedBlock().run()}
          title="Bloco recolhido (texto longo — na edição fica []; na visualização mostra tudo)"
        >
          <SquareDashedBottomCode className="size-4" />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} />
      {/* Menu / (slash commands) */}
      <SlashMenu
        open={slashOpen}
        position={slashPos}
        items={slashItems}
        selectedIndex={slashSelected}
        onSelect={setSlashSelected}
        onClose={() => {
          slashInsertFromRef.current = null
          setSlashOpen(false)
        }}
      />
      {slashOpen && (
        <div
          className="fixed inset-0 z-[99]"
          aria-hidden
          onClick={() => setSlashOpen(false)}
        />
      )}
    </div>
  )
}
