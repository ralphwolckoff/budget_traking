interface Props {
  theme: string
  onToggle: () => void
}

export default function ThemeToggle({ theme, onToggle }: Props) {
  const isDark = theme === 'dark'
  return (
    <button className="theme-toggle" onClick={onToggle}
      title={`Passer en mode ${isDark ? 'clair' : 'sombre'}`}>
      <div className="theme-toggle-track">
        <div className="theme-toggle-thumb" />
      </div>
      {isDark ? '🌙 Sombre' : '☀️ Clair'}
    </button>
  )
}
