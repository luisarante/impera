# Assets do clube

Coloque aqui os arquivos reais. Enquanto não existem, o site usa placeholders
em CSS (gradientes/silhuetas) — nada quebra.

## Arquivos esperados

| Arquivo | Onde aparece | Observação |
|---------|--------------|------------|
| `hero.mp4` | Seção 1 (Hero) | Loop cinematográfico, mudo. Mantenha curto e otimizado (H.264, ~1080p). Já referenciado em `Hero.tsx`. |
| `hero-poster.jpg` | Seção 1 | Poster estático do vídeo (opcional). Adicione em `<video poster="/assets/hero-poster.jpg">`. |
| `players/p1.png` … `p4.png` | Seção 4 (Pilares) | Fotos **sem fundo** (PNG). Substitua o `div.player-photo` por `<img>`. |
| `kit/360/frame-00.jpg` … `frame-35.jpg` | Seção 6 (Kit Room) | Sequência da camisa girando 360° (≈36 frames). Ver comentário no `KitRoom.tsx` para trocar o `rotateY` placeholder por frame-sequence. |
| `team.jpg` | Seção 7 (Apito Final) | Foto do time unido. Substitua o `div.team-photo`. |
| `escudo.svg` | Várias | Escudo oficial. Substitua o SVG em `src/components/ui/Badge.tsx`. |

## Dica de performance

- Vídeo do hero: comprima bem; é o maior gargalo de carregamento.
- Frames 360°: pré-carregue em paralelo e mostre um loading discreto.
