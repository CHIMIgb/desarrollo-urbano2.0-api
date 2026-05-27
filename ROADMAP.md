# 🚀 Roadmap y Deuda Técnica (API)

Este documento contiene sugerencias arquitectónicas y mejoras técnicas identificadas durante el desarrollo inicial. Estas tareas no son bloqueantes para el MVP, pero son altamente recomendadas para escalar la aplicación a nivel Enterprise.

## 1. Validaciones Robustas (Schema Validation)
Actualmente los controladores realizan validaciones manuales (ej. `if (!username || !password) throw Error`). Esto funciona para flujos básicos, pero a medida que la app crezca (ej. validar que un polígono de MapLibre tenga coordenadas válidas de GeoJSON), estos `if` serán inmanejables.

**Plan de Acción:**
- Integrar una librería de validación de esquemas como **Zod** o **Joi**.
- Crear un middleware a nivel de Rutas (`routes/`) para interceptar peticiones malformadas. De esta forma, las peticiones inválidas nunca llegarán al controlador.

## 2. Migración a TypeScript
El Frontend está construido en TypeScript fuertemente tipado, mientras que el Backend utiliza CommonJS (`require` de Node.js). 

**Plan de Acción:**
- Inicializar `tsc` en el backend.
- Migrar gradualmente los archivos `.js` a `.ts`.
- **Beneficio Principal:** Prevención de errores en tiempo de ejecución ("Cannot read properties of undefined"), mejor autocompletado en el editor y la posibilidad de compartir las interfaces/tipos (ej. los atributos de los polígonos) directamente con el Frontend para asegurar consistencia total.

## 3. Pruebas Automatizadas (Unit Testing)
Actualmente no existe una infraestructura de pruebas automatizadas en la API.

**Plan de Acción:**
- Instalar **Vitest** o **Jest**.
- Configurar pruebas unitarias enfocadas primeramente en el directorio `services/`, donde reside la lógica de negocio real.
- **Caso Crítico:** Para un software de diseño urbano, las funciones matemáticas que calculen áreas (CUS, COS, metrajes de espacios públicos) deben tener pruebas estrictas. Entregar cálculos erróneos a ingenieros, arquitectos o clientes puede tener consecuencias legales o de costos severas.
