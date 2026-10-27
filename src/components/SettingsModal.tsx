import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Keyboard, 
  Folder, 
  Trash2, 
  Plus, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  Power, 
  FileCode, 
  Sliders, 
  ChevronDown,
  Sparkles,
  Lock,
  Palette,
  RefreshCw
} from 'lucide-react'
import { AppConfig, MenuItem, UpdateInfo } from '../types'
import { DynamicIcon, IconPicker, ColorPicker } from './IconPicker'

const MAX_SHORTCUTS = 8

interface SettingsModalProps {
  isOpen: boolean
  config: AppConfig
  onClose: () => void
  onSaveConfig: (newConfig: AppConfig) => void
  onShowUpdateModal?: (info: UpdateInfo) => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  config,
  onClose,
  onSaveConfig,
  onShowUpdateModal,
}) => {
  const [localConfig, setLocalConfig] = useState<AppConfig>(config)
  const [isRecordingKeybind, setIsRecordingKeybind] = useState(false)
  const [keybindError, setKeybindError] = useState<string | null>(null)
  const [keybindSuccess, setKeybindSuccess] = useState(false)
  const [editingIconIndex, setEditingIconIndex] = useState<number | null>(null)
  const [editingColorIndex, setEditingColorIndex] = useState<number | null>(null)
  const [launchAtStartup, setLaunchAtStartup] = useState<boolean>(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [updateCheckStatus, setUpdateCheckStatus] = useState<string | null>(null)

  const handleCheckUpdates = async () => {
    if (!window.electronAPI?.checkForUpdates) return
    setIsCheckingUpdate(true)
    setUpdateCheckStatus(null)
    try {
      const info = await window.electronAPI.checkForUpdates()
      if (info && info.hasUpdate) {
        if (onShowUpdateModal) {
          onShowUpdateModal(info)
        }
      } else {
        setUpdateCheckStatus('You are using the latest version (v1.0.0)')
        setTimeout(() => setUpdateCheckStatus(null), 3500)
      }
    } catch (err) {
      setUpdateCheckStatus('Could not check updates')
      setTimeout(() => setUpdateCheckStatus(null), 3500)
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  useEffect(() => {
    setLocalConfig(config)
  }, [config])

  // Load startup setting from Electron
  useEffect(() => {
    if (isOpen && window.electronAPI?.getStartup) {
      window.electronAPI.getStartup().then((enabled) => {
        setLaunchAtStartup(enabled)
      })
    }
  }, [isOpen])

  // Automatically fetch original app icons for any shortcuts missing them
  useEffect(() => {
    if (isOpen && window.electronAPI?.getFileIcon && localConfig.items.length > 0) {
      let hasChanges = false
      const updated = [...localConfig.items]
      
      Promise.all(
        updated.map(async (item, i) => {
          if (item.path && !item.nativeIcon && item.icon !== 'Folder') {
            try {
              const iconData = await window.electronAPI?.getFileIcon(item.path)
              if (iconData) {
                updated[i] = { ...updated[i], nativeIcon: iconData }
                hasChanges = true
              }
            } catch (e) {}
          }
        })
      ).then(() => {
        if (hasChanges) {
          setLocalConfig((prev) => ({ ...prev, items: updated }))
          onSaveConfig({ ...localConfig, items: updated })
        }
      })
    }
  }, [isOpen])

  // Keybind recorder handler
  useEffect(() => {
    if (!isRecordingKeybind) return

    const handleKeyDown = async (e: KeyboardEvent) => {
      e.preventDefault()
      e.stopPropagation()

      if (e.key === 'Escape') {
        setIsRecordingKeybind(false)
        return
      }

      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return
      }

      const parts: string[] = []
      if (e.ctrlKey) parts.push('Ctrl')
      if (e.altKey) parts.push('Alt')
      if (e.shiftKey) parts.push('Shift')
      if (e.metaKey) parts.push('Super')

      let key = e.key.toUpperCase()
      if (key === ' ') key = 'Space'

      parts.push(key)
      const recorded = parts.join('+')

      if (window.electronAPI) {
        const res = await window.electronAPI.registerHotkey(recorded)
        if (res.success) {
          const updated = { ...localConfig, hotkey: recorded }
          setLocalConfig(updated)
          onSaveConfig(updated)
          setKeybindSuccess(true)
          setKeybindError(null)
          setTimeout(() => setKeybindSuccess(false), 2000)
        } else {
          setKeybindError(res.error || 'Invalid hotkey combination')
        }
      } else {
        const updated = { ...localConfig, hotkey: recorded }
        setLocalConfig(updated)
        onSaveConfig(updated)
      }

      setIsRecordingKeybind(false)
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [isRecordingKeybind, localConfig, onSaveConfig])

  const handleResetHotkey = async () => {
    const defaultHotkey = 'Alt+Space'
    if (window.electronAPI) {
      const res = await window.electronAPI.registerHotkey(defaultHotkey)
      if (res.success) {
        const updated = { ...localConfig, hotkey: defaultHotkey }
        setLocalConfig(updated)
        onSaveConfig(updated)
        setKeybindSuccess(true)
        setKeybindError(null)
        setTimeout(() => setKeybindSuccess(false), 2000)
      } else {
        setKeybindError(res.error || 'Failed to reset hotkey')
      }
    } else {
      const updated = { ...localConfig, hotkey: defaultHotkey }
      setLocalConfig(updated)
      onSaveConfig(updated)
    }
  }

  const handleToggleStartup = async () => {
    const nextVal = !launchAtStartup
    setLaunchAtStartup(nextVal)
    if (window.electronAPI?.setStartup) {
      await window.electronAPI.setStartup(nextVal)
    }
    const updated = { ...localConfig, openAtLogin: nextVal }
    setLocalConfig(updated)
    onSaveConfig(updated)
  }

  const handleBrowseFile = async (index: number) => {
    if (!window.electronAPI) return
    const res = await window.electronAPI.selectFile()
    if (!res.canceled && res.filePath) {
      const updatedItems = [...localConfig.items]
      updatedItems[index] = {
        ...updatedItems[index],
        path: res.filePath,
        label: updatedItems[index].label || res.fileName || 'Shortcut',
        icon: res.detectedIcon || updatedItems[index].icon || 'FileText',
        nativeIcon: res.nativeIcon,
      }
      const updated = { ...localConfig, items: updatedItems }
      setLocalConfig(updated)
      onSaveConfig(updated)
    }
  }

  const handleBrowseFolder = async (index: number) => {
    if (!window.electronAPI?.selectFolder) return
    const res = await window.electronAPI.selectFolder()
    if (!res.canceled && res.folderPath) {
      const updatedItems = [...localConfig.items]
      updatedItems[index] = {
        ...updatedItems[index],
        path: res.folderPath,
        label: updatedItems[index].label || res.folderName || 'Folder',
        icon: 'Folder',
        nativeIcon: undefined,
      }
      const updated = { ...localConfig, items: updatedItems }
      setLocalConfig(updated)
      onSaveConfig(updated)
    }
  }

  const handleAddItemFile = async () => {
    if (localConfig.items.length >= MAX_SHORTCUTS) return
    if (window.electronAPI) {
      const res = await window.electronAPI.selectFile()
      if (!res.canceled && res.filePath) {
        const newItem: MenuItem = {
          id: Date.now().toString(),
          label: res.fileName || 'New Shortcut',
          path: res.filePath,
          icon: res.detectedIcon || 'FileText',
          nativeIcon: res.nativeIcon,
        }
        const updated = { ...localConfig, items: [...localConfig.items, newItem] }
        setLocalConfig(updated)
        onSaveConfig(updated)
      }
    }
  }

  const handleAddItemFolder = async () => {
    if (localConfig.items.length >= MAX_SHORTCUTS) return
    if (window.electronAPI?.selectFolder) {
      const res = await window.electronAPI.selectFolder()
      if (!res.canceled && res.folderPath) {
        const newItem: MenuItem = {
          id: Date.now().toString(),
          label: res.folderName || 'New Folder',
          path: res.folderPath,
          icon: 'Folder',
          nativeIcon: undefined,
        }
        const updated = { ...localConfig, items: [...localConfig.items, newItem] }
        setLocalConfig(updated)
        onSaveConfig(updated)
      }
    }
  }

  const handleDeleteItem = (index: number) => {
    const updatedItems = localConfig.items.filter((_, i) => i !== index)
    const updated = { ...localConfig, items: updatedItems }
    setLocalConfig(updated)
    onSaveConfig(updated)
    if (editingIconIndex === index) setEditingIconIndex(null)
    if (editingColorIndex === index) setEditingColorIndex(null)
  }

  const handleUpdateItem = (index: number, field: keyof MenuItem, val: any) => {
    const updatedItems = [...localConfig.items]
    updatedItems[index] = { ...updatedItems[index], [field]: val }
    const updated = { ...localConfig, items: updatedItems }
    setLocalConfig(updated)
    onSaveConfig(updated)
  }

  const renderHotkeyBadges = (hotkey: string) => {
    if (!hotkey) return null
    const keys = hotkey.split('+')
    return (
      <div className="flex items-center gap-1.5">
        {keys.map((k) => {
          let symbol = k
          if (k.toLowerCase() === 'alt') symbol = '⌥ Option'
          else if (k.toLowerCase() === 'ctrl') symbol = '⌃ Control'
          else if (k.toLowerCase() === 'shift') symbol = '⇧ Shift'
          else if (k.toLowerCase() === 'super') symbol = '⌘ Cmd'
          else if (k.toLowerCase() === 'space') symbol = '␣ Space'

          return (
            <span
              key={k}
              className="px-2 py-0.5 rounded-md bg-white/[0.08] border border-white/[0.14] text-[11px] font-mono text-zinc-200 shadow-sm"
            >
              {symbol}
            </span>
          )
        })}
      </div>
    )
  }

  const isMaxReached = localConfig.items.length >= MAX_SHORTCUTS

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Apple Dimming Scrim */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/65 backdrop-blur-md"
          />

          {/* Apple macOS Frosted Glass Window */}
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 14 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 14 }}
            transition={{ type: 'spring', damping: 30, stiffness: 380 }}
            className="relative w-full max-w-[650px] max-h-[88vh] flex flex-col rounded-[22px] bg-[#1a1a22]/92 backdrop-blur-[36px] saturate-[180%] border-t border-white/[0.2] border-x border-b border-white/[0.08] shadow-[0_36px_80px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)] text-zinc-100 overflow-hidden z-10"
            style={{
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif'
            }}
          >
            {/* Window Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07] bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-indigo-500/25 to-indigo-600/10 border border-indigo-400/30 flex items-center justify-center shadow-inner text-indigo-300">
                  <Sliders size={16} strokeWidth={2.2} />
                </div>
                <div>
                  <h2 className="text-[14px] font-semibold tracking-tight text-white leading-tight">Radiality Preferences</h2>
                  <p className="text-[11px] text-zinc-400 mt-0.5">Customize global shortcut, custom colors, native icons & items</p>
                </div>
              </div>

              {/* Dismiss Button */}
              <motion.button
                type="button"
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.92 }}
                onClick={onClose}
                className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.08] flex items-center justify-center text-zinc-300 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X size={14} strokeWidth={2.2} />
              </motion.button>
            </div>

            {/* Inset Grouped Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 custom-scrollbar">
              
              {/* SECTION 1: SYSTEM CONTROLS */}
              <div className="space-y-2">
                <div className="px-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    System & Shortcut
                  </span>
                </div>

                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06] shadow-sm">
                  
                  {/* Row A: Hotkey Trigger */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 flex items-center justify-center shrink-0">
                        <Keyboard size={16} />
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-white block">Activation Shortcut</span>
                        <span className="text-[11px] text-zinc-400">Summons the radial menu anywhere on screen</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => {
                          setIsRecordingKeybind(true)
                          setKeybindError(null)
                        }}
                        className={`h-8 px-3 rounded-xl border text-xs font-medium transition-all flex items-center gap-2 cursor-pointer ${
                          isRecordingKeybind
                            ? 'border-[#0A84FF] bg-[#0A84FF]/20 text-white ring-2 ring-[#0A84FF]/40 animate-pulse'
                            : 'border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200'
                        }`}
                      >
                        {isRecordingKeybind ? (
                          <span className="text-zinc-200">Press keys... (Esc to cancel)</span>
                        ) : (
                          renderHotkeyBadges(localConfig.hotkey) || <span>Click to set</span>
                        )}
                      </motion.button>

                      <motion.button
                        type="button"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleResetHotkey}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                        title="Reset to default (⌥ Option + ␣ Space)"
                      >
                        <RotateCcw size={13} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Feedback line if updated or error */}
                  {(keybindSuccess || keybindError) && (
                    <div className="px-4 py-2 bg-black/20 text-[11px]">
                      {keybindSuccess && (
                        <span className="text-[#34C759] flex items-center gap-1.5 font-medium">
                          <Check size={13} strokeWidth={2.5} /> Shortcut updated successfully!
                        </span>
                      )}
                      {keybindError && (
                        <span className="text-[#FF453A] flex items-center gap-1.5 font-medium">
                          <AlertCircle size={13} /> {keybindError}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Row B: Launch at Startup (Apple Switch) */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 transition-colors ${
                        launchAtStartup 
                          ? 'bg-[#34C759]/15 border-[#34C759]/25 text-[#34C759]' 
                          : 'bg-white/[0.06] border-white/[0.08] text-zinc-400'
                      }`}>
                        <Power size={16} />
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-white block">Launch at Login</span>
                        <span className="text-[11px] text-zinc-400">Silently run in background (tray) when Windows starts</span>
                      </div>
                    </div>

                    {/* Apple Toggle Switch */}
                    <button
                      type="button"
                      onClick={handleToggleStartup}
                      className={`w-[44px] h-[26px] rounded-full transition-colors duration-200 relative p-[2px] cursor-pointer outline-none focus:ring-2 focus:ring-[#34C759]/40 ${
                        launchAtStartup ? 'bg-[#34C759]' : 'bg-[#39393D]'
                      }`}
                      aria-checked={launchAtStartup}
                      role="switch"
                    >
                      <motion.div
                        animate={{ x: launchAtStartup ? 18 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        className="w-[22px] h-[22px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.25)]"
                      />
                    </button>
                  </div>

                  {/* Row C: Check for Updates */}
                  <div className="px-4 py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-400/20 text-blue-300 flex items-center justify-center shrink-0">
                        <Sparkles size={16} />
                      </div>
                      <div>
                        <span className="text-[13px] font-medium text-white block">Software Updates</span>
                        <span className="text-[11px] text-zinc-400">
                          {updateCheckStatus || 'Radiality v1.0.0 (Latest)'}
                        </span>
                      </div>
                    </div>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={isCheckingUpdate}
                      onClick={handleCheckUpdates}
                      className="h-8 px-3 rounded-xl border border-white/[0.12] bg-white/[0.06] hover:bg-white/[0.1] text-xs font-medium text-zinc-200 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw size={12} className={isCheckingUpdate ? 'animate-spin' : ''} />
                      <span>{isCheckingUpdate ? 'Checking...' : 'Check for Updates'}</span>
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* SECTION 2: RADIAL SHORTCUTS LIST */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                      Radial Shortcuts
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      isMaxReached 
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                        : 'bg-white/[0.07] text-zinc-300'
                    }`}>
                      {localConfig.items.length}/{MAX_SHORTCUTS} {isMaxReached && '(Max limit reached)'}
                    </span>
                  </div>

                  {/* Add Action Pills (Disabled if Max 8) */}
                  <div className="flex items-center gap-2">
                    <motion.button
                      type="button"
                      whileHover={!isMaxReached ? { scale: 1.02 } : {}}
                      whileTap={!isMaxReached ? { scale: 0.96 } : {}}
                      onClick={handleAddItemFile}
                      disabled={isMaxReached}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl shadow-sm transition-all ${
                        isMaxReached
                          ? 'bg-white/[0.05] text-zinc-500 border border-white/[0.06] cursor-not-allowed opacity-50'
                          : 'text-white bg-[#0A84FF] hover:bg-[#0077ED] cursor-pointer'
                      }`}
                      title={isMaxReached ? 'Maximum of 8 shortcuts reached' : 'Add File or Application shortcut'}
                    >
                      <Plus size={13} strokeWidth={2.4} /> File / App
                    </motion.button>
                    <motion.button
                      type="button"
                      whileHover={!isMaxReached ? { scale: 1.02 } : {}}
                      whileTap={!isMaxReached ? { scale: 0.96 } : {}}
                      onClick={handleAddItemFolder}
                      disabled={isMaxReached}
                      className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl shadow-sm transition-all ${
                        isMaxReached
                          ? 'bg-white/[0.05] text-zinc-500 border border-white/[0.06] cursor-not-allowed opacity-50'
                          : 'text-amber-200 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/25 cursor-pointer'
                      }`}
                      title={isMaxReached ? 'Maximum of 8 shortcuts reached' : 'Add Folder shortcut (branching)'}
                    >
                      <Folder size={13} /> Folder
                    </motion.button>
                  </div>
                </div>

                {/* Inset Grouped List Card */}
                <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] divide-y divide-white/[0.06] overflow-hidden shadow-sm">
                  
                  {/* Static Item: Settings (Locked Slot) */}
                  <div className="px-4 py-3 flex items-center justify-between gap-3 bg-amber-500/[0.03]">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center justify-center shrink-0">
                        <DynamicIcon name="Settings" size={17} />
                      </div>
                      <div className="min-w-0">
                        <span className="text-[13px] font-medium text-white block">Settings</span>
                        <p className="text-[11px] text-zinc-400 truncate">Static slot · Opens this preferences window</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06]">
                      <Lock size={11} /> Locked
                    </div>
                  </div>

                  {/* User Shortcut Items */}
                  {localConfig.items.map((item, index) => {
                    const isFolderItem = item.icon === 'Folder' || (!item.path.includes('.') && item.path.length > 3)

                    return (
                      <div key={item.id} className="divide-y divide-white/[0.04]">
                        <div className="px-4 py-3 flex items-center gap-3.5 hover:bg-white/[0.02] transition-colors">
                          {/* Icon Button with Dropdown Indicator */}
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => {
                              setEditingIconIndex(editingIconIndex === index ? null : index)
                              setEditingColorIndex(null)
                            }}
                            className="w-9 h-9 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/[0.12] text-zinc-200 flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-sm relative group"
                            style={item.color ? { borderColor: `${item.color}80`, backgroundColor: `${item.color}15` } : undefined}
                            title="Click to change icon"
                          >
                            <DynamicIcon 
                              name={item.icon} 
                              nativeIcon={item.nativeIcon}
                              size={18} 
                              style={item.color ? { color: item.color } : undefined}
                            />
                            <span className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-black/80 border border-white/20 text-[8px] text-zinc-400 group-hover:text-white">
                              <ChevronDown size={8} />
                            </span>
                          </motion.button>

                          {/* Color Swatch Trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingColorIndex(editingColorIndex === index ? null : index)
                              setEditingIconIndex(null)
                            }}
                            className="w-5 h-5 rounded-full border border-white/30 shadow-sm transition-transform hover:scale-115 cursor-pointer shrink-0 flex items-center justify-center"
                            style={{
                              backgroundColor: item.color || '#6366f1',
                              boxShadow: item.color ? `0 0 8px ${item.color}80` : undefined
                            }}
                            title="Customize icon color"
                          >
                            <Palette size={10} className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] opacity-80" />
                          </button>

                          {/* Center: Label input & Path indicator */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <input
                              type="text"
                              value={item.label}
                              onChange={(e) => handleUpdateItem(index, 'label', e.target.value)}
                              placeholder="Shortcut Name"
                              className="w-full h-7 px-2 bg-transparent hover:bg-white/[0.06] focus:bg-white/[0.09] focus:ring-1 focus:ring-[#0A84FF] rounded-md text-[13px] font-medium text-white placeholder-zinc-500 outline-none transition-all"
                            />
                            
                            {/* Path Badge */}
                            <div className="flex items-center gap-1.5 px-2">
                              {isFolderItem ? (
                                <span className="text-[9px] font-semibold text-amber-300 bg-amber-400/15 border border-amber-400/25 px-1 rounded shrink-0">
                                  FOLDER
                                </span>
                              ) : (
                                <span className="text-[9px] font-semibold text-blue-300 bg-blue-500/15 border border-blue-400/25 px-1 rounded shrink-0">
                                  FILE
                                </span>
                              )}
                              <p className="text-[11px] font-mono text-zinc-400 truncate" title={item.path}>
                                {item.path || '(No file or folder selected)'}
                              </p>
                            </div>
                          </div>

                          {/* Right: Clean aligned action buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleBrowseFile(index)}
                              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                              title="Browse File / App (auto-detects icon)"
                            >
                              <FileCode size={14} />
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleBrowseFolder(index)}
                              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-amber-400/20 text-zinc-400 hover:text-amber-300 flex items-center justify-center transition-colors cursor-pointer"
                              title="Browse Folder (Enables Sub-Branch)"
                            >
                              <Folder size={14} />
                            </motion.button>

                            <motion.button
                              type="button"
                              whileHover={{ scale: 1.08 }}
                              whileTap={{ scale: 0.94 }}
                              onClick={() => handleDeleteItem(index)}
                              className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-[#FF453A]/20 text-zinc-400 hover:text-[#FF453A] flex items-center justify-center transition-colors cursor-pointer"
                              title="Delete Shortcut"
                            >
                              <Trash2 size={14} />
                            </motion.button>
                          </div>
                        </div>

                        {/* Expandable Color Picker Drawer */}
                        {editingColorIndex === index && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 py-3 bg-black/35"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-medium text-zinc-400">
                                Accent Color for "{item.label}":
                              </span>
                              <button
                                type="button"
                                onClick={() => setEditingColorIndex(null)}
                                className="text-[11px] text-[#0A84FF] hover:underline cursor-pointer"
                              >
                                Done
                              </button>
                            </div>
                            <ColorPicker
                              currentColor={item.color}
                              onChangeColor={(newColor) => handleUpdateItem(index, 'color', newColor)}
                            />
                          </motion.div>
                        )}

                        {/* Expandable Icon Picker Drawer */}
                        {editingIconIndex === index && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 py-3 bg-black/35"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[11px] font-medium text-zinc-400">Choose Icon for "{item.label}":</span>
                              <button
                                type="button"
                                onClick={() => setEditingIconIndex(null)}
                                className="text-[11px] text-[#0A84FF] hover:underline cursor-pointer"
                              >
                                Done
                              </button>
                            </div>
                            <IconPicker
                              currentIcon={item.icon}
                              nativeIcon={item.nativeIcon}
                              hasNativeOption={!!item.nativeIcon}
                              onSelect={(newIcon, useNative) => {
                                if (useNative) {
                                  // User chose to use the extracted native icon
                                  setEditingIconIndex(null)
                                } else {
                                  // User chose a Lucide icon
                                  const updatedItems = [...localConfig.items]
                                  updatedItems[index] = { 
                                    ...updatedItems[index], 
                                    icon: newIcon, 
                                    nativeIcon: undefined 
                                  }
                                  const updated = { ...localConfig, items: updatedItems }
                                  setLocalConfig(updated)
                                  onSaveConfig(updated)
                                  setEditingIconIndex(null)
                                }
                              }}
                            />
                          </motion.div>
                        )}
                      </div>
                    )
                  })}

                  {localConfig.items.length === 0 && (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      No shortcuts added yet. Click "+ File / App" or "+ Folder" above.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Window Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-white/[0.07] bg-white/[0.02]">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5">
                <Sparkles size={12} className="text-zinc-400" /> Preferences save automatically
              </span>

              <motion.button
                type="button"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                onClick={onClose}
                className="px-6 py-1.5 rounded-xl text-xs font-semibold text-white bg-[#0A84FF] hover:bg-[#0077ED] shadow-[0_2px_10px_rgba(10,132,255,0.35)] transition-all cursor-pointer"
              >
                Done
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
