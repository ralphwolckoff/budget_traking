# 💰 Budget Tracker — Portable Windows (Electron + Vite/React)

## Prérequis
- **Node.js** v18+ → https://nodejs.org

## Lancer en développement
```bash
npm install
npm run dev
```

## Générer le .exe portable
```bash
npm install
npm run build
```
Le fichier `BudgetTracker-Portable.exe` sera généré dans `dist-electron/`.

## Mode portable
- **Double-clic** sur `BudgetTracker-Portable.exe` — aucune installation requise
- Les données sont sauvegardées dans un dossier **`BudgetTracker-Data/`** créé automatiquement **à côté du .exe**
- Vous pouvez déplacer le `.exe` n'importe où, tant que le dossier `BudgetTracker-Data/` est à côté

## Structure
```
budget-tracker/
├── electron/
│   ├── main.js       ← fenêtre + IPC + chemin données portable
│   └── preload.js    ← bridge sécurisé
├── src/
│   ├── App.jsx
│   ├── constants.js
│   ├── storage.js
│   ├── index.css
│   └── components/
│       ├── MonthPaginator.jsx
│       ├── DashboardCards.jsx
│       ├── AddExpenseForm.jsx
│       ├── ExpenseList.jsx
│       ├── StatsPage.jsx
│       ├── HistoryPage.jsx
│       └── Modals.jsx
├── index.html
├── vite.config.js
└── package.json
```
