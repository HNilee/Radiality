#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const os = require('os')
const { spawn, spawnSync, execSync } = require('child_process')
const readline = require('readline')

const isWin = process.platform === 'win32'
const isMac = process.platform === 'darwin'

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

function askYesNo(rl, question, defaultVal = true) {
  const hint = defaultVal ? '(Y/n)' : '(y/N)'
  return new Promise((resolve) => {
    rl.question(`${question} ${hint}: `, (answer) => {
      const a = answer.trim().toLowerCase()
      if (a === '') {
        resolve(defaultVal)
      } else if (a === 'y' || a === 'yes') {
        resolve(true)
      } else {
        resolve(false)
      }
    })
  })
}

function renderProgressBar(current, total, width = 30) {
  const pct = Math.min(1, current / total)
  const filled = Math.round(width * pct)
  const empty = width - filled
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `[${bar}] ${Math.round(pct * 100)}%`
}

async function downloadFileWithProgress(url, destPath) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Radiality-CLI' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  const total = parseInt(res.headers.get('content-length') || '0', 10)
  const fileStream = fs.createWriteStream(destPath)
  let downloaded = 0

  await new Promise((resolve, reject) => {
    fileStream.on('error', reject)
    fileStream.on('finish', resolve)

    ;(async () => {
      try {
        for await (const chunk of res.body) {
          downloaded += chunk.length
          if (!fileStream.write(chunk)) {
            await new Promise((r) => fileStream.once('drain', r))
          }
          if (total > 0) {
            process.stdout.write(`\rDownloading package: ${renderProgressBar(downloaded, total)} ${(downloaded / 1048576).toFixed(1)}MB / ${(total / 1048576).toFixed(1)}MB`)
          } else {
            process.stdout.write(`\rDownloading package: ${(downloaded / 1048576).toFixed(1)}MB`)
          }
        }
        fileStream.end()
      } catch (err) {
        fileStream.destroy(err)
        reject(err)
      }
    })()
  })

  process.stdout.write('\n')
  await new Promise((r) => setTimeout(r, 800))
}

function copyRecursiveSync(src, dest, onFile) {
  const exists = fs.existsSync(src)
  const stats = exists && fs.statSync(src)
  const isDirectory = exists && stats.isDirectory()
  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true })
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName), onFile)
    })
  } else {
    const parent = path.dirname(dest)
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true })
    }
    fs.copyFileSync(src, dest)
    if (onFile) onFile(dest)
  }
}

function countFiles(src) {
  let count = 0
  if (!fs.existsSync(src)) return 0
  const stats = fs.statSync(src)
  if (stats.isDirectory()) {
    const items = fs.readdirSync(src)
    for (const item of items) {
      count += countFiles(path.join(src, item))
    }
  } else {
    count = 1
  }
  return count
}

async function runUninstaller(rl) {
  console.log('\n======================================================')
  console.log('             RADIALITY UNINSTALLER (CLI)              ')
  console.log('======================================================\n')

  let defaultPath = isWin 
    ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Radiality')
    : '/Applications/Radiality.app'

  if (isWin && !fs.existsSync(defaultPath)) {
    const localAppData = path.join(os.homedir(), 'AppData', 'Local', 'Programs', 'Radiality')
    if (fs.existsSync(localAppData)) defaultPath = localAppData
  }

  const confirm = await askYesNo(rl, `Are you sure you want to uninstall Radiality from "${defaultPath}"?`, false)
  if (!confirm) {
    console.log('\nUninstallation cancelled.')
    rl.close()
    return
  }

  console.log('\nRemoving installed files...')
  try {
    if (fs.existsSync(defaultPath)) {
      fs.rmSync(defaultPath, { recursive: true, force: true })
      console.log(`✓ Removed: ${defaultPath}`)
    }

    // Remove desktop shortcut
    if (isWin) {
      const desktopShortcut = path.join(os.homedir(), 'Desktop', 'Radiality.lnk')
      if (fs.existsSync(desktopShortcut)) {
        fs.unlinkSync(desktopShortcut)
        console.log(`✓ Removed Desktop shortcut`)
      }
    } else if (isMac) {
      const desktopAlias = path.join(os.homedir(), 'Desktop', 'Radiality.app')
      if (fs.existsSync(desktopAlias)) {
        fs.rmSync(desktopAlias, { recursive: true, force: true })
        console.log(`✓ Removed Desktop alias`)
      }
    }

    console.log('\n✓ Radiality has been successfully uninstalled.\n')
  } catch (err) {
    console.error(`\nError during uninstallation: ${err.message}`)
    if (isWin) console.log('Tip: Try running this terminal as Administrator.')
  }
  rl.close()
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  if (process.argv.includes('--uninstall') || process.argv.includes('-u')) {
    await runUninstaller(rl)
    return
  }

  console.clear()
  console.log('======================================================')
  console.log('          RADIALITY SETUP & INSTALLATION (CLI)        ')
  console.log('       Customizable Radial Toolbar for Your Desktop   ')
  console.log('======================================================\n')

  // STEP 1: LICENSE AGREEMENT (ToC)
  console.log('--- STEP 1 OF 3: TERMS OF AGREEMENT ---')
  console.log('Radiality is licensed for personal & commercial use on Windows and macOS.')
  console.log('• Runs 100% locally on your machine with ZERO tracking/telemetry.')
  console.log('• Smooth spring physics animated radial wheel toolbar.')
  console.log('• Supports ALL files, applications, folders, and original icons.')
  console.log('• Provided "AS IS" without warranty of any kind.\n')

  const acceptLicense = await askYesNo(rl, 'Do you accept the Terms of Agreement?', true)
  if (!acceptLicense) {
    console.log('\nInstallation aborted: License Agreement was not accepted.')
    rl.close()
    process.exit(0)
  }

  // STEP 2: INSTALLATION DIRECTORY
  console.log('\n--- STEP 2 OF 3: INSTALLATION DIRECTORY ---')
  let defaultDir = isWin 
    ? path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Radiality')
    : '/Applications/Radiality.app'

  let targetDir = defaultDir
  let confirmedDir = false

  while (!confirmedDir) {
    const useDefault = await askYesNo(rl, `Install to default path [${defaultDir}]?`, true)
    if (useDefault) {
      targetDir = defaultDir
      confirmedDir = true
    } else {
      const customPath = await ask(rl, 'Enter full path for installation: ')
      if (!customPath) {
        console.log('Path cannot be empty. Please try again.')
        continue
      }
      const confirmCustom = await askYesNo(rl, `Proceed with path: "${customPath}"?`, true)
      if (confirmCustom) {
        targetDir = path.resolve(customPath)
        confirmedDir = true
      }
    }
  }

  // STEP 3: INSTALLATION
  console.log('\n--- STEP 3 OF 3: INSTALLING RADIALITY ---')
  console.log(`Destination: ${targetDir}\n`)

  const rootDir = path.resolve(__dirname, '..')

  if (isWin) {
    let setupExe = [
      path.join(rootDir, 'windows', 'Radiality-Setup.exe'),
      path.join(process.cwd(), 'windows', 'Radiality-Setup.exe'),
      path.join(process.cwd(), 'Radiality-Setup.exe')
    ].find((p) => fs.existsSync(p))

    let isTempExe = false
    if (!setupExe) {
      const tempExe = path.join(os.tmpdir(), `Radiality-Setup-${Date.now()}-${Math.floor(Math.random() * 10000)}.exe`)
      const dlUrl = 'https://github.com/HNilee/Radiality/raw/main/windows/Radiality-Setup.exe'
      console.log('Fetching standalone pre-built Radiality package from GitHub...')
      try {
        await downloadFileWithProgress(dlUrl, tempExe)
        setupExe = tempExe
        isTempExe = true
      } catch (dlErr) {
        console.error(`Download failed: ${dlErr.message}`)
        rl.close()
        process.exit(1)
      }
    }

    console.log(`Extracting and configuring Radiality into: ${targetDir}...`)
    try {
      const res = spawnSync(setupExe, ['/silent', `/dir=${targetDir}`, '/nodesktop'], {
        stdio: 'inherit',
        windowsHide: false
      })
      if (res.error) throw res.error
      if (res.status !== 0) throw new Error(`Installer exited with code ${res.status}`)
      console.log('✓ Radiality files extracted and configured successfully.')
    } catch (installErr) {
      console.error(`Installation failed: ${installErr.message}`)
      if (targetDir.toLowerCase().includes('program files')) {
        console.log('\n[!] Tip: Installing to "C:\\Program Files" requires Administrator privileges.')
        console.log('    Please restart your terminal/cmd as Administrator, or choose a user path.\n')
      }
      rl.close()
      process.exit(1)
    } finally {
      if (isTempExe && fs.existsSync(setupExe)) {
        try { fs.unlinkSync(setupExe) } catch {}
      }
    }
  } else if (isMac) {
    let sourceAppDir = path.join(rootDir, 'release', 'mac', 'Radiality.app')
    if (fs.existsSync(sourceAppDir)) {
      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true })
      }
      copyRecursiveSync(sourceAppDir, targetDir)
      try { execSync(`xattr -cr "${targetDir}" 2>/dev/null || true`) } catch {}
      console.log(`✓ Radiality copied to ${targetDir}`)
    } else {
      console.log('For macOS, please run ./macos/Radiality-Setup.command or ./macos/install-mac.sh')
    }
  }

  // POST-INSTALLATION OPTIONS
  console.log('\n--- FINISHING SETUP ---')
  const createDesktop = await askYesNo(rl, 'Create a Desktop shortcut?', true)
  if (createDesktop) {
    try {
      if (isWin) {
        const desktopPath = path.join(os.homedir(), 'Desktop')
        const lnkPath = path.join(desktopPath, 'Radiality.lnk')
        const exePath = path.join(targetDir, 'Radiality.exe')
        const iconPath = path.join(targetDir, 'public', 'icon.ico')
        const psScript = `
          $wscript = New-Object -ComObject WScript.Shell;
          $shortcut = $wscript.CreateShortcut('${lnkPath.replace(/'/g, "''")}');
          $shortcut.TargetPath = '${exePath.replace(/'/g, "''")}';
          $shortcut.WorkingDirectory = '${targetDir.replace(/'/g, "''")}';
          if (Test-Path '${iconPath.replace(/'/g, "''")}') { $shortcut.IconLocation = '${iconPath.replace(/'/g, "''")}'; };
          $shortcut.Save();
        `
        execSync(`powershell -NoProfile -Command "${psScript.replace(/\n/g, ' ')}"`, { stdio: 'ignore' })
        console.log('✓ Desktop shortcut created.')
      } else if (isMac) {
        const desktopPath = path.join(os.homedir(), 'Desktop')
        const aliasPath = path.join(desktopPath, 'Radiality.app')
        execSync(`ln -sf "${targetDir}" "${aliasPath}"`, { stdio: 'ignore' })
        console.log('✓ Desktop alias created.')
      }
    } catch (e) {
      console.log('Note: Could not create desktop shortcut automatically.')
    }
  }

  const launchNow = await askYesNo(rl, 'Launch Radiality now?', true)
  if (launchNow) {
    try {
      if (isWin) {
        const exePath = path.join(targetDir, 'Radiality.exe')
        spawn(exePath, [], { detached: true, stdio: 'ignore', cwd: targetDir }).unref()
      } else if (isMac) {
        spawn('open', [targetDir], { detached: true, stdio: 'ignore' }).unref()
      }
      console.log('✓ Radiality launched.')
    } catch (e) {
      console.log('Could not launch application automatically.')
    }
  }

  console.log('\n======================================================')
  console.log('            RADIALITY INSTALLATION COMPLETE!          ')
  console.log('======================================================')
  console.log(`Installed Location: ${targetDir}`)
  console.log('Default Hotkey:     [Alt + Space] (Option + Space on Mac)')
  console.log('To uninstall later: npx radiality --uninstall')
  console.log('======================================================\n')

  rl.close()
}

main().catch((err) => {
  console.error('\nInstallation failed:', err)
  process.exit(1)
})
