// Déclarations de type pour les composants JSX sans fichier .tsx
declare module './components/BottomNav' {
  interface BottomNavProps {
    activeTab: string
    onChangeTab: (tab: string) => void
  }
  const BottomNav: (props: BottomNavProps) => JSX.Element | null
  export default BottomNav
}

declare module './components/InstallBanner' {
  const InstallBanner: () => JSX.Element | null
  export default InstallBanner
}