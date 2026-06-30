# Resenha FC — Experiência Imersiva (Pro Clubs EA FC 26)

Landing page imersiva, **desktop-first**, dark/premium, para um clube de Pro Clubs.
Sete seções em scroll cinematográfico. Narrativa: _você não está vendo o clube — está sendo recrutado por ele._

## Stack

- **React 19 + Vite + TypeScript**
- **Tailwind CSS v4** (CSS-first, tokens em `src/styles/index.css`)
- **GSAP + ScrollTrigger** — pin (scroll-lock) e scrub (animação ligada ao scroll)
- **Lenis** — smooth scroll (faz o "ímã" da timeline parecer suave)

## Rodar

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build de produção (tsc + vite)
```

## Arquitetura de scroll

Um único motor governa tudo (`src/lib/`):

- `gsap.ts` — registro único do `ScrollTrigger` + helper `prefersReducedMotion()`.
- `useLenis.ts` — inicializa o Lenis e faz a **ponte** com o GSAP
  (`lenis.on('scroll', ScrollTrigger.update)` + `gsap.ticker` dirige o `raf`).
  Sem essa ponte, `pin` e smooth-scroll brigam.

Técnicas por seção:

| Seção | Efeito | Como |
|------|--------|------|
| 1 Hero | Fade-into-black | overlay com `--ov` em `scrub` |
| 2 Big Numbers | Contador 0→valor | `Counter` + IntersectionObserver |
| 3 SilviaNews | Painel glass lateral | `GlassPanel` (backdrop-filter) |
| 4 Hall dos Pilares | **Scroll-lock** | `pin` + `scrub`, crossfade dos 4 jogadores |
| 5 Jornada | Ímã + linha desenhada | `snap` + `scaleY` da linha em `scrub` |
| 6 Kit Room | Camisa 360° | drag → `rotateY` (pronto p/ trocar por frames) |
| 7 Apito Final | Encerramento + CTA | composição estática |

**Acessibilidade:** com `prefers-reduced-motion: reduce`, o Lenis e os pins são
desligados e o site vira uma versão estática 100% navegável.

## Assets (placeholders → reais)

Tudo hoje usa placeholders em CSS. Para usar o material real, ver
`public/assets/README.md`. Resumo:

- `public/assets/hero.mp4` — vídeo cinematográfico do hero.
- Escudo real → editar `src/components/ui/Badge.tsx`.
- Fotos dos jogadores sem fundo → trocar o placeholder `.player-photo` em `PillarsHall`.
- Camisa 360° → ver o comentário em `src/components/sections/KitRoom.tsx`
  (mapear rotação → índice do frame).
- Foto do time → trocar `.team-photo` em `FinalWhistle`.

## Conteúdo

Todo o texto (clube, jogadores, notícias, marcos, kits) está centralizado em
`src/data/club.ts` — é tudo mock coerente para revisar/ajustar.
