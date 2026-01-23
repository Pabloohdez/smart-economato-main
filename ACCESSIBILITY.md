# Accesibilidad en Smart Economato

Este documento describe los estándares de accesibilidad implementados en el proyecto y guía para mantenerlos.

## Estándares Implementados

### Semántica HTML

- Uso de etiquetas `<main>` para el contenido principal.
- Uso correcto de encabezados `<h1>`, `<h2>`, etc. para la jerarquía.
- Etiquetas `<label>` asociadas explícitamente a los campos de formulario (`for` y `id`).

### Navegación y Foco

- **Tabindex en Grids**: Se ha eliminado `tabindex="0"` de los encabezados de tabla de Grid.js para evitar paradas innecesarias del foco.
- **Indicador de Foco**: Se ha mejorado el `outline` para elementos enfocados (`:focus-visible`) para que sea claramente visible.
- **Skip Links**: Se recomienda (futura implementación) enlaces para saltar al contenido.

### Etiquetas ARIA

- Uso de `aria-label` en botones o enlaces que solo contienen íconos.
- Clases `.visually-hidden` para etiquetas que deben ser leídas por lectores de pantalla pero no mostradas visualmente.

## Estilos de Accesibilidad

El archivo `assets/css/accessibility.css` contiene utilidades:

- `.visually-hidden`: Oculta contenido visualmente pero lo mantiene en el Accessibility Tree.

## Lista de Verificación para Nuevas Funcionalidades

- [ ] ¿Todos los inputs tienen `<label>` asociado?
- [ ] ¿Los botones de íconos tienen `aria-label`?
- [ ] ¿Es posible navegar y operar la función solo con el teclado?
- [ ] ¿El contraste de color es suficiente?
- [ ] ¿El orden del foco es lógico?

## Herramientas de Prueba Recomendadas

- **Lectores de pantalla**: NVDA, Narrator, VoiceOver.
- **Navegadores**: Chrome DevTools (Pestaña Accesibilidad).
- **Extensiones**: axe DevTools, WAVE.
