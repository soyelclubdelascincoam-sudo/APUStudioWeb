/**
 * @type {import('tailwindcss').Config}
 * 
 * ¡NOTA IMPORTANTE SOBRE TAILWIND CSS v4!
 * En esta versión (v4.0+), Tailwind CSS utiliza una configuración basada en CSS desde 
 * el archivo principal 'src/index.css' con la directiva '@theme'.
 * 
 * Por lo tanto, este archivo 'tailwind.config.js' NO es necesario para el funcionamiento
 * del plugin 'tailwindcss/vite'. Sin embargo, lo hemos generado aquí a petición tuya para:
 * 1. Brindarte compatibilidad con plugins de editores más antiguos (como VS Code Intellisense)
 *    que podrían buscar este archivo.
 * 2. Mantener la estructura clásica si decides usar utilidades tradicionales.
 * 
 * Para añadir colores, fuentes o extensiones personalizadas de forma moderna, te recomendamos
 * editar directamente tu archivo 'src/index.css' dentro del bloque '@theme'.
 */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
