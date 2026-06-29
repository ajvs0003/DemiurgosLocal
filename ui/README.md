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

## Archivos en esta carpeta

### Mockups de Pantallas (Desktop)

1. **mockup-home-desktop.svg** (1440x900)
   - Home page con libro abierto sobre mesa oscura
   - Header con logo Næ, navegación y separador ornamental
   - Hero section centrado con título y búsqueda
   - Grid de 4 categorías con estilo "marcapáginas"
   - Decoraciones: manchas de tinta, esquinas desgastadas, pluma y tintero

2. **mockup-rules-desktop.svg** (1440x900)
   - Página de listado de reglas DnD 5e
   - Grid 2x4 de categorías con números romanos (I-VIII)
   - Panel destacado a la derecha con preview de "Bola de Fuego"
   - Breadcrumb y navegación
   - Tags: Nivel, Escuela, Origen

3. **mockup-detail-desktop.svg** (1440x900)
   - Página de detalle de hechizo "Bola de Fuego"
   - Página izquierda: ficha técnica (tiempo, alcance, componentes, duración)
   - Página derecha: descripción narrativa + ilustración de fuego
   - Badges informativos
   - Separadores ornamentales

4. **mockup-search-desktop.svg** (1440x900)
   - Página de resultados de búsqueda
   - Barra de búsqueda prominente con término "fireball"
   - Pills de filtros (Todo, Hechizos, Monstruos, Equipo, Clases)
   - 6 resultados en formato "índice de libro" con líneas punteadas
   - Paginación al pie

5. **mockup-nae-desktop.svg** (1440x900)
   - Página del Mundo Nae (homebrew)
   - Gran emblema circular con N estilizada y runas
   - Categorías con cards orgánicos (bordes ondulados)
   - Destacado de especie "Silvani"
   - Anotaciones marginales manuscritas simuladas
   - Paleta más cálida/envejecida

### Mockups Mobile

6. **mockup-home-mobile.svg** (390x844)
   - Versión responsive de la home
   - Una sola página de pergamino centrada
   - Header compacto con logo y hamburguesa
   - Categorías apiladas verticalmente
   - Mantiene la estética grimorio

---

### Assets Reutilizables

7. **logo-nae.svg** (200x200)
   - Logo/sello del proyecto
   - Círculo dorado con doble borde
   - Letra "N" central en dorado con "æ" debajo
   - 4 runas nórdicas en posiciones cardinales
   - Anillo decorativo con dash-array
   - Florituras en esquinas

8. **ornament-separator.svg** (600x40)
   - Separador ornamental horizontal
   - Dos versiones dentro del mismo archivo:
     - `<g id="light">` - Dorado sobre transparente (para fondos oscuros)
     - `<g id="dark">` - Tinta oscura sobre transparente (para fondos claros)
   - Línea central con curvas
   - Rombo decorativo central
   - Florituras simétricas
   - **Uso:** Mostrar/ocultar via CSS según el fondo

9. **empty-search.svg** (400x300)
   - Ilustración de estado vacío para búsqueda sin resultados
   - Pergamino enrollado con lupa encima
   - Signo "?" estilizado con destello mágico
   - Partículas/destellos alrededor
   - Texto "Sin resultados" en serif italic
   - Volutas de humo decorativas

10. **hero-illustration.svg** (800x400)
    - Ilustración decorativa para el hero
    - Silueta de mago/aventurero con capa abriendo un libro
    - Destellos mágicos emergiendo del libro
    - Orbe brillante central con gradiente radial
    - Runas flotantes
    - Líneas de energía ascendentes
    - Fondo transparente (para superponer)

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

---

## Implementación Recomendada

### Stack Técnico
- **React 19** + **TypeScript**
- **Vite 6** (bundler)
- **Tailwind CSS v4** (estilos)
- **React Router v7** (SPA routing)
- **TanStack Query v5** (data fetching)
- **DOMPurify** (sanitizar HTML del body de la API)
- **marked** (Markdown → HTML para contenido Nae)

### Estructura de Carpetas
```
packages/web/src/
├── api/                # API client (fetch wrappers)
├── routes/             # Pages (home, rules, detail, search, nae)
├── features/           # Domain logic + hooks (useCollection, useSearch)
├── ui/                 # Presentational components
│   ├── layout/        # Navbar, Sidebar, PageShell
│   ├── cards/         # CollectionCard, SearchResultCard
│   ├── detail/        # ContentBody, OriginBadge
│   ├── filters/       # FilterBar, OriginToggle
│   └── common/        # Loader, ErrorMessage, Breadcrumbs
└── assets/            # Copiar los SVGs de Z:\DemiurgosLocal\ui\
```

### Cómo usar los SVGs

1. **Logo:**
   ```jsx
   import logoNae from '@/assets/logo-nae.svg?react'
   <logoNae className="w-12 h-12" />
   ```

2. **Separador Ornamental:**
   ```jsx
   <img src="/assets/ornament-separator.svg#light" alt="" /> // Fondo oscuro
   <img src="/assets/ornament-separator.svg#dark" alt="" /> // Fondo claro
   ```

3. **Empty Search:**
   ```jsx
   {results.length === 0 && (
     <div className="flex flex-col items-center">
       <img src="/assets/empty-search.svg" alt="Sin resultados" />
     </div>
   )}
   ```

4. **Hero Illustration:**
   ```jsx
   <div className="hero-section">
     <img src="/assets/hero-illustration.svg" alt="" className="absolute" />
     <h1>El Compendio de Nae</h1>
   </div>
   ```

---

## Tailwind Config Personalizado

```js
// tailwind.config.js
export default {
  theme: {
    extend: {
      colors: {
        grimoire: {
          desk: '#1a1510',
          parchment: {
            light: '#F5ECD7',
            dark: '#EDE3CC',
          },
          gold: '#C9A84C',
          ink: {
            dark: '#2C1810',
            soft: '#6B5B4E',
          },
          purple: '#3E3140',
          wine: '#8B1A1A',
          forest: '#4A6741',
        },
      },
      fontFamily: {
        serif: ['Georgia', 'Crimson Pro', 'serif'],
      },
    },
  },
}
```

---

## Notas de Implementación

- **Fuentes:** Usar system fonts serif por defecto; opcionalmente cargar Google Fonts
- **SVG Optimization:** Los SVGs ya están optimizados, usar `svgo` si se editan
- **Accesibilidad:** Asegurar contraste mínimo 4.5:1 en textos principales
- **Performance:** Los mockups son SVG (vectorial), escalan sin pérdida
- **Animaciones:** Considerar transiciones suaves al cambiar de página (fade-in de pergamino)

---

**Diseñado por:** Diseñador Web Senior  
**Fecha:** Abril 2026  
**Versión:** 1.0 Premium
