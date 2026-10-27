import React from 'react'
import * as LucideIcons from 'lucide-react'
import { Check } from 'lucide-react'

export const AVAILABLE_ICONS = [
  'FileText', 'Folder', 'Calculator', 'Terminal', 'Globe', 
  'Code', 'Music', 'Video', 'Image', 'Gamepad2', 'Mail', 
  'Camera', 'Compass', 'Cpu', 'Layers', 'Package', 
  'Zap', 'Shield', 'Database', 'Bookmark', 'MessageSquare',
  'Monitor', 'HardDrive', 'Play', 'ExternalLink'
]

export const PRESET_COLORS = [
  { name: 'Default', value: '' },
  { name: 'Apple Blue', value: '#0A84FF' },
  { name: 'Purple', value: '#BF5AF2' },
  { name: 'Emerald', value: '#30D158' },
  { name: 'Orange', value: '#FF9F0A' },
  { name: 'Red', value: '#FF453A' },
  { name: 'Hot Pink', value: '#FF375F' },
  { name: 'Sky Cyan', value: '#64D2FF' },
  { name: 'Gold Yellow', value: '#FFD60A' },
  { name: 'Indigo', value: '#5E5CE6' },
]

export const DynamicIcon: React.FC<{ 
  name: string
  nativeIcon?: string
  className?: string
  size?: number
  style?: React.CSSProperties
}> = ({ 
  name, 
  nativeIcon,
  className = "w-5 h-5",
  size = 22,
  style
}) => {
  if (nativeIcon) {
    return (
      <img 
        src={nativeIcon} 
        alt="" 
        className="object-contain pointer-events-none select-none drop-shadow-sm" 
        style={{ 
          width: size, 
          height: size, 
          minWidth: size, 
          minHeight: size,
          imageRendering: '-webkit-optimize-contrast',
          ...style 
        }} 
      />
    )
  }
  // @ts-ignore
  const IconComponent = LucideIcons[name] || LucideIcons.FileQuestion || LucideIcons.AppWindow
  return <IconComponent className={className} size={size} style={style} />
}

interface ColorPickerProps {
  currentColor?: string
  onChangeColor: (color: string) => void
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor = '', onChangeColor }) => {
  return (
    <div className="flex flex-wrap items-center gap-2 p-2 bg-black/40 rounded-xl border border-white/10">
      {PRESET_COLORS.map((c) => {
        const isSelected = (!currentColor && !c.value) || (currentColor.toLowerCase() === c.value.toLowerCase())
        return (
          <button
            key={c.name}
            type="button"
            onClick={() => onChangeColor(c.value)}
            className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer relative ${
              c.value ? '' : 'bg-zinc-700 border border-white/20'
            }`}
            style={c.value ? { backgroundColor: c.value } : undefined}
            title={c.name}
          >
            {isSelected && (
              <Check size={12} strokeWidth={3} className="text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
            )}
          </button>
        )
      })}

      {/* Custom Color Input */}
      <label className="relative w-6 h-6 rounded-full overflow-hidden cursor-pointer border border-white/30 flex items-center justify-center bg-gradient-to-tr from-rose-500 via-amber-400 to-indigo-500 hover:scale-105 transition-transform" title="Custom Hex Color">
        <input 
          type="color" 
          value={currentColor || '#0A84FF'} 
          onChange={(e) => onChangeColor(e.target.value)} 
          className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
        />
      </label>
    </div>
  )
}

interface IconPickerProps {
  currentIcon: string
  nativeIcon?: string
  hasNativeOption?: boolean
  onSelect: (iconName: string, useNative?: boolean) => void
}

export const IconPicker: React.FC<IconPickerProps> = ({ 
  currentIcon, 
  nativeIcon,
  hasNativeOption = false,
  onSelect 
}) => {
  return (
    <div className="space-y-2 p-2 bg-black/40 rounded-xl border border-white/10">
      {/* Option to use extracted native application icon */}
      {nativeIcon && (
        <div className="pb-2 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src={nativeIcon} alt="" className="w-6 h-6 object-contain rounded" />
            <span className="text-[11px] text-zinc-300">Original App Icon Detected</span>
          </div>
          <button
            type="button"
            onClick={() => onSelect(currentIcon, true)}
            className="text-[11px] font-medium text-[#0A84FF] hover:text-[#0077ED] bg-[#0A84FF]/15 border border-[#0A84FF]/30 px-2.5 py-1 rounded-lg cursor-pointer transition-colors"
          >
            Use Original Icon
          </button>
        </div>
      )}

      {/* Grid of icons */}
      <div className="grid grid-cols-6 gap-2 max-h-44 overflow-y-auto custom-scrollbar">
        {AVAILABLE_ICONS.map((iconName) => (
          <button
            key={iconName}
            type="button"
            onClick={() => onSelect(iconName, false)}
            className={`flex items-center justify-center p-2 rounded-lg transition-all cursor-pointer ${
              currentIcon === iconName && !nativeIcon
                ? 'bg-[#0A84FF] text-white shadow-lg shadow-[#0A84FF]/40 scale-105'
                : 'text-zinc-400 hover:text-white hover:bg-white/10'
            }`}
            title={iconName}
          >
            <DynamicIcon name={iconName} size={18} />
          </button>
        ))}
      </div>
    </div>
  )
}
