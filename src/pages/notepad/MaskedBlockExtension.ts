import { Node } from "@tiptap/core"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { MaskedBlockView } from "./MaskedBlockView"

/**
 * Bloco que na edição aparece recolhido (ex.: []) e na visualização mostra o conteúdo completo.
 * Útil para chaves SSH, logs, texto muito longo.
 */
export const MaskedBlockExtension = Node.create({
  name: "maskedBlock",

  group: "inline",
  inline: true,

  atom: true,

  addAttributes() {
    return {
      data: {
        default: "",
        parseHTML: (element) => element.getAttribute("data-content") ?? "",
        renderHTML: (attributes) => (attributes.data ? { "data-content": attributes.data } : {}),
      },
      placeholder: {
        default: "Ver conteúdo",
        parseHTML: (element) => element.getAttribute("data-placeholder") ?? "Ver conteúdo",
        renderHTML: (attributes) => ({ "data-placeholder": attributes.placeholder }),
      },
    }
  },

  parseHTML() {
    return [
      { tag: 'div[data-type="masked-block"]' },
      { tag: 'span[data-type="masked-block"]' },
    ]
  },

  renderHTML({ node }) {
    return [
      "span",
      {
        "data-type": "masked-block",
        class: "nota-masked-block",
        "data-placeholder": node.attrs.placeholder,
        "data-content": node.attrs.data ?? "",
      },
      "[]",
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MaskedBlockView)
  },

  addCommands() {
    return {
      insertMaskedBlock:
        () =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { data: "", placeholder: "Ver conteúdo" },
          })
        },
    }
  },
})

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    maskedBlock: {
      insertMaskedBlock: () => ReturnType
    }
  }
}
