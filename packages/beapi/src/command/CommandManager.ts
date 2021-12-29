/* eslint-disable prettier/prettier */
import { events } from '../events/EventManager.js'
import { mcbe, version } from '../version.js'
import type { CommandMapOptions, CommandResponse, CommandOptions, ChatCommand, JsonRequest } from '../@types/BeAPI.i'
import { socket } from '../socket/SocketManager.js'

export class CommandManager {
  private _prefix = '-'
  private readonly _commands = new Map<string, CommandMapOptions>()
  public enabled = true

  public constructor() {
    this._defaultCommands()
    events.on('ChatCommand', (data) => {
      this.executeCommand(data)
    })
  }

  private _defaultCommands(): void {
    this.registerCommand(
      {
        command: 'help',
        description: `Displays a list of available commands.`,
        aliases: ['h'],
      },
      (data) => {
        data.sender.sendMessage(`§bShowing all Available Commands:`)
        this.getCommands().forEach((command) => {
          if (!command.showInList) return
          data.sender.sendMessage(
            ` §7${this.getPrefix()}${command.options.command}§r §o§8- ${command.options.description}§r`,
          )
        })
      },
    )
    this.registerCommand(
      {
        command: 'about',
        description: 'Shows info about the server.',
        aliases: ['ab'],
      },
      (data) => {
        data.sender.sendMessage(
          `§7This server is running §9BeAPI v${version}§7 for §aMinecraft: Bedrock Edition v${mcbe}§7.`,
        )
      },
    )
    this.registerCommand(
      {
        command: 'sm',
        description: 'Interact with the socketmanager',
        permissionTags: ['dev'],
        showInList: false,
      },
      (data) => {
        if (!data.args[0]) return data.sender.sendMessage('§cInvalid parameter! Expected <log|send>')
        switch (data.args[0]) {
        case 'log': {
          if (!data.args[1]) return data.sender.sendMessage('§cInvalid parameter! Expected <true|false>')
          switch (data.args[1]) {
          case 't':
          case 'true':
            socket.log = true

            return data.sender.sendMessage(`§7SocketManager log set to §aTRUE§7.`)
          case 'f':
          case 'false':
            socket.log = false

            return data.sender.sendMessage(`§7SocketManger log set to §cFALSE§7.`)
          default:
            break
          }
          break
        }
        case 'send': {
          if (!data.args[1]) return data.sender.sendMessage('§cInvalid parameter! Expected {}')
          const message: JsonRequest = JSON.parse(data.args.join('').replace(data.args[0], ''))
          socket.sendMessage(message)

          return data.sender.sendMessage('§7Sent.')
        }
        }
      },
    )
  }

  private _parseCommand(content: string): { command: string; args: string[] } {
    const command = content.replace(this._prefix, '').split(' ')[0]
    const args = content.replace(`${this._prefix}${command} `, '').split(' ')
    if (args[0] === `${this._prefix}${command}`) args.shift()

    return {
      command: command,
      args: args,
    }
  }

  private executeCommand(data: ChatCommand): void {
    const parsedCommand = this._parseCommand(data.command)
    if (!this._commands.has(parsedCommand.command)) return data.sender.sendMessage("§cThis command doesn't exsist!")
    const commandData = this._commands.get(parsedCommand.command)
    if (!commandData?.options.permissionTags)
      return commandData?.execute({
        sender: data.sender,
        args: parsedCommand.args,
      })
    const tags: string[] = data.sender.getTags()
    const found = tags.some((r) => commandData.options.permissionTags?.includes(r))
    if (!found) return data.sender.sendMessage('§cYou dont have permission to use this command!')

    return commandData.execute({
      sender: data.sender,
      args: parsedCommand.args,
    })
  }

  public registerCommand(options: CommandOptions, callback: (data: CommandResponse) => void): void {
    if (this._commands.has(options.command)) return
    if (options.showInList === undefined) options.showInList = true
    this._commands.set(options.command, {
      options: options,
      showInList: options.showInList,
      execute: callback,
    })
    if (!options.aliases) return
    for (const aliases of options.aliases) {
      if (this._commands.has(aliases)) continue
      this._commands.set(aliases, {
        options: options,
        showInList: false,
        execute: callback,
      })
    }
  }

  public getCommands(): Map<string, CommandMapOptions> {
    return this._commands
  }

  public getPrefix(): string {
    return this._prefix
  }

  public setPrefix(prefix: string): void {
    this._prefix = prefix
  }
}

const commands = new CommandManager()

export { commands }
