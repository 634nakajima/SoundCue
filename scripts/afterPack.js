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

  // Strip signatures from all native binaries inside the app bundle
  run(`find "${appPath}" -type f \\( -name "*.dylib" -o -name "*.so" -o -name "*.node" \\) | while read f; do codesign --remove-signature "$f" 2>/dev/null; done`)
  run(`codesign --remove-signature "${appPath}/Contents/MacOS/${context.packager.appInfo.productName}" 2>/dev/null`)
  run(`codesign --remove-signature "${appPath}" 2>/dev/null`)
}
