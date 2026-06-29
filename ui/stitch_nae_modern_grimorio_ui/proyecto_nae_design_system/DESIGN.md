---
name: Proyecto Nae Design System
colors:
  surface: '#fff8f6'
  surface-dim: '#e0d8d6'
  surface-bright: '#fff8f6'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#faf2f0'
  surface-container: '#f4ecea'
  surface-container-high: '#eee6e4'
  surface-container-highest: '#e8e1df'
  on-surface: '#1e1b1a'
  on-surface-variant: '#504440'
  inverse-surface: '#33302e'
  inverse-on-surface: '#f7efed'
  outline: '#827470'
  outline-variant: '#d3c3be'
  surface-tint: '#74584e'
  primary: '#090100'
  on-primary: '#ffffff'
  primary-container: '#2c1810'
  on-primary-container: '#9e7e73'
  inverse-primary: '#e3bfb2'
  secondary: '#755b00'
  on-secondary: '#ffffff'
  secondary-container: '#fed977'
  on-secondary-container: '#785d00'
  tertiary: '#0e0000'
  on-tertiary: '#ffffff'
  tertiary-container: '#440003'
  on-tertiary-container: '#e05850'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffdbce'
  primary-fixed-dim: '#e3bfb2'
  on-primary-fixed: '#2a170f'
  on-primary-fixed-variant: '#5a4137'
  secondary-fixed: '#ffe08f'
  secondary-fixed-dim: '#e6c364'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#584400'
  tertiary-fixed: '#ffdad6'
  tertiary-fixed-dim: '#ffb3ac'
  on-tertiary-fixed: '#410003'
  on-tertiary-fixed-variant: '#8a1a1a'
  background: '#fff8f6'
  on-background: '#1e1b1a'
  surface-variant: '#e8e1df'
  surface-table: '#1A1510'
  parchment-light: '#F5ECD7'
  parchment-dark: '#EDE3CC'
  ink-soft: '#6B5B4E'
  mystic-purple: '#3E3140'
  forest-accent: '#4A6741'
typography:
  h1:
    fontFamily: Newsreader
    fontSize: 48px
    fontWeight: '600'
    lineHeight: '1.1'
    letterSpacing: -0.02em
  h2:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '500'
    lineHeight: '1.2'
  h3:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: '1.3'
  body-lg:
    fontFamily: Noto Serif
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: Noto Serif
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  nav-item:
    fontFamily: Noto Serif
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.1em
  rune-decorative:
    fontFamily: serif
    fontSize: 20px
    fontWeight: '400'
    lineHeight: '1'
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  page-margin: 2rem
  gutter: 1.5rem
  section-gap: 4rem
  ink-bleed: 0.5rem
---

# Diseño Visual - Proyecto Nae

## Concepto de Diseño

**Estética:** Grimorio/Libro Antiguo Abierto — Moderno y Limpio
La interfaz simula la experiencia de abrir un antiguo libro de hechizos. El diseño combina la atmósfera mística de un códice antiguo con principios modernos de UX/UI, creando una experiencia visual premium pero altamente funcional.

---

## Paleta de Colores

```
Mesa/Fondo Oscuro:   #1a1510 (negro cálido)
Pergamino Claro:     #F5ECD7 (crema cálido)
Pergamino Oscuro:    #EDE3CC (beige envejecido)
Dorado Mágico:       #C9A84C (oro antiguo)
Tinta Oscura:        #2C1810 (marrón profundo)
Tinta Suave:         #6B5B4E (marrón grisáceo)
Púrpura Oscuro:      #3E3140 (violeta profundo)
Rojo Vino:           #8B1A1A (carmesí oscuro)
Verde Bosque:        #4A6741 (para acentos Nae)
```

---

## Tipografía Recomendada

- **Títulos y Headers:** `Georgia, "Crimson Pro", serif` (serif elegante)
- **Cuerpo de texto:** `Georgia, "EB Garamond", serif`
- **Navegación:** `Georgia, "Marcellus", serif`
- **Decorativo/Runas:** Fuentes con soporte Unicode para runas nórdicas

---

## Principios de Diseño

### 1. Estética de Libro Abierto
- **Desktop:** Dos páginas de pergamino sobre mesa oscura
- **Mobile:** Una sola página de pergamino centrada
- Pliegue central visible con sombra sutil
- Sombra bajo el libro (ellipse oscura con blur)
- Bordes del pergamino ligeramente desgastados

### 2. Decoraciones Ambientales
- Manchas de tinta sutiles (opacity baja)
- Esquinas ornamentales doradas
- Separadores de capítulo entre secciones
- Textura de madera en el fondo (líneas horizontales sutiles)
- Pluma y tintero como decoración en algunas pantallas

### 3. Jerarquía Visual
- **Títulos:** Serif grande en rojo vino o tinta oscura
- **Navegación:** Dorado con hover/active states
- **Badges:** Bordes dorados, fondo pergamino
  - Oficial: `#EDE3CC` fondo, `#8B1A1A` texto
  - Nae: `#3E3140` fondo, `#C9A84C` texto
- **Separadores:** Líneas ornamentales doradas

### 4. Responsive
- **Desktop:** Libro abierto completo
- **Mobile:** Una página, stack vertical
- **Breakpoints:** 
  - Mobile: < 768px
  - Tablet: 768px - 1024px
  - Desktop: > 1024px
