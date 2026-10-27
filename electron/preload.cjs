const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  executeItem: (filePath) => ipcRenderer.invoke('execute-item', filePath),
  selectFile: () => ipcRenderer.invoke('select-file'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  getFileIcon: (filePath) => ipcRenderer.invoke('get-file-icon', filePath),
  readFolderContents: (folderPath) => ipcRenderer.invoke('read-folder-contents', folderPath),
  checkIsDirectory: (filePath) => ipcRenderer.invoke('check-is-directory', filePath),
  registerHotkey: (hotkey) => ipcRenderer.invoke('register-hotkey', hotkey),
  getStartup: () => ipcRenderer.invoke('get-startup'),
  setStartup: (enabled) => ipcRenderer.invoke('set-startup', enabled),
  hideWindow: () => ipcRenderer.send('hide-window'),
  closeApp: () => ipcRenderer.send('close-app'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  openExternalUrl: (url) => ipcRenderer.invoke('open-external-url', url),
  runTerminalUpdate: () => ipcRenderer.invoke('run-terminal-update'),
  onUpdateAvailable: (callback) => {
    const handler = (_, info) => callback(info)
    ipcRenderer.on('update-available', handler)
    return () => ipcRenderer.removeListener('update-available', handler)
  },
  onToggleMenu: (callback) => {
    const handler = (_, shouldOpen) => callback(shouldOpen)
    ipcRenderer.on('toggle-menu', handler)
    return () => ipcRenderer.removeListener('toggle-menu', handler)
  },
  onCloseIfIdle: (callback) => {
    const handler = () => callback()
    ipcRenderer.on('request-close-if-idle', handler)
    return () => ipcRenderer.removeListener('request-close-if-idle', handler)
  }
})
