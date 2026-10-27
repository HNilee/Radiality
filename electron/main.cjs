const { app, BrowserWindow, globalShortcut, ipcMain, shell, dialog, Tray, Menu, nativeImage, screen } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn, execFileSync } = require('child_process')

let mainWindow = null
let tray = null
let currentHotkey = 'Alt+Space'
let lastHotkeyTime = 0
let focusTime = 0

// File path for persistent configuration
function getConfigPath() {
  const userDataPath = app.getPath('userData')
  const newPath = path.join(userDataPath, 'radiality-config.json')
  const oldPath = path.join(userDataPath, 'radial-config.json')
  if (!fs.existsSync(newPath) && fs.existsSync(oldPath)) {
    try {
      fs.copyFileSync(oldPath, newPath)
    } catch (e) {}
  }
  return newPath
}

const isMac = process.platform === 'darwin'
const isWin = process.platform === 'win32'

const DEFAULT_CONFIG = {
  hotkey: isMac ? 'Alt+Space' : 'Alt+Space',
  theme: 'dark',
  radius: 140,
  openAtLogin: false,
  items: isMac
    ? [
        {
          id: 'textedit',
          label: 'TextEdit',
          path: '/System/Applications/TextEdit.app',
          icon: 'FileText'
        },
        {
          id: 'finder',
          label: 'Finder',
          path: '/System/Library/CoreServices/Finder.app',
          icon: 'Folder'
        },
        {
          id: 'calculator',
          label: 'Calculator',
          path: '/System/Applications/Calculator.app',
          icon: 'Calculator'
        },
        {
          id: 'terminal',
          label: 'Terminal',
          path: '/System/Applications/Utilities/Terminal.app',
          icon: 'Terminal'
        }
      ]
    : [
        {
          id: 'notepad',
          label: 'Notepad',
          path: 'C:\\Windows\\notepad.exe',
          icon: 'FileText'
        },
        {
          id: 'explorer',
          label: 'File Explorer',
          path: 'C:\\Windows\\explorer.exe',
          icon: 'Folder'
        },
        {
          id: 'calc',
          label: 'Calculator',
          path: 'calc.exe',
          icon: 'Calculator'
        },
        {
          id: 'cmd',
          label: 'Command Prompt',
          path: 'cmd.exe',
          icon: 'Terminal'
        }
      ]
}

function loadConfig() {
  try {
    const configPath = getConfigPath()
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8')
      const parsed = JSON.parse(data)
      // Normalize radius if user had old 170
      if (parsed.radius === 170) parsed.radius = 140
      return { ...DEFAULT_CONFIG, ...parsed }
    }
  } catch (err) {
    console.error('Error loading config:', err)
  }
  return DEFAULT_CONFIG
}

function saveConfig(config) {
  try {
    const configPath = getConfigPath()
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error('Error saving config:', err)
    return false
  }
}

function createWindow() {
  const winWidth = 880
  const winHeight = 880
  const iconPath = isMac 
    ? path.join(__dirname, '../public/icon.png')
    : path.join(__dirname, '../public/icon.ico')

  mainWindow = new BrowserWindow({
    width: winWidth,
    height: winHeight,
    center: true,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    show: false,
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    vibrancy: isMac ? 'under-window' : undefined,
    visualEffectState: isMac ? 'active' : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
    }
  })

  mainWindow.setBackgroundColor('#00000000')

  mainWindow.on('focus', () => {
    focusTime = Date.now()
  })

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged
  if (isDev && process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    if (!process.argv.includes('--hidden')) {
      showCentered()
    }
  })
}

function showCentered() {
  if (!mainWindow) return
  try {
    mainWindow.center()
  } catch (err) {
    console.error('Error centering window:', err)
  }
  mainWindow.show()
  mainWindow.focus()
  focusTime = Date.now()
  mainWindow.webContents.send('toggle-menu', true)
}

function handleHotkeyTrigger() {
  const now = Date.now()
  if (now - lastHotkeyTime < 450) {
    return
  }
  lastHotkeyTime = now
  showCentered()
}

function registerGlobalHotkey(shortcut) {
  try {
    globalShortcut.unregisterAll()
    const ret = globalShortcut.register(shortcut, () => {
      handleHotkeyTrigger()
    })

    if (!ret) {
      console.warn(`Registration of hotkey ${shortcut} failed`)
      return false
    }
    currentHotkey = shortcut
    return true
  } catch (err) {
    console.error('Error registering hotkey:', err)
    return false
  }
}

function createTray() {
  const iconPath = path.join(__dirname, '../public/icon.png')
  let trayIcon
  if (fs.existsSync(iconPath)) {
    trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  } else {
    const size = 16
    const iconCanvas = Buffer.alloc(size * size * 4)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4
        const dx = x - size / 2
        const dy = y - size / 2
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= size / 2 - 1) {
          iconCanvas[idx] = 99
          iconCanvas[idx + 1] = 102
          iconCanvas[idx + 2] = 241
          iconCanvas[idx + 3] = 255
        }
      }
    }
    trayIcon = nativeImage.createFromBuffer(iconCanvas, { width: size, height: size })
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('Radiality Toolbar')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Radiality',
      click: () => showCentered()
    },
    { type: 'separator' },
    {
      label: isMac ? 'Quit Radiality' : 'Exit',
      click: () => {
        app.isQuitting = true
        app.quit()
      }
    }
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    showCentered()
  })
}

// IPC Handlers
ipcMain.handle('get-config', async () => {
  const cfg = loadConfig()
  let hasUpdates = false

  // Automatically detect and populate native icons for any file/app items missing them
  if (Array.isArray(cfg.items)) {
    for (const item of cfg.items) {
      if (item.path && !item.nativeIcon && item.icon !== 'Folder') {
        try {
          const isDir = fs.existsSync(item.path) && fs.statSync(item.path).isDirectory()
          if (!isDir) {
            const iconData = await extractNativeIcon(item.path)
            if (iconData) {
              item.nativeIcon = iconData
              hasUpdates = true
            }
          }
        } catch (e) {}
      }
    }
  }

  if (hasUpdates) {
    saveConfig(cfg)
  }

  return cfg
})

ipcMain.handle('save-config', async (_, config) => {
  return saveConfig(config)
})

ipcMain.handle('register-hotkey', async (_, hotkey) => {
  const success = registerGlobalHotkey(hotkey)
  if (success) {
    const cfg = loadConfig()
    cfg.hotkey = hotkey
    saveConfig(cfg)
    return { success: true }
  } else {
    return { success: false, error: 'Kombinasi hotkey tidak valid atau sedang digunakan aplikasi lain.' }
  }
})

ipcMain.handle('get-startup', async () => {
  try {
    const settings = app.getLoginItemSettings()
    return settings.openAtLogin
  } catch {
    return false
  }
})

ipcMain.handle('set-startup', async (_, enabled) => {
  try {
    app.setLoginItemSettings({
      openAtLogin: !!enabled,
      path: process.execPath,
      args: ['--hidden']
    })
    const cfg = loadConfig()
    cfg.openAtLogin = !!enabled
    saveConfig(cfg)
    return app.getLoginItemSettings().openAtLogin
  } catch (err) {
    console.error('Failed to set login item settings:', err)
    return false
  }
})

// Extract high-resolution Windows native icon (.exe, .lnk, etc.)
async function extractNativeIcon(filePath) {
  if (!filePath) return null

  try {
    let target = filePath.trim()

    // 1. If it's a .lnk shortcut, resolve the actual target file and any custom icon path
    if (target.toLowerCase().endsWith('.lnk')) {
      try {
        const link = shell.readShortcutLink(target)
        if (link) {
          // If the shortcut points to a custom icon file
          if (link.icon && fs.existsSync(link.icon)) {
            const iconExt = path.extname(link.icon).toLowerCase()
            if (['.ico', '.png', '.jpg', '.jpeg'].includes(iconExt)) {
              try {
                const iconBuf = fs.readFileSync(link.icon)
                const mime = iconExt === '.ico' ? 'image/x-icon' : 'image/png'
                return `data:${mime};base64,${iconBuf.toString('base64')}`
              } catch (e) {}
            }
          }
          if (link.target && fs.existsSync(link.target)) {
            target = link.target
          }
        }
      } catch (e) {
        console.warn('Failed to resolve .lnk shortcut:', e)
      }
    }

    // 2. Direct image or icon files (.ico, .png, etc.)
    const ext = path.extname(target).toLowerCase()
    if (['.ico', '.png', '.jpg', '.jpeg', '.svg'].includes(ext) && fs.existsSync(target)) {
      try {
        const fileData = fs.readFileSync(target)
        const mime = ext === '.ico' ? 'image/x-icon' : ext === '.svg' ? 'image/svg+xml' : 'image/png'
        return `data:${mime};base64,${fileData.toString('base64')}`
      } catch (e) {}
    }

    // 3. Try native Electron app.getFileIcon
    if (fs.existsSync(target)) {
      try {
        const icon = await app.getFileIcon(target, { size: 'large' })
        if (icon && !icon.isEmpty()) {
          const dataUrl = icon.toDataURL()
          if (dataUrl && dataUrl.length > 80) {
            return dataUrl
          }
        }
      } catch (e) {}

      try {
        const iconNormal = await app.getFileIcon(target, { size: 'normal' })
        if (iconNormal && !iconNormal.isEmpty()) {
          const dataUrl = iconNormal.toDataURL()
          if (dataUrl && dataUrl.length > 80) {
            return dataUrl
          }
        }
      } catch (e) {}
    }

    // 4. Bulletproof Windows .NET ExtractAssociatedIcon via PowerShell
    if (fs.existsSync(target)) {
      try {
        const escaped = target.replace(/'/g, "''")
        const psCommand = `Add-Type -AssemblyName System.Drawing; [System.IO.MemoryStream]$ms = New-Object System.IO.MemoryStream; [System.Drawing.Icon]::ExtractAssociatedIcon('${escaped}').ToBitmap().Save($ms, [System.Drawing.Imaging.ImageFormat]::Png); [Convert]::ToBase64String($ms.ToArray())`
        const result = execFileSync('powershell.exe', [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          psCommand
        ], {
          encoding: 'utf8',
          timeout: 4000,
          windowsHide: true
        })

        const trimmed = result.trim()
        if (trimmed && trimmed.length > 50) {
          return `data:image/png;base64,${trimmed}`
        }
      } catch (psErr) {
        console.warn('PowerShell icon extraction fallback failed:', psErr)
      }
    }
  } catch (err) {
    console.warn('extractNativeIcon error:', err)
  }

  return null
}

// Automatically detect category icon based on file name, extension, and content
function detectCategoryIcon(filePath, fileName = '') {
  const name = (fileName || path.basename(filePath || '')).toLowerCase()
  const ext = path.extname(filePath || '').toLowerCase()

  // Development & Coding
  if (
    name.includes('code') || name.includes('studio') || name.includes('dev') ||
    name.includes('git') || name.includes('py') || name.includes('sublime') ||
    name.includes('terminal') || name.includes('cmd') || name.includes('powershell') ||
    name.includes('bash') || name.includes('node') || name.includes('npm') ||
    name.includes('intellij') || name.includes('eclipse') || name.includes('webstorm') ||
    ['.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.py', '.cpp', '.c', '.cs', '.rs', '.go', '.java', '.sh', '.ps1', '.bat'].includes(ext)
  ) {
    if (name.includes('terminal') || name.includes('cmd') || name.includes('powershell') || name.includes('bash')) {
      return 'Terminal'
    }
    return 'Code'
  }

  // Games & Gaming
  if (
    name.includes('game') || name.includes('growtopia') || name.includes('steam') ||
    name.includes('epic') || name.includes('riot') || name.includes('valorant') ||
    name.includes('minecraft') || name.includes('roblox') || name.includes('play') ||
    name.includes('genshin') || name.includes('honkai') || name.includes('league') ||
    name.includes('dota') || name.includes('csgo') || name.includes('gta') ||
    name.includes('battle.net') || name.includes('origin') || name.includes('ubisoft')
  ) {
    return 'Gamepad2'
  }

  // Web Browsers
  if (
    name.includes('chrome') || name.includes('firefox') || name.includes('edge') ||
    name.includes('brave') || name.includes('opera') || name.includes('browser') ||
    name.includes('vivaldi') || name.includes('tor') || ['.url', '.htm', '.html'].includes(ext)
  ) {
    return 'Globe'
  }

  // Music & Audio
  if (
    name.includes('spotify') || name.includes('music') || name.includes('itunes') ||
    name.includes('fl studio') || name.includes('audacity') || name.includes('sound') ||
    ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'].includes(ext)
  ) {
    return 'Music'
  }

  // Video & Streaming
  if (
    name.includes('obs') || name.includes('player') || name.includes('vlc') ||
    name.includes('premiere') || name.includes('davinci') || name.includes('stream') ||
    name.includes('cinema') || name.includes('netflix') ||
    ['.mp4', '.mkv', '.avi', '.mov', '.wmv', '.webm'].includes(ext)
  ) {
    return 'Video'
  }

  // Camera & Image Editing
  if (
    name.includes('photo') || name.includes('photoshop') || name.includes('lightroom') ||
    name.includes('gimp') || name.includes('canva') || name.includes('camera') ||
    name.includes('paint') || name.includes('figma') ||
    ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.svg', '.bmp', '.psd'].includes(ext)
  ) {
    return 'Image'
  }

  // Messaging & Chat
  if (
    name.includes('discord') || name.includes('telegram') || name.includes('slack') ||
    name.includes('whatsapp') || name.includes('teams') || name.includes('messenger') ||
    name.includes('zoom') || name.includes('skype') || name.includes('chat')
  ) {
    return 'MessageSquare'
  }

  // Mail & Communication
  if (name.includes('mail') || name.includes('outlook') || name.includes('thunderbird')) {
    return 'Mail'
  }

  // Calculator & Finance
  if (name.includes('calc') || name.includes('excel') || name.includes('spreadsheet')) {
    return 'Calculator'
  }

  // System & Executable Default
  if (['.exe', '.lnk'].includes(ext)) {
    return 'Cpu'
  }

  // Documents
  if (['.doc', '.docx', '.pdf', '.txt', '.rtf', '.md', '.csv', '.xlsx'].includes(ext) || name.includes('note') || name.includes('word')) {
    return 'FileText'
  }

  return 'FileText'
}

// Flexible file picker: supports ANY file of any extension, images, icons, docs, executables
ipcMain.handle('select-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select File, Document, Icon, Image, or Application',
    properties: ['openFile'],
    filters: [
      { name: 'All Files (*.*)', extensions: ['*'] }
    ]
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const selectedPath = result.filePaths[0]
  const parsed = path.parse(selectedPath)
  let cleanName = parsed.name
  if (cleanName.endsWith('.exe')) cleanName = cleanName.slice(0, -4)

  const nativeIcon = await extractNativeIcon(selectedPath)
  const detectedIcon = detectCategoryIcon(selectedPath, cleanName)

  return {
    canceled: false,
    filePath: selectedPath,
    fileName: cleanName,
    detectedIcon,
    nativeIcon
  }
})

// Flexible folder picker: supports selecting ANY folder
ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Folder / Directory',
    properties: ['openDirectory']
  })

  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true }
  }

  const selectedFolder = result.filePaths[0]
  const folderName = path.basename(selectedFolder) || selectedFolder

  return {
    canceled: false,
    folderPath: selectedFolder,
    folderName: folderName,
    detectedIcon: 'Folder'
  }
})

// Get native icon on demand
ipcMain.handle('get-file-icon', async (_, filePath) => {
  return extractNativeIcon(filePath)
})

// Check if a path is a directory
ipcMain.handle('check-is-directory', async (_, filePath) => {
  if (!filePath) return false
  try {
    return fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()
  } catch {
    return false
  }
})

// Read folder contents for radial branch on hover
ipcMain.handle('read-folder-contents', async (_, folderPath) => {
  if (!folderPath) return []
  try {
    if (!fs.existsSync(folderPath)) return []
    const stat = fs.statSync(folderPath)
    if (!stat.isDirectory()) return []

    const entries = fs.readdirSync(folderPath, { withFileTypes: true })
    const result = []

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name.startsWith('$') || entry.name === 'desktop.ini') continue

      const isDir = entry.isDirectory()
      const fullPath = path.join(folderPath, entry.name)
      let icon = 'FileText'

      if (isDir) {
        icon = 'Folder'
      } else {
        const ext = path.extname(entry.name).toLowerCase()
        if (['.exe', '.lnk', '.bat', '.cmd', '.ps1'].includes(ext)) icon = 'Cpu'
        else if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.svg'].includes(ext)) icon = 'Image'
        else if (['.mp4', '.mkv', '.avi', '.mov'].includes(ext)) icon = 'Video'
        else if (['.mp3', '.wav', '.flac', '.aac'].includes(ext)) icon = 'Music'
        else if (['.js', '.ts', '.tsx', '.jsx', '.json', '.html', '.css', '.py', '.cpp', '.c', '.rs'].includes(ext)) icon = 'Code'
        else if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(ext)) icon = 'Package'
      }

      result.push({
        name: entry.name,
        path: fullPath,
        isDirectory: isDir,
        icon
      })

      if (result.length >= 6) break
    }

    return result
  } catch (err) {
    console.error('Error reading folder contents:', err)
    return []
  }
})

ipcMain.handle('execute-item', async (_, rawPath) => {
  if (!rawPath) return { success: false, error: 'Path is empty' }

  try {
    let target = rawPath.trim()
    if (target.startsWith('http://') || target.startsWith('https://')) {
      await shell.openExternal(target)
      return { success: true }
    }

    target = path.resolve(target)
    if (!fs.existsSync(target)) {
      return { success: false, error: `Target does not exist: ${target}` }
    }

    const stat = fs.statSync(target)

    // 1. Directories / Folders
    if (stat.isDirectory()) {
      if (isMac) {
        spawn('open', [target], { detached: true, stdio: 'ignore' }).unref()
      } else {
        spawn('explorer.exe', [target], { detached: true, stdio: 'ignore' }).unref()
      }
      return { success: true }
    }

    // 2. macOS .app bundles or executables
    const ext = path.extname(target).toLowerCase()
    if (isMac && (ext === '.app' || target.includes('.app'))) {
      spawn('open', [target], { detached: true, stdio: 'ignore' }).unref()
      return { success: true }
    }

    if (['.exe', '.bat', '.cmd'].includes(ext)) {
      const child = spawn(target, [], {
        cwd: path.dirname(target),
        detached: true,
        stdio: 'ignore'
      })
      child.unref()
      return { success: true }
    }

    // 3. Documents, Media, Shortcuts (.lnk), etc.
    const openErr = await shell.openPath(target)
    if (!openErr) {
      return { success: true }
    }

    // 4. Shell start fallback
    if (isMac) {
      spawn('open', [target], { detached: true, stdio: 'ignore' }).unref()
    } else {
      spawn('cmd.exe', ['/c', 'start', '""', target], {
        detached: true,
        stdio: 'ignore'
      }).unref()
    }

    return { success: true }
  } catch (err) {
    console.error('Execution error:', err)
    return { success: false, error: err.message }
  }
})

ipcMain.on('hide-window', () => {
  if (mainWindow) {
    mainWindow.hide()
  }
})

ipcMain.on('close-app', () => {
  app.isQuitting = true
  app.quit()
})

// ==========================================
// AUTO-UPDATE & MANDATORY UPDATE SYSTEM
// ==========================================
const GITHUB_REPO = 'HNilee/Radiality'
let CURRENT_VERSION = '1.0.10'
try {
  CURRENT_VERSION = require('../package.json').version || '1.0.10'
} catch (e) {}

function parseSemver(v) {
  if (!v) return [0, 0, 0]
  const clean = v.replace(/^v/i, '').trim()
  const parts = clean.split('.').map((n) => parseInt(n, 10) || 0)
  while (parts.length < 3) parts.push(0)
  return parts
}

function isVersionGreater(v1, v2) {
  const p1 = parseSemver(v1)
  const p2 = parseSemver(v2)
  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return true
    if (p1[i] < p2[i]) return false
  }
  return false
}

async function checkRemoteUpdate() {
  const versionUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/version.json?t=${Date.now()}`
  try {
    const res = await fetch(versionUrl, {
      headers: { 'User-Agent': 'Radiality-App' },
      signal: AbortSignal.timeout(5000)
    })
    if (res.ok) {
      const data = await res.json()
      const latestVer = data.latestVersion || '1.0.0'
      const minVer = data.minRequiredVersion || latestVer
      const hasUpdate = isVersionGreater(latestVer, CURRENT_VERSION)
      const mandatory = Boolean(data.mandatory || isVersionGreater(minVer, CURRENT_VERSION))
      return {
        hasUpdate,
        mandatory: hasUpdate && mandatory,
        currentVersion: CURRENT_VERSION,
        latestVersion: latestVer,
        title: data.title || `Radiality v${latestVer} Available`,
        releaseNotes: data.releaseNotes || 'A new update is available.',
        downloadUrl: data.downloadUrl || `https://github.com/${GITHUB_REPO}/releases/latest`
      }
    }
  } catch (err) {
    console.log('version.json fetch error, trying GitHub API fallback:', err.message)
  }

  // Fallback to GitHub Releases API
  try {
    const apiRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      headers: { 'User-Agent': 'Radiality-App' },
      signal: AbortSignal.timeout(5000)
    })
    if (apiRes.ok) {
      const release = await apiRes.json()
      const tagVer = (release.tag_name || '1.0.0').replace(/^v/i, '')
      const hasUpdate = isVersionGreater(tagVer, CURRENT_VERSION)
      return {
        hasUpdate,
        mandatory: hasUpdate,
        currentVersion: CURRENT_VERSION,
        latestVersion: tagVer,
        title: release.name || `Radiality v${tagVer} Available`,
        releaseNotes: release.body || 'A new release is available on GitHub.',
        downloadUrl: release.html_url || `https://github.com/${GITHUB_REPO}/releases/latest`
      }
    }
  } catch (apiErr) {
    console.log('GitHub releases API error:', apiErr.message)
  }

  return {
    hasUpdate: false,
    currentVersion: CURRENT_VERSION
  }
}

ipcMain.handle('check-for-updates', async () => {
  return await checkRemoteUpdate()
})

ipcMain.handle('open-external-url', async (_, url) => {
  if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
    shell.openExternal(url)
  }
})

ipcMain.handle('run-terminal-update', async () => {
  try {
    const isWindows = process.platform === 'win32'
    const isMacOS = process.platform === 'darwin'

    if (isWindows) {
      // Launch a new, visible PowerShell window running npx radiality@latest
      const psCommand = "Start-Process powershell.exe -ArgumentList '-NoExit', '-Command', 'Write-Host `\"Launching Radiality Updater...`\" -ForegroundColor Cyan; npx radiality@latest'"
      spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', psCommand], {
        detached: true,
        stdio: 'ignore'
      }).unref()
    } else if (isMacOS) {
      // Spawn macOS Terminal.app running npx radiality@latest
      const script = 'tell application "Terminal" to do script "npx radiality@latest"'
      spawn('osascript', ['-e', script, '-e', 'tell application "Terminal" to activate'], {
        detached: true,
        stdio: 'ignore'
      }).unref()
    }

    // Gracefully quit this instance after 1.5s to unlock files for replacement
    setTimeout(() => {
      app.isQuitting = true
      app.quit()
    }, 1500)

    return { success: true }
  } catch (err) {
    console.error('Failed to launch terminal updater:', err)
    return { success: false, error: err.message }
  }
})

app.whenReady().then(() => {
  const cfg = loadConfig()
  currentHotkey = cfg.hotkey || 'Alt+Space'

  createWindow()
  createTray()
  registerGlobalHotkey(currentHotkey)

  // Background update check after startup
  setTimeout(async () => {
    try {
      const updateInfo = await checkRemoteUpdate()
      if (updateInfo.hasUpdate && mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('update-available', updateInfo)
        if (updateInfo.mandatory) {
          mainWindow.show()
          mainWindow.focus()
        }
      }
    } catch (e) {
      // Ignore background check errors
    }
  }, 2000)

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Keep running in tray
  }
})
