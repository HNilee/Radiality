import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { AppConfig, MenuItem } from '../types'
import { RadialItem } from './RadialItem'
import { getCoordinates } from '../utils/math'

interface RadialMenuProps {
  isOpen: boolean
  config: AppConfig
  onClose: () => void
  onOpenSettings: () => void
  onExecuteItem: (item: MenuItem) => void
  onExecuteChildPath: (childPath: string) => void
  onAddNewShortcut: () => void
}

export const RadialMenu: React.FC<RadialMenuProps> = ({
  isOpen,
  config,
  onClose,
  onOpenSettings,
  onExecuteItem,
  onExecuteChildPath,
  onAddNewShortcut,
}) => {
  const radius = config.radius || 140
  const [activeBranchId, setActiveBranchId] = React.useState<string | null>(null)

  // Reset active branch when menu closes
  React.useEffect(() => {
    if (!isOpen) {
      setActiveBranchId(null)
    }
  }, [isOpen])

  const canAddMore = config.items.length < 8

  const wheelSlots: Array<{
    id: string
    label: string
    path: string
    icon: string
    color?: string
    nativeIcon?: string
    isStatic?: boolean
    isAddButton?: boolean
    onClick: () => void
  }> = [
    {
      id: 'static-settings',
      label: 'Settings',
      path: '',
      icon: 'Settings',
      isStatic: true,
      onClick: onOpenSettings,
    },
    ...config.items.map((item) => ({
      id: item.id,
      label: item.label,
      path: item.path,
      icon: item.icon,
      color: item.color,
      nativeIcon: item.nativeIcon,
      isStatic: false,
      onClick: () => onExecuteItem(item),
    })),
    ...(canAddMore
      ? [
          {
            id: 'add-shortcut',
            label: '+ Add',
            path: '',
            icon: 'Plus',
            isAddButton: true,
            onClick: onAddNewShortcut,
          },
        ]
      : []),
  ]

  const totalSlots = wheelSlots.length

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
      <AnimatePresence>
        {isOpen && (
          <div className="relative flex items-center justify-center w-[480px] h-[480px] pointer-events-none">
            {/* Ambient Background Glow */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-indigo-500/20 via-purple-500/10 to-amber-500/10 blur-2xl pointer-events-none"
            />

            {/* Orbit Guide Line */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              style={{
                width: radius * 2,
                height: radius * 2,
              }}
              className="absolute rounded-full border border-dashed border-white/10 pointer-events-none"
            />

            {/* Inner Decorative Ring */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.5 }}
              exit={{ scale: 0.2, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="absolute w-24 h-24 rounded-full border border-white/10 pointer-events-none"
            />

            {/* Center 'X' Close Button */}
            <motion.div
              className="relative z-30 flex items-center justify-center pointer-events-auto"
              initial={{ scale: 0, rotate: -90, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              exit={{ scale: 0, rotate: 90, opacity: 0 }}
              transition={{
                type: 'spring',
                stiffness: 450,
                damping: 24,
              }}
              whileHover={{ 
                scale: 1.15, 
                rotate: 90,
                transition: { duration: 0.2 } 
              }}
              whileTap={{ scale: 0.9 }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onClose()
                }}
                className="w-[52px] h-[52px] rounded-full glass-center text-zinc-300 hover:text-red-400 flex items-center justify-center cursor-pointer outline-none focus:ring-2 focus:ring-red-400/50 transition-colors shadow-2xl"
                title="Close Radial Menu (Esc / Click outside)"
                aria-label="Close Menu"
              >
                <X size={22} strokeWidth={2.2} />
              </button>
            </motion.div>

            {/* Radial Slots */}
            {wheelSlots.map((slot, index) => {
              const { x, y } = getCoordinates(index, totalSlots, radius)
              return (
                <RadialItem
                  key={slot.id}
                  id={slot.id}
                  label={slot.label}
                  path={slot.path}
                  icon={slot.icon}
                  color={slot.color}
                  nativeIcon={slot.nativeIcon}
                  x={x}
                  y={y}
                  index={index}
                  isStatic={slot.isStatic}
                  isAddButton={slot.isAddButton}
                  isBranchActive={activeBranchId === slot.id}
                  onActivateBranch={() => setActiveBranchId(slot.id)}
                  onDeactivateBranch={() => {
                    if (activeBranchId === slot.id) {
                      setActiveBranchId(null)
                    }
                  }}
                  onClick={slot.onClick}
                  onExecuteChild={onExecuteChildPath}
                />
              )
            })}
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
