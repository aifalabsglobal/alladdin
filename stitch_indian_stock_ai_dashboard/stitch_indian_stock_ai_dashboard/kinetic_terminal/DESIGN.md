---
name: Kinetic Terminal
colors:
  surface: '#10141a'
  surface-dim: '#10141a'
  surface-bright: '#353940'
  surface-container-lowest: '#0a0e14'
  surface-container-low: '#181c22'
  surface-container: '#1c2026'
  surface-container-high: '#262a31'
  surface-container-highest: '#31353c'
  on-surface: '#dfe2eb'
  on-surface-variant: '#bacbb9'
  inverse-surface: '#dfe2eb'
  inverse-on-surface: '#2d3137'
  outline: '#859585'
  outline-variant: '#3b4a3d'
  surface-tint: '#00e475'
  primary: '#75ff9e'
  on-primary: '#003918'
  primary-container: '#00e676'
  on-primary-container: '#00612e'
  inverse-primary: '#006d35'
  secondary: '#ffb3ae'
  on-secondary: '#68000c'
  secondary-container: '#a00118'
  on-secondary-container: '#ffa8a3'
  tertiary: '#e9dfff'
  on-tertiary: '#370096'
  tertiary-container: '#cfbfff'
  on-tertiary-container: '#5d21df'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#62ff96'
  primary-fixed-dim: '#00e475'
  on-primary-fixed: '#00210b'
  on-primary-fixed-variant: '#005226'
  secondary-fixed: '#ffdad7'
  secondary-fixed-dim: '#ffb3ae'
  on-secondary-fixed: '#410004'
  on-secondary-fixed-variant: '#930015'
  tertiary-fixed: '#e8deff'
  tertiary-fixed-dim: '#cdbdff'
  on-tertiary-fixed: '#20005f'
  on-tertiary-fixed-variant: '#4f00d0'
  background: '#10141a'
  on-background: '#dfe2eb'
  surface-variant: '#31353c'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-mono:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.08em
  headline-md-mobile:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin-desktop: 24px
  margin-mobile: 12px
  container-max: 1440px
---

## Brand & Style

The design system is engineered for the high-velocity environment of the Indian stock market, where data density and precision are paramount. The brand personality is **Intelligent, Precise, Trustworthy, and Cutting-edge**, catering to professional traders and tech-savvy investors who require immediate cognitive processing of complex information.

The visual style is **Modern Fintech**, characterized by:
- **Dark Mode Excellence:** A deep charcoal and navy foundation to reduce eye strain during long trading sessions.
- **Micro-Glassmorphism:** Subtle transparency and backdrop blurs used to maintain context in layered interfaces without sacrificing legibility.
- **High-Precision UI:** Extremely crisp borders, monospaced numerical data, and a focus on "signal over noise."
- **AI Integration:** Distinctive indigo and violet accents signify machine-learning-driven insights and predictive analytics.

## Colors

The palette is optimized for immediate status recognition in a dark environment.

- **Primary (Gains):** Neon Green (#00E676) represents market gains and bullish trends.
- **Secondary (Losses):** Crimson Red (#FF5252) signals losses and bearish activity.
- **Tertiary (Insights):** AI-Purple (#7C4DFF) is reserved exclusively for machine learning signals, automated trade suggestions, and algorithmic insights.
- **Neutrals:** The core interface uses a multi-layered dark scheme. The base is a near-black Navy (#000A12), with surfaces escalating through Charcoal (#161B22) to provide depth.
- **Data Viz:** Use a secondary palette of cyan, amber, and magenta for multi-series charts (Nifty 50 vs. Sensex), ensuring high contrast against the dark background.

## Typography

This design system employs a dual-font strategy to balance readability and technical precision.

- **Interface & Content:** **Inter** is the primary typeface, chosen for its exceptional legibility and neutral tone. It handles complex hierarchical labels and dense text blocks with ease.
- **Numerical Data:** **Geist** (monospaced) is used for all pricing, percentages, and tickers. Monospaced characters ensure that numbers do not "jump" or shift horizontally during real-time updates, which is critical for tracking live market movements.
- **Hierarchy:** Use `label-caps` for table headers and section overviews to create clear visual boundaries. Reserve `display-lg` for portfolio totals and major indices.

## Layout & Spacing

The layout utilizes a **Fluid Grid** model designed for high-density information display, maximizing the use of screen real estate.

- **Grid:** A 12-column grid system for desktop, collapsing to 4 columns on mobile. 
- **Density:** This design system prioritizes a "Compact" spacing rhythm. Use 4px increments for internal component spacing and 16px for gutters between major dashboard widgets.
- **Responsive Behavior:** 
  - **Desktop:** Widgets are modular; sidebars for watchlists should be collapsible to maximize chart area.
  - **Tablet:** 2-column view with a focus on the primary price chart.
  - **Mobile:** Single-column vertical scroll. Sticky headers for the ticker symbol and current price are mandatory.

## Elevation & Depth

Hierarchy is established through **Tonal Layering** and **Micro-Glassmorphism** rather than traditional heavy shadows.

- **Base Layer:** The deepest neutral color (#000A12).
- **Surface Layer:** Dashboard widgets sit on #161B22 with a 1px solid border at 8% white opacity.
- **Overlay Layer:** Modals and dropdowns use a 70% opacity background with a 20px backdrop blur to create a frosted glass effect. This allows the user to maintain a sense of the market movement happening "behind" the active task.
- **Interaction:** On hover, cards should increase border brightness (to 20% white) and apply a subtle 2px vertical offset to indicate interactivity.

## Shapes

The shape language is **Soft** and professional. 

- **Corners:** A base radius of 4px (`rounded-sm`) is used for buttons and input fields to maintain a technical, "engineered" feel. 
- **Widgets:** Major dashboard containers use an 8px (`rounded-lg`) radius to provide a slight visual softening against the dense data.
- **Indicators:** Price movement indicators (up/down arrows) should use sharp geometric triangles to emphasize directionality.

## Components

- **Buttons:**
  - **Primary (Buy):** Solid Neon Green with black text.
  - **Secondary (Sell):** Outlined Crimson Red with red text.
  - **Ghost:** Transparent with white text for utility actions like "Export" or "Settings."
- **Data Tables:**
  - Rows should feature a subtle hover state (#FFFFFF at 3% opacity).
  - Ticker symbols must be bolded.
  - Real-time price updates should trigger a momentary "flash" background color (green or red) at 10% opacity.
- **Input Fields:**
  - Minimalist design with a bottom-border only or a very subtle 1px outline.
  - Focus state uses the AI-Purple (#7C4DFF) to signify active data entry.
- **Chips & Tags:**
  - Use small, low-profile chips for "Sector" or "Volatility" tags.
  - Text-only tags for status (e.g., "MARKET OPEN") with a small pulsing dot indicator.
- **Charts:**
  - Candlestick charts should use the Primary and Secondary colors.
  - Volume bars should be semi-transparent to sit behind price action without cluttering the view.
- **Machine Learning Insights:** 
  - Special cards with a thin violet border gradient and a "sparkle" icon to denote AI-generated content.