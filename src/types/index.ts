export interface MenuItem {
  id: string
  label: string
  path: string
  icon: string
  color?: string
  nativeIcon?: string
  isStatic?: boolean
}

export interface FolderContentItem {
  name: string
  path: string
  isDirectory: boolean
  icon: string
}

export interface AppConfig {
  hotkey: string
  theme: 'dark' | 'light'
  radius: number
  openAtLogin?: boolean
  items: MenuItem[]
}

export interface UpdateInfo {
  hasUpdate: boolean
  mandatory?: boolean
  currentVersion: string
  latestVersion?: string
  title?: string
  releaseNotes?: string
  downloadUrl?: string
  offline?: boolean
}

export interface ElectronAPI {
  getConfig: () => Promise<AppConfig>
  saveConfig: (config: AppConfig) => Promise<boolean>
  executeItem: (filePath: string) => Promise<{ success: boolean; error?: string }>
  selectFile: () => Promise<{ canceled: boolean; filePath?: string; fileName?: string; detectedIcon?: string; nativeIcon?: string }>
  selectFolder: () => Promise<{ canceled: boolean; folderPath?: string; folderName?: string; detectedIcon?: string }>
  getFileIcon: (filePath: string) => Promise<string | null>
  readFolderContents: (folderPath: string) => Promise<FolderContentItem[]>
  checkIsDirectory: (filePath: string) => Promise<boolean>
  registerHotkey: (hotkey: string) => Promise<{ success: boolean; error?: string }>
  getStartup: () => Promise<boolean>
  setStartup: (enabled: boolean) => Promise<boolean>
  hideWindow: () => void
  closeApp: () => void
  checkForUpdates: () => Promise<UpdateInfo>
  openExternalUrl: (url: string) => Promise<void>
  runTerminalUpdate: () => Promise<{ success: boolean; error?: string }>
  onUpdateAvailable: (callback: (info: UpdateInfo) => void) => () => void
  onToggleMenu: (callback: (shouldOpen?: boolean) => void) => () => void
  onCloseIfIdle: (callback: () => void) => () => void
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
