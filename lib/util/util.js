const fs = require('fs-extra')
const path = require('path')

// 写入文件
function writeFileTree (dir, files) {
  Object.keys(files).forEach((name) => {
    const filePath = path.join(dir, name)  // 拼接文件路径
    fs.ensureDirSync(path.dirname(filePath))  // 创建文件(package.json) 确保文件夹(项目文件夹)存在，如果文件夹路径不存在会帮你创建出来
    fs.writeFileSync(filePath, files[name])  // 将内容写入文件
  })
}
module.exports = {
  writeFileTree
}