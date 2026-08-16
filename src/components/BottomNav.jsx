const TABS = [
  { id: 'budget',   icon: '💰', label: 'Budget'    },
  { id: 'stats',    icon: '📈', label: 'Stats'     },
  { id: 'forecast', icon: '🔮', label: 'Prévisions'},
  { id: 'history',  icon: '📅', label: 'Historique'},
]

export default function BottomNav({ activeTab, onChangeTab }) {
  return (
    <nav className="bottom-nav" role="tablist" aria-label="Navigation principale">
      {TABS.map(tab => (
        <button
          key={tab.id}
          className={`bottom-nav-item ${activeTab === tab.id ? 'active' : ''}`}
          onClick={() => onChangeTab(tab.id)}
          role="tab"
          aria-selected={activeTab === tab.id}
        >
          <span className="bottom-nav-icon">{tab.icon}</span>
          <span className="bottom-nav-label">{tab.label}</span>
          <span className="bottom-nav-dot" aria-hidden="true" />
        </button>
      ))}
    </nav>
  )
}
