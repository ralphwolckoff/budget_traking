const { app, BrowserWindow, ipcMain, nativeImage } = require('electron')
const path   = require('path')
const fs     = require('fs')
const auth   = require('./auth')
const server = require('./server')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

function getDocumentsPath() {
  return app.getPath('documents')
}

function getIconPath() {
  const candidates = [
    path.join(process.resourcesPath || '', 'icon.ico'),
    path.join(__dirname, '../public/icon.ico'),
    path.join(path.dirname(app.getPath('exe')), 'resources', 'icon.ico'),
  ]
  for (const p of candidates) {
    try { if (fs.existsSync(p)) return p } catch(e) {}
  }
  return null
}

function createWindow() {
  const iconPath = getIconPath()
  const win = new BrowserWindow({
    width: 1400, height: 900,
    minWidth: 960, minHeight: 640,
    icon: iconPath || undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    backgroundColor: '#0F172A',
    show: false,
  })

  if (iconPath) {
    try {
      const icon = nativeImage.createFromPath(iconPath)
      if (!icon.isEmpty()) win.setIcon(icon)
    } catch(e) {}
  }

  win.once('ready-to-show', () => win.show())

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // Démarrer le serveur local
  const port = server.start(getDocumentsPath())
  console.log(`Local server started on port ${port}`)
  createWindow()
})

app.on('window-all-closed', () => {
  server.stop()
  if (process.platform !== 'darwin') app.quit()
})
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// ── IPC : info serveur ────────────────────────────────────────────────────────
ipcMain.handle('get-server-port', () => server.PORT)

// ── IPC : auth ────────────────────────────────────────────────────────────────
ipcMain.handle('auth-register', (_, username, password) => {
  return auth.register(getDocumentsPath(), username, password)
})

ipcMain.handle('auth-login', (_, username, password) => {
  return auth.login(getDocumentsPath(), username, password)
})

ipcMain.handle('auth-list-users', () => {
  return auth.listUsers(getDocumentsPath())
})

// ── IPC : données utilisateur ─────────────────────────────────────────────────
ipcMain.handle('load-user-data', (_, username) => {
  try {
    const p = auth.getUserDataPath(getDocumentsPath(), username)
    if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'))
    return null
  } catch (e) { console.error('load-user-data error:', e); return null }
})

ipcMain.handle('save-user-data', (_, username, data) => {
  try {
    const p   = auth.getUserDataPath(getDocumentsPath(), username)
    const dir = path.dirname(p)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf-8')
    return { success: true }
  } catch (e) { return { success: false, error: e.message } }
})

// ── IPC : session persistante (se souvenir du dernier user) ───────────────────
ipcMain.handle('get-last-user', () => {
  try {
    const p = path.join(getDocumentsPath(), 'BudgetTracker-Data', '.last-user')
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf-8').trim() : null
  } catch(e) { return null }
})

ipcMain.handle('set-last-user', (_, username) => {
  try {
    const dir = path.join(getDocumentsPath(), 'BudgetTracker-Data')
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(path.join(dir, '.last-user'), username, 'utf-8')
  } catch(e) {}
})

ipcMain.handle('auth-change-password', (_, username, oldPwd, newPwd) => {
  return auth.changePassword(getDocumentsPath(), username, oldPwd, newPwd)
})
ipcMain.handle('auth-change-username', (_, oldUser, password, newUser) => {
  return auth.changeUsername(getDocumentsPath(), oldUser, password, newUser)
})
ipcMain.handle('auth-delete-account', (_, username, password) => {
  return auth.deleteAccount(getDocumentsPath(), username, password)
})
