#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const create = require('../lib/create');
// 名称，描述，版本号，用法提示。
program
  .name('clvue-cli')
  .description('欢迎使用clvue-cli官方脚手架')
  .version(`clvue-cli ${require('../package').version}`)
  .usage('<command> [options]')

// 创建项目命令
program
.command('create <app-name>')
.description('创建项目')
.action((name, options) => {
  console.log(chalk.bold.blue(`Clvue CLI V1.0.0`))
  create(name, options)
})

// 帮助命令
program.on('--help', () => {
  console.log(`  Run ${chalk.yellow(`clvue-cli <command> --help`)} for detailed usage of given command.`)
})
program.parse(); // 解析