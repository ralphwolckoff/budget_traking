/** @type {import('tailwindcss').Config} */
export default {
    content: [
        './index.html',
        './src/**/*.{js,ts,jsx,tsx,css}',
    ],
    darkMode: ['class', '[data-theme="dark"]'],
    theme: {
        extend: {
            colors: {
                // Bridgé sur les triplets RGB de src/index.css (:root / [data-theme]).
                // Le pattern rgb(var(...) / <alpha-value>) permet les modificateurs
                // d'opacité Tailwind (bg-primary/10, text-danger/80, border-success/30...)
                // tout en suivant automatiquement le thème clair/sombre actif.
                primary: {
                    DEFAULT: 'rgb(var(--primary-rgb) / <alpha-value>)',
                    dark:    'rgb(var(--primary-dark-rgb) / <alpha-value>)',
                },
                secondary: 'rgb(var(--secondary-rgb) / <alpha-value>)',
                success:   'rgb(var(--success-rgb) / <alpha-value>)',
                danger:    'rgb(var(--danger-rgb) / <alpha-value>)',
                warning:   'rgb(var(--warning-rgb) / <alpha-value>)',
                surface: {
                    DEFAULT: 'rgb(var(--dark-rgb) / <alpha-value>)',
                    soft:    'rgb(var(--dark-soft-rgb) / <alpha-value>)',
                    light:   'rgb(var(--dark-lighter-rgb) / <alpha-value>)',
                },
                text: {
                    DEFAULT: 'rgb(var(--text-rgb) / <alpha-value>)',
                    muted:   'rgb(var(--text-muted-rgb) / <alpha-value>)',
                },
                border:     'rgb(var(--border-rgb) / <alpha-value>)',
                'input-bg': 'var(--input-bg)',
                'bs-navy':     '#0B2545',
                'bs-navy-mid': '#154A8A',
                'bs-gold':     '#E8A33D',
                'bs-gold-lt':  '#F2B84B',
            },
            fontFamily: {
                display: ['Outfit', 'sans-serif'],
                mono:    ['JetBrains Mono', 'monospace'],
            },
            boxShadow: {
                card: '0 8px 24px var(--card-shadow)',
                glow: '0 0 0 3px var(--glow)',
            },
            backgroundImage: {
                'bs-gradient': 'var(--bg-gradient)',
            },
            borderRadius: {
                card: '14px',
            },
        },
    },
    plugins: [],
}
