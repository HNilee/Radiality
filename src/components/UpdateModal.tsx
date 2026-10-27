import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Download, Terminal, X, ExternalLink, Check, AlertCircle } from 'lucide-react'
import { UpdateInfo } from '../types'

interface UpdateModalProps {
  updateInfo: UpdateInfo | null
  onDismiss?: () => void
}

export const UpdateModal: React.FC<UpdateModalProps> = ({ updateInfo, onDismiss }) => {
  const [copiedCli, setCopiedCli] = useState(false)
  const [isOpeningTerminal, setIsOpeningTerminal] = useState(false)

  if (!updateInfo || !updateInfo.hasUpdate) return null

  const isMandatory = Boolean(updateInfo.mandatory)

  const handleUpdateClick = async () => {
    setIsOpeningTerminal(true)
    try {
      if (window.electronAPI?.runTerminalUpdate) {
        const res = await window.electronAPI.runTerminalUpdate()
        if (res && res.success === false) {
          console.error('Update launcher error:', res.error)
          setIsOpeningTerminal(false)
          if (updateInfo.downloadUrl && window.electronAPI?.openExternalUrl) {
            window.electronAPI.openExternalUrl(updateInfo.downloadUrl)
          }
        }
      } else if (updateInfo.downloadUrl && window.electronAPI?.openExternalUrl) {
        await window.electronAPI.openExternalUrl(updateInfo.downloadUrl)
        setIsOpeningTerminal(false)
      }
    } catch (e) {
      console.error(e)
      setIsOpeningTerminal(false)
    }
  }

  const handleCopyCli = () => {
    navigator.clipboard.writeText('npx radiality@latest')
    setCopiedCli(true)
    setTimeout(() => setCopiedCli(false), 2000)
  }

  const handleCloseApp = () => {
    if (window.electronAPI?.closeApp) {
      window.electronAPI.closeApp()
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/75 backdrop-blur-md"
          onClick={() => {
            if (!isMandatory && onDismiss) {
              onDismiss()
            }
          }}
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className="relative w-full max-w-[480px] rounded-[22px] bg-[#1a1a24]/95 backdrop-blur-[40px] border border-white/[0.12] shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_0_1px_rgba(255,255,255,0.06)] text-white overflow-hidden p-6"
        >
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/25 shrink-0 border border-white/20">
              <Sparkles size={24} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                  {isMandatory ? 'Mandatory Update' : 'New Update'}
                </span>
                <span className="text-[12px] text-zinc-400 font-mono">
                  v{updateInfo.currentVersion} → v{updateInfo.latestVersion}
                </span>
              </div>
              <h2 className="text-[18px] font-semibold tracking-tight text-white mt-1.5 leading-snug">
                {updateInfo.title || 'Radiality Update Available'}
              </h2>
            </div>

            {!isMandatory && onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Dismiss for now"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Mandatory notice */}
          {isMandatory && (
            <div className="mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-amber-200 text-[12px]">
              <AlertCircle size={16} className="shrink-0 text-amber-400" />
              <span>A mandatory update is required to continue using Radiality.</span>
            </div>
          )}

          {/* Release Notes */}
          <div className="mt-4 p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-zinc-300 text-[13px] leading-relaxed max-h-[140px] overflow-y-auto">
            <p className="font-medium text-white mb-1 text-[12px] tracking-wide uppercase text-zinc-400">
              Release Notes
            </p>
            <p className="whitespace-pre-wrap">{updateInfo.releaseNotes}</p>
          </div>

          {/* CLI quick command */}
          <div className="mt-3.5 flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-[12px]">
            <div className="flex items-center gap-2 text-zinc-400">
              <Terminal size={14} className="text-zinc-400" />
              <span>Or run manual update:</span>
              <code className="text-indigo-300 bg-white/[0.06] px-1.5 py-0.5 rounded font-mono">
                npx radiality@latest
              </code>
            </div>
            <button
              onClick={handleCopyCli}
              className="text-xs px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-zinc-200 flex items-center gap-1 transition-colors"
              title="Copy terminal command"
            >
              {copiedCli ? (
                <>
                  <Check size={12} className="text-emerald-400" />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                'Copy'
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex items-center justify-end gap-3 pt-2">
            {isMandatory ? (
              <button
                onClick={handleCloseApp}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Quit Radiality
              </button>
            ) : (
              <button
                onClick={onDismiss}
                className="px-4 py-2 rounded-xl text-[13px] font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                Remind Me Later
              </button>
            )}

            <button
              onClick={handleUpdateClick}
              disabled={isOpeningTerminal}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-600/30 flex items-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Terminal size={15} />
              {isOpeningTerminal ? 'Launching Terminal...' : 'Update Now'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
