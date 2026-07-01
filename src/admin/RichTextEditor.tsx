import { useRef, useState } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Youtube from '@tiptap/extension-youtube'
import { publicImageUrl, uploadImage } from '../lib/supabase'
import { useToast } from './feedback'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
}

const btn =
  'rounded px-2.5 py-1 text-xs font-medium transition-colors border border-transparent hover:bg-white/10'
const btnActive = 'bg-[var(--color-accent)]/20 text-white'

function ToolButton({
  active,
  onClick,
  title,
  children,
}: {
  active?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`${btn} ${active ? btnActive : 'text-[var(--text-70)]'}`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  const toast = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  async function insertImage(file: File) {
    setUploading(true)
    try {
      const path = await uploadImage('news', file)
      const url = publicImageUrl('news', path)
      if (url) editor.chain().focus().setImage({ src: url }).run()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Falha no upload da imagem.', 'error')
    } finally {
      setUploading(false)
    }
  }

  function insertVideo() {
    const url = window.prompt('Cole o link do vídeo (YouTube ou Vimeo):')
    if (url) editor.commands.setYoutubeVideo({ src: url })
  }

  function setLink() {
    const previous = editor.getAttributes('link').href as string | undefined
    const url = window.prompt('URL do link:', previous ?? 'https://')
    if (url === null) return
    if (url === '') editor.chain().focus().extendMarkRange('link').unsetLink().run()
    else editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-[var(--hairline)] bg-black/20 px-2 py-1.5">
      <ToolButton title="Negrito" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
        <b>B</b>
      </ToolButton>
      <ToolButton title="Itálico" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
        <i>I</i>
      </ToolButton>
      <span className="mx-1 h-4 w-px bg-[var(--hairline)]" />
      <ToolButton
        title="Subtítulo"
        active={editor.isActive('heading', { level: 2 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </ToolButton>
      <ToolButton
        title="Subtítulo menor"
        active={editor.isActive('heading', { level: 3 })}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </ToolButton>
      <ToolButton title="Lista" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
        • Lista
      </ToolButton>
      <ToolButton title="Citação" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
        ❝
      </ToolButton>
      <ToolButton title="Link" active={editor.isActive('link')} onClick={setLink}>
        🔗
      </ToolButton>
      <span className="mx-1 h-4 w-px bg-[var(--hairline)]" />
      <ToolButton title="Imagem" onClick={() => fileRef.current?.click()}>
        {uploading ? '…' : '🖼 Imagem'}
      </ToolButton>
      <ToolButton title="Vídeo" onClick={insertVideo}>
        ▶ Vídeo
      </ToolButton>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) insertImage(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}

/**
 * Editor rich text (TipTap) para o corpo das matérias. Salva HTML e suporta
 * imagem inline (upload pro Storage) e embed de vídeo do YouTube/Vimeo.
 */
export default function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image,
      Link.configure({ openOnClick: false, autolink: true }),
      Youtube.configure({ width: 640, height: 360, nocookie: true }),
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'news-content min-h-[260px] px-4 py-3 outline-none',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="overflow-hidden rounded-md border border-[var(--hairline)] bg-black/30">
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
