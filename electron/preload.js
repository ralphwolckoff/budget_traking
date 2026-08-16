const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Serveur
  getServerPort:  ()             => ipcRenderer.invoke('get-server-port'),

  // Auth
  authRegister:   (u, p)         => ipcRenderer.invoke('auth-register', u, p),
  authLogin:      (u, p)         => ipcRenderer.invoke('auth-login', u, p),
  authListUsers:  ()             => ipcRenderer.invoke('auth-list-users'),

  // Données
  loadUserData:   (username)     => ipcRenderer.invoke('load-user-data', username),
  saveUserData:   (username, d)  => ipcRenderer.invoke('save-user-data', username, d),

  // Session
  getLastUser:    ()             => ipcRenderer.invoke('get-last-user'),
  setLastUser:    (username)     => ipcRenderer.invoke('set-last-user', username),

  // Gestion du compte
  changePassword:  (u, o, n)     => ipcRenderer.invoke("auth-change-password", u, o, n),
  changeUsername:  (o, p, n)     => ipcRenderer.invoke("auth-change-username", o, p, n),
  deleteAccount:   (u, p)        => ipcRenderer.invoke("auth-delete-account", u, p),

  // Compat. ancienne API (fallback)
  loadData:       ()             => ipcRenderer.invoke('load-user-data', '__legacy__'),
  saveData:       (d)            => ipcRenderer.invoke('save-user-data', '__legacy__', d),
  getDataPath:    ()             => ipcRenderer.invoke('get-server-port').then(p => `Documents/BudgetTracker-Data/users/ (port: ${p})`),
})
