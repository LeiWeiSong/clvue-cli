const inquirer = require('inquirer')
const { defaults, vuePresets } = require('./util/preset')
const chalk = require('chalk')
const PromptModuleAPI = require('./PromptModuleAPI')
const { getPromptModules } = require('./util/prompt')

// 初始化包管理工具环境，安装依赖
const { log, hasGit, hasProjectGit, execa } = require('@vue/cli-shared-utils')
const PackageManager = require('./PackageManager')
const { writeFileTree } = require('./util/util.js')

class Creator {
    // 构造函数，初始化
    constructor(name, context) {
        // 项目名称  
        this.name = name
        // 项目路径
        this.context = process.env.VUE_CLI_CONTEXT = context
        // package.json 数据
        this.pkg = {}
        // 包管理工具
        this.pm = null


        // 项目配置 用户选择vue版本
        this.presetPrompt = this.resolvePresetPrompts()
        // 自定义特性提示选项（复选框）
        this.featurePrompt = this.resolveFeaturePrompts()
        // 保存相关提示选项
        this.outroPrompts = this.resolveOutroPrompts()
        // 注入的提示选项
        this.injectedPrompts = []
        // 注入的回调
        this.promptCompleteCbs = []

        const promptAPI = new PromptModuleAPI(this)
        const promptModules = getPromptModules()
        promptModules.forEach(m => m(promptAPI))

        // 测试（仅为测试代码，用完需删除） 后续需要在获取用户输入时调用 create 方法
        // inquirer.prompt(this.resolveFinalPrompts()).then(res => {
        //     console.log('选择的选项：')
        //     console.log(res)
        // })
    }
    async create(cliOptions = {}) {
        // 获取用户选择的配置
        const preset = await this.promptAndResolvePreset()
        // 初始化用户选择的配置，安装依赖
        await this.initPackageManagerEnv(preset);
    }
    // 获取用户选择的配置
    async promptAndResolvePreset(answers = null) {
        try {
            let preset = null // 用户选择的配置
            const name = this.name
            // 如果用户没有选择配置，就提示用户选择配置
            if (!answers) {
                answers = await inquirer.prompt(this.resolveFinalPrompts())
            }
            // 如果用户选择的是vue2配置，就返回vue2默认配置
            if (answers.preset && answers.preset === 'Default (Vue 2)') {
                if (answers.preset in vuePresets) {
                    preset = vuePresets[answers.preset]
                }
            }
            // 如果用户选择的是vue3配置，就返回vue3默认配置
            if (answers.preset && answers.preset === 'Default (Vue 3)') {
                if (answers.preset in vuePresets) {
                    preset = vuePresets[answers.preset]
                }
            }
            // 如果用户选择的是手动选择配置，就提示用户选择配置
            if (answers.preset === '__manual__') {
                preset = answers
                return preset;
            }
            // 添加 projectName 属性
            preset.plugins['@vue/cli-service'] = Object.assign({
                projectName: name
            }, preset)
            // 返回用户选择的配置
            return preset
        } catch (err) {
            // 如果用户选择了取消，就退出
            console.log(chalk.red(err))
            process.exit(1)
        }
    }
    // 测试代码 获取用户输入
    resolveFinalPrompts() {
        const prompts = [
            this.presetPrompt,
            this.featurePrompt,
            ...this.outroPrompts,
            ...this.injectedPrompts,
        ]
        return prompts
    }
    // 获得预设的选项
    resolvePresetPrompts() {
        const presetChoices = Object.entries(defaults.presets).map(([name, preset]) => {
            return {
                name: `${name}(${Object.keys(preset.plugins).join(',')})`, // 将预设的插件放到提示
                value: name
            }
        })

        return {
            name: 'preset', // preset 记录用户选择的选项值。
            type: 'list', // list 表单选
            message: `Please pick a preset:`, // 提示信息
            choices: [ // 用户选项
                ...presetChoices, // Vue2 默认配置，Vue3 默认配置
                {
                    name: 'Manually select features', // 手动选择配置，自定义特性配置
                    value: '__manual__'
                }
            ]
        }
    }
    // 自定义特性复选框
    resolveFeaturePrompts() {
        return {
            name: 'features', // features 记录用户选择的选项值。
            when: answers => answers.preset === '__manual__', // 当选择"Manually select features"时，该提示显示
            type: 'checkbox',
            message: 'Check the features needed for your project:',
            choices: [], // 复选框值，待补充
            pageSize: 10
        }
    }
    // 保存相关提示选项
    resolveOutroPrompts() {
        const outroPrompts = [
            // useConfigFiles 是单选框提示选项。
            {
                name: 'useConfigFiles',
                when: answers => answers.preset === '__manual__', // 当选择"Manually select features"时，该提示显示
                type: 'list',
                message: 'Where do you prefer placing config for Babel, ESLint, etc.?',
                choices: [
                    {
                        name: 'In dedicated config files',
                        value: 'files'
                    },
                    {
                        name: 'In package.json',
                        value: 'pkg'
                    }
                ]
            },
            // 确认提示选项 提醒用户是否保存配置
            {
                name: 'save',
                when: answers => answers.preset === '__manual__',
                type: 'confirm',
                message: 'Save this as a preset for future projects?',
                default: false
            },
            // 输入提示选项
            {
                name: 'saveName',
                when: answers => answers.save,
                type: 'input',
                message: 'Save preset as:'
            }
        ]
        return outroPrompts
    }

    // 初始化用户选择的配置，安装依赖
    async initPackageManagerEnv(preset) {
        const { name, context } = this
        this.pm = new PackageManager({ context })
        return;
        // 打印提示
        log(`✨ 创建项目：${chalk.yellow(context)}`)

        // 用于生成 package.json 文件
        const pkg = {
            name,
            version: '0.1.0',
            private: true,
            devDependencies: {},
        }

        // 给 npm 包指定版本，简单做，使用最新的版本
        const deps = Object.keys(preset.plugins)
        deps.forEach(dep => {
            let { version } = preset.plugins[dep]
            if (!version) {
                version = 'latest'
            }
            pkg.devDependencies[dep] = version
        })

        this.pkg = pkg;

        // 写 package.json 文件
        await writeFileTree(context, {
            'package.json': JSON.stringify(pkg, null, 2)
        })

        // 初始化 git 仓库，以至于 vue-cli-service 可以设置 git hooks
        const shouldInitGit = this.shouldInitGit()
        if (shouldInitGit) {
            log(`🗃 初始化 Git 仓库...`)
            await this.run('git init')
        }

        // 安装插件 plugins
        log(`⚙ 正在安装 CLI plugins. 请稍候...`)

        await this.pm.install()
    }

    run(command, args) {
        if (!args) { [command, ...args] = command.split(/\s+/) }
        return execa(command, args, { cwd: this.context })
    }

    // 判断是否可以初始化 git 仓库：系统安装了 git 且目录下未初始化过，则初始化
    shouldInitGit() {
        if (!hasGit()) {
            // 系统未安装 git
            return false
        }

        // 项目未初始化 Git
        return !hasProjectGit(this.context)
    }
}

module.exports = Creator;