const { execSync } = require('child_process')
const path = require('path')

exports.default = async function (context) {
  if (context.electronPlatformName !== 'darwin') return

  const appPath = path.join(
    context.appOutDir,
    `${context.packager.appInfo.productName}.app`
  )

  const run = (cmd) => {
    try { execSync(cmd, { stdio: 'pipe' }) } catch (_) {}
  }

  // Ad-hoc sign so Gatekeeper shows "Open Anyway" instead of "damaged"
  run(`codesign --force --deep --sign - "${appPath}"`)
}
