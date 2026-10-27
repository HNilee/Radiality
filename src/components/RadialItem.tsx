import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DynamicIcon } from './IconPicker'
import { FolderContentItem } from '../types'

interface RadialItemProps {
  id: string
  label: string
  path: string
  icon: string
  color?: string
  nativeIcon?: string
  x: number
  y: number
  index: number
  isStatic?: boolean
  isAddButton?: boolean
  isBranchActive?: boolean
  onActivateBranch?: () => void
  onDeactivateBranch?: () => void
  onClick: () => void
  onExecuteChild?: (childPath: string) => void
}

export const RadialItem: React.FC<RadialItemProps> = ({
  label,
  path,
  icon,
  color,
  nativeIcon,
  x,
  y,
  index,
  isStatic = false,
  isAddButton = false,
  isBranchActive = false,
  onActivateBranch,
  onDeactivateBranch,
  onClick,
  onExecuteChild,
}) => {
  const [isFolder, setIsFolder] = useState(false)
  const [branchItems, setBranchItems] = useState<FolderContentItem[]>([])
  const [isLoadingBranch, setIsLoadingBranch] = useState(false)

  // Check if target is a directory on Windows
  useEffect(() => {
    if (!path || isStatic || isAddButton) {
      setIsFolder(false)
      return
    }

    if (window.electronAPI?.checkIsDirectory) {
      window.electronAPI.checkIsDirectory(path).then((isDir) => {
        setIsFolder(isDir)
      })
    }
  }, [path, isStatic, isAddButton])

  // Fetch branch folder items whenever this folder becomes active
  useEffect(() => {
    if (isBranchActive && isFolder && path && window.electronAPI?.readFolderContents) {
      setIsLoadingBranch(true)
      window.electronAPI.readFolderContents(path)
        .then((contents) => {
          setBranchItems(contents)
        })
        .catch((err) => {
          console.error('Failed to read folder contents:', err)
        })
        .finally(() => {
          setIsLoadingBranch(false)
        })
    }
  }, [isBranchActive, isFolder, path])

  const handleMouseEnter = () => {
    if (isFolder) {
      if (onActivateBranch) {
        onActivateBranch()
      }
    } else {
      // If hovering over a non-folder item, close other open branches
      if (onDeactivateBranch) {
        onDeactivateBranch()
      }
    }
  }

  const handleMainButtonClick = () => {
    if (isFolder) {
      if (!isBranchActive) {
        if (onActivateBranch) {
          onActivateBranch()
        }
      } else {
        onClick()
      }
    } else {
      onClick()
    }
  }

  let itemClasses = "glass-item text-zinc-200"
  let iconColor = "text-zinc-200"
  let badgeColor = "bg-black/60 border-white/10 text-zinc-300"
  let customStyle: React.CSSProperties = {}
  let customBadgeStyle: React.CSSProperties = {}
  let customIconStyle: React.CSSProperties = {}

  if (color && !isStatic && !isAddButton) {
    customStyle = {
      borderColor: `${color}88`,
      backgroundColor: `${color}18`,
      boxShadow: `0 4px 14px ${color}33`,
    }
    customIconStyle = {
      color: color,
      filter: `drop-shadow(0 0 6px ${color}80)`
    }
    customBadgeStyle = {
      borderColor: `${color}55`,
      color: color,
      backgroundColor: '#000000cc'
    }
  }

  if (isStatic) {
    itemClasses = "bg-amber-500/20 border-amber-400/40 text-amber-200 hover:bg-amber-500/35 hover:border-amber-300"
    iconColor = "text-amber-300"
    badgeColor = "bg-amber-500/20 border-amber-400/30 text-amber-200"
  } else if (isAddButton) {
    itemClasses = "bg-indigo-500/15 border-indigo-400/40 border-dashed text-indigo-200 hover:bg-indigo-500/30 hover:border-indigo-400"
    iconColor = "text-indigo-300"
    badgeColor = "bg-indigo-500/20 border-indigo-400/30 text-indigo-200"
  } else if (isFolder) {
    itemClasses = "glass-item border-amber-400/35 text-amber-200 hover:border-amber-400/70 shadow-amber-500/10"
    iconColor = "text-amber-300"
    badgeColor = "bg-amber-950/40 border-amber-400/30 text-amber-200"
  }

  // Branch Geometry: Generous gap preventing items or labels from touching
  const centerAngle = Math.atan2(y, x)
  const totalBranch = branchItems.length
  
  let branchRadius = 180
  let angleStep = 0.72
  if (totalBranch >= 5) {
    branchRadius = 195
    angleStep = 0.58
  } else if (totalBranch === 4) {
    branchRadius = 185
    angleStep = 0.65
  } else if (totalBranch <= 2) {
    branchRadius = 175
    angleStep = 0.75
  }

  const arcSpan = totalBranch > 1 ? (totalBranch - 1) * angleStep : 0
  const startAngle = centerAngle - arcSpan / 2

  return (
    <motion.div
      className="absolute top-1/2 left-1/2 -ml-6 -mt-6 z-20 flex items-center justify-center pointer-events-auto"
      initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
      animate={{ 
        scale: 1, 
        opacity: 1, 
        x, 
        y,
        transition: {
          type: 'spring',
          stiffness: 400,
          damping: 25,
          delay: index * 0.035
        }
      }}
      exit={{ 
        scale: 0, 
        opacity: 0, 
        x: 0, 
        y: 0,
        transition: {
          duration: 0.18,
          ease: 'easeInOut'
        }
      }}
      onMouseEnter={handleMouseEnter}
    >
      {/* Folder Indicator Dot */}
      {isFolder && (
        <span 
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-400 border border-black shadow-sm z-30" 
          title="Folder (Contains sub-items)"
        />
      )}

      {/* Main Button with Isolated Motion Animations */}
      <motion.button
        type="button"
        whileHover={{ 
          scale: 1.15,
          transition: { type: 'spring', stiffness: 500, damping: 20 }
        }}
        whileTap={{ scale: 0.92 }}
        onClick={(e) => {
          e.stopPropagation()
          handleMainButtonClick()
        }}
        style={customStyle}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-shadow shadow-lg backdrop-blur-md cursor-pointer outline-none focus:ring-2 focus:ring-indigo-400/60 relative z-20 ${itemClasses}`}
        aria-label={label}
      >
        <DynamicIcon 
          name={icon} 
          nativeIcon={nativeIcon} 
          className={`w-5 h-5 ${iconColor}`} 
          size={22} 
          style={customIconStyle}
        />
      </motion.button>

      {/* Persistent Name Label Underneath the Icon */}
      <div className="absolute top-[52px] left-1/2 -translate-x-1/2 pointer-events-none text-center max-w-[85px] z-30">
        <span 
          style={customBadgeStyle}
          className={`text-[10px] font-medium drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] truncate block px-1.5 py-0.5 rounded backdrop-blur-sm border shadow-sm ${badgeColor}`}
        >
          {label}
        </span>
      </div>

      {/* Folder Branching (Sub-items with wide gap and stable hover) */}
      <AnimatePresence>
        {isBranchActive && isFolder && (
          <div className="absolute top-1/2 left-1/2 pointer-events-auto z-40">
            {/* If folder has items */}
            {totalBranch > 0 ? (
              branchItems.map((child, cIdx) => {
                const itemAngle = totalBranch === 1 ? centerAngle : startAngle + cIdx * angleStep
                const bx = Math.round(branchRadius * Math.cos(itemAngle))
                const by = Math.round(branchRadius * Math.sin(itemAngle))

                return (
                  <motion.div
                    key={child.path}
                    className="absolute -ml-5 -mt-5 flex flex-col items-center justify-center z-40"
                    initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
                    animate={{ 
                      scale: 1, 
                      opacity: 1, 
                      x: bx, 
                      y: by,
                      transition: {
                        type: 'spring',
                        stiffness: 380,
                        damping: 26,
                        delay: cIdx * 0.03
                      }
                    }}
                    exit={{ 
                      scale: 0, 
                      opacity: 0, 
                      x: 0, 
                      y: 0,
                      transition: { duration: 0.15 } 
                    }}
                  >
                    {/* Branch Child Button with Isolated Motion Animations */}
                    <motion.button
                      type="button"
                      whileHover={{ 
                        scale: 1.2,
                        transition: { type: 'spring', stiffness: 500, damping: 20 }
                      }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        if (onExecuteChild) {
                          onExecuteChild(child.path)
                        }
                      }}
                      className="w-10 h-10 rounded-full glass-item flex items-center justify-center bg-[#181820]/95 border border-white/20 hover:border-amber-400 hover:bg-[#252532] shadow-2xl cursor-pointer transition-all"
                      title={child.name}
                    >
                      <DynamicIcon 
                        name={child.icon} 
                        className={child.isDirectory ? "text-amber-300 w-4 h-4" : "text-zinc-200 w-4 h-4"} 
                        size={17} 
                      />
                    </motion.button>

                    {/* Branch Child Label Underneath */}
                    <div className="absolute top-12 pointer-events-none whitespace-nowrap text-center max-w-[80px]">
                      <span className="text-[9.5px] font-medium text-zinc-200 drop-shadow-[0_1px_3px_rgba(0,0,0,0.95)] truncate block px-2 py-0.5 rounded-md bg-[#121218]/90 border border-white/15 backdrop-blur-md shadow-lg">
                        {child.name}
                      </span>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              /* If folder is empty */
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1, 
                  x: Math.round(branchRadius * Math.cos(centerAngle)), 
                  y: Math.round(branchRadius * Math.sin(centerAngle)) 
                }}
                exit={{ scale: 0, opacity: 0 }}
                className="absolute -ml-16 -mt-3.5 z-40 px-3 py-1 rounded-lg bg-black/85 border border-white/20 text-[10px] text-zinc-400 shadow-xl whitespace-nowrap pointer-events-none"
              >
                {isLoadingBranch ? "Loading..." : "Folder is empty"}
              </motion.div>
            )}
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
