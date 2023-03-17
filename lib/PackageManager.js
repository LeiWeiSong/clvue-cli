const { semver, execa } = require('@vue/cli-shared-utils')
const { executeCommand } = require('./util/executeCommand')

const PACKAGE_MANAGER_CONFIG = {
  npm: {
    install: ['install', '--loglevel', 'error']
  }
}
  
class PackageManager {
  constructor ({ context } = {}) {
    this.context = context || process.cwd()
    this.bin = 'npm'
    this._registries = {}

    // npm 版本处理
    const MIN_SUPPORTED_NPM_VERSION = '6.9.0'
    // 获取用户电脑环境 npm 版本
    const npmVersion = execa.sync('npm', ['--version']).stdout  // Node.js 中调用外部命令的函数。具体来说，它会在命令行中执行 npm --version 命令，以获取安装在系统中的 npm 版本号。
    if (semver.lt(npmVersion, MIN_SUPPORTED_NPM_VERSION)) {  // semver.lt检测两个版本号大小，如果第一个版本号小于第二个版本号，返回true，否则返回false
      console.log(`当前 npm 版本为 ${npmVersion}，请升级到 ${MIN_SUPPORTED_NPM_VERSION} 以上`);
      throw new Error('NPM 版本太低啦，请升级')
    }
    if (semver.gte(npmVersion, '7.0.0')) {
      this.needsPeerDepsFix = true
    }
  }

  // 安装依赖
  async install () {
    const args = []
    // npm 版本大于7
    if (this.needsPeerDepsFix) {
      args.push('--legacy-peer-deps')
    }
    return await this.runCommand('install', args)
  }

  async runCommand (command, args) {
    // 执行命令
    await executeCommand(
      this.bin,
      [
        ...PACKAGE_MANAGER_CONFIG[this.bin][command], // npm install --loglevel error
        ...(args || []) // --legacy-peer-deps
      ],
      this.context
    )
  }
}

module.exports = PackageManager;