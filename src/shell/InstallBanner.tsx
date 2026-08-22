import { useState, useEffect } from 'react'

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [dismissed, setDismissed] = useState(() => sessionStorage.getItem('bt-install-dismissed') === '1')
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const ua = window.navigator.userAgent
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const isStandalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true

  if (dismissed || isStandalone || (!deferredPrompt && !isIOS)) return null

  const dismiss = () => {
    sessionStorage.setItem('bt-install-dismissed', '1')
    setDismissed(true)
  }

  const handleInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    await deferredPrompt.userChoice
    setDeferredPrompt(null)
    dismiss()
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[400] flex items-center gap-3 py-2.5 px-4 bg-gradient-to-r from-primary to-primary-dark text-white text-[0.85rem] shadow-[0_2px_12px_rgba(0,0,0,0.2)] animate-[slideDown_0.4s_ease-out]">
      <span className="text-xl flex-shrink-0">📲</span>
      <div className="flex-1 min-w-0">
        {isIOS
          ? <span>Installez BuildStack Budget : appuyez sur <strong>Partager</strong> puis <strong>« Sur l'écran d'accueil »</strong>.</span>
          : <span>Installez <strong>BuildStack Budget</strong> pour un accès rapide, même hors ligne.</span>
        }
      </div>
      {!isIOS && deferredPrompt && (
        <button onClick={handleInstall}
          className="flex-shrink-0 py-1.5 px-3.5 rounded-lg bg-white text-primary text-[0.82rem] font-bold cursor-pointer transition-transform hover:scale-105">
          Installer
        </button>
      )}
      <button onClick={dismiss} title="Fermer"
        className="flex-shrink-0 bg-transparent border-none text-white/80 cursor-pointer text-base p-1 hover:text-white">
        ✕
      </button>
    </div>
  )
}