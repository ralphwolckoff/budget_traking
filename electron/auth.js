const crypto = require('crypto')
const fs     = require('fs')
const path   = require('path')

function getUsersDir(documentsPath) {
  const dir = path.join(documentsPath, 'BudgetTracker-Data', 'users')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getUsersIndex(documentsPath) {
  const file = path.join(getUsersDir(documentsPath), '_index.json')
  if (!fs.existsSync(file)) return {}
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')) } catch(e) { return {} }
}

function saveUsersIndex(documentsPath, index) {
  const file = path.join(getUsersDir(documentsPath), '_index.json')
  fs.writeFileSync(file, JSON.stringify(index, null, 2), 'utf-8')
}

function hashPassword(password, salt) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex')
  return { hash, salt }
}

function verifyPassword(password, salt, storedHash) {
  const { hash } = hashPassword(password, salt)
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(storedHash, 'hex'))
}

function sanitizeUsername(username) {
  return username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

module.exports = {

  register(documentsPath, username, password) {
    const uname = sanitizeUsername(username)
    if (!uname || uname.length < 2) return { success: false, error: "Nom d'utilisateur invalide (min 2 caractères)" }
    if (!password || password.length < 4) return { success: false, error: 'Mot de passe trop court (min 4 caractères)' }
    const index = getUsersIndex(documentsPath)
    if (index[uname]) return { success: false, error: "Ce nom d'utilisateur existe déjà" }
    const { hash, salt } = hashPassword(password)
    index[uname] = { username: uname, hash, salt, createdAt: new Date().toISOString() }
    saveUsersIndex(documentsPath, index)
    return { success: true, username: uname }
  },

  login(documentsPath, username, password) {
    const uname = sanitizeUsername(username)
    const index = getUsersIndex(documentsPath)
    const user  = index[uname]
    if (!user) return { success: false, error: 'Utilisateur introuvable' }
    if (!verifyPassword(password, user.salt, user.hash)) return { success: false, error: 'Mot de passe incorrect' }
    return { success: true, username: uname }
  },

  listUsers(documentsPath) {
    const index = getUsersIndex(documentsPath)
    return Object.keys(index).map(u => ({ username: u, createdAt: index[u].createdAt }))
  },

  getUserDataPath(documentsPath, username) {
    const uname = sanitizeUsername(username)
    return path.join(getUsersDir(documentsPath), `${uname}.json`)
  },

  changePassword(documentsPath, username, oldPassword, newPassword) {
    const uname = sanitizeUsername(username)
    const index = getUsersIndex(documentsPath)
    const user  = index[uname]
    if (!user) return { success: false, error: 'Utilisateur introuvable' }
    if (!verifyPassword(oldPassword, user.salt, user.hash)) return { success: false, error: 'Mot de passe actuel incorrect' }
    if (!newPassword || newPassword.length < 4) return { success: false, error: 'Nouveau mot de passe trop court (min 4 caractères)' }
    const { hash, salt } = hashPassword(newPassword)
    index[uname] = { ...user, hash, salt, updatedAt: new Date().toISOString() }
    saveUsersIndex(documentsPath, index)
    return { success: true }
  },

  changeUsername(documentsPath, oldUsername, password, newUsername) {
    const oldUname = sanitizeUsername(oldUsername)
    const newUname = sanitizeUsername(newUsername)
    if (!newUname || newUname.length < 2) return { success: false, error: 'Nouveau nom invalide (min 2 caractères)' }
    const index = getUsersIndex(documentsPath)
    if (!index[oldUname]) return { success: false, error: 'Utilisateur introuvable' }
    if (!verifyPassword(password, index[oldUname].salt, index[oldUname].hash)) return { success: false, error: 'Mot de passe incorrect' }
    if (index[newUname]) return { success: false, error: "Ce nom d'utilisateur est déjà pris" }
    const oldFile = path.join(getUsersDir(documentsPath), `${oldUname}.json`)
    const newFile = path.join(getUsersDir(documentsPath), `${newUname}.json`)
    if (fs.existsSync(oldFile)) fs.renameSync(oldFile, newFile)
    index[newUname] = { ...index[oldUname], username: newUname }
    delete index[oldUname]
    saveUsersIndex(documentsPath, index)
    return { success: true, username: newUname }
  },

  deleteAccount(documentsPath, username, password) {
    const uname = sanitizeUsername(username)
    const index = getUsersIndex(documentsPath)
    const user  = index[uname]
    if (!user) return { success: false, error: 'Utilisateur introuvable' }
    if (!verifyPassword(password, user.salt, user.hash)) return { success: false, error: 'Mot de passe incorrect' }
    const dataFile = path.join(getUsersDir(documentsPath), `${uname}.json`)
    if (fs.existsSync(dataFile)) fs.unlinkSync(dataFile)
    delete index[uname]
    saveUsersIndex(documentsPath, index)
    return { success: true }
  },
}
