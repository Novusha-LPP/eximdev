<UI_DESIGN_INSTRUCTIONS>
You are tasked with building or refactoring a React component. You MUST strictly adhere to the "Project Nucleus" design system guidelines below. Do not use standard Material-UI (MUI) structural components like `<Card>`, `<Paper>`, `<Box>`, `<Typography>`, or `<Table>`. Instead, use native semantic HTML (`div`, `span`, `table`, `button`) styled via an injected `<style>` block at the top of the component.

**1. Core Aesthetic (Glassmorphism & Gradients)**
- **Theme**: Modern Executive Command Center.
- **Glassmorphism**: Use semi-transparent white backgrounds with strong blur effects. Standard card background: `background: rgba(255, 255, 255, 0.8); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.5);`
- **Shadows**: Soft, multi-layered drop shadows (e.g., `box-shadow: 0 8px 32px rgba(0, 0, 0, 0.04), 0 1px 4px rgba(0, 0, 0, 0.02);`).
- **Primary Gradient**: For active states, primary headers, or standout elements, use the signature cool indigo-to-purple gradient: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`.

**2. Color Palette**
- **Text Primary**: `#0f172a` (Heavy weight for metrics/titles)
- **Text Secondary**: `#1e293b` (Standard reading text)
- **Text Muted**: `#64748b` (Subtitles, labels, table headers)
- **Borders**: `rgba(226, 232, 240, 0.6)`
- **Semantic Colors**: 
  - Success/Star: `#10b981` (Emerald)
  - Info/Engine: `#3b82f6` (Blue)
  - Warning/Amber: `#f59e0b` (Amber)
  - Danger/Drainer: `#ef4444` (Red)
  - Specialist: `#8b5cf6` (Purple)

**3. Typography**
- **Primary Font**: `Inter` (import from Google Fonts: `wght@300;400;500;600;700;800;900`).
- **Numerical/Stats Font**: Use a monospace stack (`'SF Mono', 'Cascadia Code', 'Fira Code', monospace`) for large numbers and metrics to ensure vertical alignment.
- **Headers**: Heavily weighted (e.g., `font-weight: 800`, `letter-spacing: -0.02em`).

**4. Required CSS Classes & Structures**
You must include a `<style>` block generating the following classes:
- `.report-root-container`: Flex column, Inter font, gap 24-28px.
- `.report-header`: Sticky top, glass background, flex row, contains title and `.nucleus-tab-container`.
- `.nucleus-tab-container` / `.nucleus-tab-btn`: Pill-shaped, floating tab navigation. Active state uses the primary gradient and white text.
- `.nucleus-stats-card`: Glassmorphism card. Must have a hover effect (`transform: translateY(-4px);`).
- `.nucleus-table-wrapper` / `.nucleus-table`: Clean table design. Headers have a subtle vertical gradient (`linear-gradient(180deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.9) 100%)`). Rows have a bottom border, no side borders.
- `.status-pill`: Used for tags. `border-radius: 999px`, `text-transform: uppercase`, `font-size: 11.5px`, `font-weight: 600`. Uses semantic color backgrounds at 10% opacity with text at 100% opacity.

**5. Implementation Rules**
- Inject the CSS inside the component using `<style>{\` ... \`}</style>`.
- Only use MUI for interactive form controls (`TextField select`, `Dialog`, `Drawer`, `IconButton`).
- Keep padding generous (e.g., `20px 24px` for cards).
</UI_DESIGN_INSTRUCTIONS>
