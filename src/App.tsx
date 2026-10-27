import React, { useState, useEffect } from 'react'
import { RadialMenu } from './components/RadialMenu'
import { SettingsModal } from './components/SettingsModal'
import { UpdateModal } from './components/UpdateModal'
import { AppConfig, MenuItem, UpdateInfo } from './types'
import { FileCode, Folder, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const DEFAULT_FALLBACK_CONFIG: AppConfig = {
  hotkey: 'Alt+Space',
  theme: 'dark',
  radius: 140,
  openAtLogin: false,
  items: [
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

export const App: React.FC = () => {
  const [config, setConfig] = useState<AppConfig>(DEFAULT_FALLBACK_CONFIG)
  const [isOpen, setIsOpen] = useState(true)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isPickTypeOpen, setIsPickTypeOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 2500)
  }

  // Load configuration & check updates
  useEffect(() => {
    if (window.electronAPI) {
      window.electronAPI.getConfig().then((cfg) => {
        if (cfg) setConfig(cfg)
      })

      // Check for updates
      window.electronAPI.checkForUpdates?.().then((info) => {
        if (info && info.hasUpdate) {
          setUpdateInfo(info)
        }
      })

      const unsubscribeUpdate = window.electronAPI.onUpdateAvailable?.((info) => {
        if (info && info.hasUpdate) {
          setUpdateInfo(info)
        }
      })

      const unsubscribeToggle = window.electronAPI.onToggleMenu((shouldOpen) => {
        if (updateInfo?.hasUpdate && updateInfo?.mandatory) {
          return // Prevent opening menu if mandatory update is active
        }
        if (typeof shouldOpen === 'boolean') {
          setIsOpen(shouldOpen)
        } else {
          setIsOpen(true)
        }
      })

      return () => {
        if (unsubscribeToggle) unsubscribeToggle()
        if (unsubscribeUpdate) unsubscribeUpdate()
      }
    }
  }, [isSettingsOpen, isPickTypeOpen, updateInfo])

  // Keyboard shortcut for Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (updateInfo?.hasUpdate && updateInfo?.mandatory) {
        return // Block escape dismiss on mandatory update
      }
      if (e.key === 'Escape') {
        if (isPickTypeOpen) {
          setIsPickTypeOpen(false)
        } else if (isSettingsOpen) {
          setIsSettingsOpen(false)
        } else if (isOpen) {
          handleCloseMenu()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isSettingsOpen, isPickTypeOpen, updateInfo])

  const handleCloseMenu = () => {
    setIsOpen(false)
    setIsPickTypeOpen(false)
    setTimeout(() => {
      if (window.electronAPI) {
        window.electronAPI.hideWindow()
      }
    }, 220)
  }

  const handleSaveConfig = async (newConfig: AppConfig) => {
    setConfig(newConfig)
    if (window.electronAPI) {
      await window.electronAPI.saveConfig(newConfig)
    }
  }

  const handleExecuteItem = async (item: MenuItem) => {
    if (!item.path) {
      showToast(`Path not configured for "${item.label}"`)
      setIsSettingsOpen(true)
      return
    }

    showToast(`Opening ${item.label}...`)
    if (window.electronAPI) {
      const res = await window.electronAPI.executeItem(item.path)
      if (res.success) {
        handleCloseMenu()
      } else {
        showToast(`Failed: ${res.error || 'Target not found'}`)
      }
    } else {
      console.log('Execute simulated in web mode:', item.path)
      handleCloseMenu()
    }
  }

  const handleExecuteChildPath = async (childPath: string) => {
    const fileName = childPath.split('\\').pop() || childPath
    showToast(`Opening ${fileName}...`)
    if (window.electronAPI) {
      const res = await window.electronAPI.executeItem(childPath)
      if (res.success) {
        handleCloseMenu()
      } else {
        showToast(`Failed: ${res.error || 'Cannot open target'}`)
      }
    }
  }

  const handlePickFile = async () => {
    setIsPickTypeOpen(false)
    if (config.items.length >= 8) {
      showToast('Maximum limit of 8 shortcuts reached!')
      return
    }
    if (window.electronAPI) {
      const res = await window.electronAPI.selectFile()
      if (!res.canceled && res.filePath) {
        const newItem: MenuItem = {
          id: Date.now().toString(),
          label: res.fileName || 'New Shortcut',
          path: res.filePath,
          icon: res.detectedIcon || 'FileText',
          nativeIcon: res.nativeIcon
        }
        const updatedConfig = {
          ...config,
          items: [...config.items, newItem]
        }
        await handleSaveConfig(updatedConfig)
        showToast(`Added shortcut "${newItem.label}"`)
      }
    }
  }

  const handlePickFolder = async () => {
    setIsPickTypeOpen(false)
    if (config.items.length >= 8) {
      showToast('Maximum limit of 8 shortcuts reached!')
      return
    }
    if (window.electronAPI) {
      const res = await window.electronAPI.selectFolder()
      if (!res.canceled && res.folderPath) {
        const newItem: MenuItem = {
          id: Date.now().toString(),
          label: res.folderName || 'New Folder',
          path: res.folderPath,
          icon: 'Folder'
        }
        const updatedConfig = {
          ...config,
          items: [...config.items, newItem]
        }
        await handleSaveConfig(updatedConfig)
        showToast(`Added folder "${newItem.label}"`)
      }
    }
  }

  return (
    <div className="relative w-screen h-screen flex items-center justify-center overflow-hidden">
      {/* Click Outside Backdrop */}
      {isOpen && !isSettingsOpen && !isPickTypeOpen && (
        <div 
          onClick={handleCloseMenu}
          className="fixed inset-0 z-0 bg-transparent cursor-default" 
          title="Click outside to close"
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-8 z-50 px-4 py-2 rounded-xl bg-zinc-900/95 border border-white/20 text-white text-xs font-medium shadow-2xl backdrop-blur-md">
          {toastMessage}
        </div>
      )}

      {/* Main Radial Menu */}
      <RadialMenu
        isOpen={isOpen && !isSettingsOpen && !isPickTypeOpen}
        config={config}
        onClose={handleCloseMenu}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExecuteItem={handleExecuteItem}
        onExecuteChildPath={handleExecuteChildPath}
        onAddNewShortcut={() => {
          if (config.items.length >= 8) {
            showToast('Maximum limit of 8 shortcuts reached!')
            return
          }
          setIsPickTypeOpen(true)
        }}
      />

      {/* Mini Picker Modal for Plus Button */}
      <AnimatePresence>
        {isPickTypeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPickTypeOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              className="relative z-10 w-80 glass-panel rounded-2xl p-5 border border-white/15 text-zinc-100 shadow-2xl text-center space-y-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-semibold text-white">Add New Shortcut</h3>
                <button
                  type="button"
                  onClick={() => setIsPickTypeOpen(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="text-xs text-zinc-400">Choose the type of shortcut to add:</p>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={handlePickFile}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/30 transition-all text-indigo-200 group"
                >
                  <FileCode size={26} className="mb-2 text-indigo-300 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">File / Icon</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">Any file, exe, ico</span>
                </button>

                <button
                  type="button"
                  onClick={handlePickFolder}
                  className="flex flex-col items-center justify-center p-4 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 transition-all text-amber-200 group"
                >
                  <Folder size={26} className="mb-2 text-amber-300 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium">Folder</span>
                  <span className="text-[10px] text-zinc-400 mt-0.5">Directory path</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen && (!updateInfo || !updateInfo.mandatory)}
        config={config}
        onClose={() => setIsSettingsOpen(false)}
        onSaveConfig={handleSaveConfig}
        onShowUpdateModal={(info) => setUpdateInfo(info)}
      />

      {/* Mandatory / Optional Update Modal */}
      <UpdateModal
        updateInfo={updateInfo}
        onDismiss={() => {
          if (!updateInfo?.mandatory) {
            setUpdateInfo(null)
          }
        }}
      />
    </div>
  )
}
