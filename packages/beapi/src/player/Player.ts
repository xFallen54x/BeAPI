import {
  Dimension as IDimension,
  EntityHealthComponent,
  EntityInventoryComponent,
  Player as IPlayer,
  Location as ILocation,
  Vector,
  EffectType,
  Effect,
  ItemStack,
} from 'mojang-minecraft'
import { ModalForm, MessageForm, ActionForm } from '../forms'
import type { Entity } from '..'
import type { Client } from '../client'
import type { Location, Dimension, Gamemode, ServerCommandResponse, PlayerComponents, Objective } from '../types'
import { Agent } from '../agent/Agent'

export class Player {
  protected readonly _client: Client
  protected readonly _IPlayer: IPlayer
  protected readonly _name: string
  protected _agent: Agent | undefined
  protected _isSwimming = false
  protected _isInWater = false
  protected _isLanded = true
  protected _isBurning = false
  protected _isMoving = false
  protected _isSprinting = false
  protected _isRiding = false
  protected _isSleeping = false
  protected _isAlive = true
  protected _isMuted = false
  public prevPlayerInVector: Player | undefined
  public prevEntityInVector: Entity | undefined
  public constructor(client: Client, player: IPlayer) {
    this._client = client
    this._IPlayer = player
    this._name = player.name
    this._agent = this.getAgent()
  }

  public destroy(reason = 'Instantiated player object destroyed!'): void {
    this._client.executeCommand(`kick "${this.getNameTag()}" ${reason}`)
  }

  public getIPlayer(): IPlayer {
    return this._IPlayer
  }

  public getName(): string {
    return this._name
  }

  public getNameTag(): string {
    return this._IPlayer.nameTag
  }

  public setNameTag(nametag: string): void {
    this._IPlayer.nameTag = nametag
  }

  public getTags(): string[] {
    return this._IPlayer.getTags()
  }

  public hasTag(tag: string): boolean {
    return this._IPlayer.hasTag(tag)
  }

  public addTag(tag: string): boolean {
    return this._IPlayer.addTag(tag)
  }

  public removeTag(tag: string): boolean {
    return this._IPlayer.removeTag(tag)
  }

  public createModalForm(): ModalForm {
    return new ModalForm(this)
  }

  public createMessageForm(): MessageForm {
    return new MessageForm(this)
  }

  public createActionForm(): ActionForm {
    return new ActionForm(this, this._client)
  }

  public createAgent(): Agent {
    let agent = this.getAgent()
    if (!agent) {
      this.executeCommand('agent create')
      const entity = this._client.entities.getLastest()! // Should Not, Not Exist
      agent = new Agent(this._client, entity.getIEntity(), this)
      agent.addTag(this._name)
      this._agent = agent
    }

    return agent
  }

  public getAgent(): Agent | undefined {
    if (this._agent) return this._agent
    const entity = Array.from(this._client.entities.getAll().values()).find(
      (x) => x.getId() === 'minecraft:agent' && x.hasTag(this._name),
    )

    return entity ? new Agent(this._client, entity.getIEntity(), this) : undefined
  }

  public sendMessage(message: string): void {
    this.executeCommand(`tellraw @s {"rawtext":[{"text":"${message.replace(/"/g, '\\"')}"}]}`)
  }

  public sendActionbar(message: string): void {
    this.executeCommand(`titleraw @s actionbar {"rawtext":[{"text":"${message.replace(/"/g, '\\"')}"}]}`)
  }

  public sendTitle(message: string): void {
    this.executeCommand(`titleraw @s title {"rawtext":[{"text":"${message.replace(/"/g, '\\"')}"}]}`)
  }

  public sendSubtitle(message: string): void {
    this.executeCommand(`titleraw @s subtitle {"rawtext":[{"text":"${message.replace(/"/g, '\\"')}"}]}`)
  }

  public sendSound(sound: string, location?: Location, volume?: number, pitch?: number, maxVolume?: number): void {
    this.executeCommand(
      `playsound ${sound} ${location?.x ?? ''} ${location?.y ?? ''} ${location?.z ?? ''} ${volume ?? ''} ${
        pitch ?? ''
      } ${maxVolume ?? ''}`,
    )
  }

  public sendAnimation(animation: string): void {
    this.executeCommand(`playanimation @s ${animation}`)
  }

  public sendFog(type: 'pop' | 'push' | 'remove', fogId: string, globalId: string): void {
    this.executeCommand(`fog @s ${type} ${fogId} ${globalId}`)
  }

  public executeCommand<T>(cmd: string, debug = false): ServerCommandResponse<T> {
    try {
      const command = this._IPlayer.runCommand(cmd) as ServerCommandResponse<T>

      return {
        statusMessage: command.statusMessage,
        data: command as unknown as T,
        err: false,
      }
    } catch (error) {
      if (debug) console.warn(`[BeAPI] [Player#executeCommand]: ${String(error)}`)

      return {
        statusMessage: String(error),
        data: null,
        err: true,
      }
    }
  }

  public executeFunction(path: string): void {
    const command = this.executeCommand(`function ${path}`)
    if (command.err) return console.error(command.statusMessage)
  }

  public getScore(objective: Objective): number {
    const command = this.executeCommand(`scoreboard players test @s "${objective.id}" * *`)
    if (command.err) return 0

    return parseInt(String(command.statusMessage?.split(' ')[1]), 10)
  }

  public setScore(objective: Objective, amount: number): number {
    this.executeCommand(`scoreboard players set @s "${objective.id}" ${amount}`)

    return this.getScore(objective)
  }

  public addScore(objective: Objective, amount: number): number {
    this.executeCommand(`scoreboard players add @s "${objective.id}" ${amount}`)

    return this.getScore(objective)
  }

  public removeScore(objective: Objective, amount: number): number {
    this.executeCommand(`scoreboard players remove @s "${objective.id}" ${amount}`)

    return this.getScore(objective)
  }

  public setGamemode(gamemode: Gamemode): void {
    if (gamemode === this.getGamemode()) return
    const command = this.executeCommand(`gamemode ${gamemode}`)
    if (command.err) return console.error(command.statusMessage)
  }

  public getGamemode(): Gamemode {
    const gmc = this._client.executeCommand(`testfor @a[name="${this.getNameTag()}",m=c]`, this.getDimensionName())
    const gma = this._client.executeCommand(`testfor @a[name="${this.getNameTag()}",m=a]`, this.getDimensionName())
    const gms = this._client.executeCommand(`testfor @a[name="${this.getNameTag()}",m=s]`, this.getDimensionName())
    if (!gmc.err) return 'creative'
    if (!gma.err) return 'adventure'
    if (!gms.err) return 'survival'

    return 'unknown'
  }

  public getLocation(): Location {
    const pos = this._IPlayer.location

    return {
      x: Math.floor(pos.x),
      y: Math.floor(pos.y),
      z: Math.floor(pos.z),
    }
  }

  public getDimension(): IDimension {
    return this._IPlayer.dimension
  }

  public getDimensionName(): Dimension {
    const id = this.getDimension().id.split(':')[1].replace(/_/g, ' ')

    return id as Dimension
  }

  public getInventory(): EntityInventoryComponent {
    return this._IPlayer.getComponent('minecraft:inventory') as EntityInventoryComponent
  }

  public setItem(slot: number, item: ItemStack): void {
    this.getInventory().container.setItem(slot, item)
  }

  public getItem(slot: number): ItemStack | undefined {
    return this.getInventory().container.getItem(slot)
  }

  public getSelectedSlot(): number {
    return this._IPlayer.selectedSlot
  }

  public getTotalEmptySlots(): number {
    return this.getInventory().container.emptySlotsCount
  }

  public getInventorySize(): number {
    return this.getInventory().container.size
  }

  public getHealth(): EntityHealthComponent {
    return this._IPlayer.getComponent('minecraft:health') as EntityHealthComponent
  }

  public kick(reason = 'You were kicked from the game!'): void {
    this.destroy(reason)
  }

  public getVelocity(): Vector {
    return this._IPlayer.velocity
  }

  public setVelocity(velocity: Vector): void {
    this._IPlayer.setVelocity(velocity)
  }

  public teleport(location: Location, dimension: Dimension, xrot: number, yrot: number): void {
    const loc = new ILocation(location.x, location.y, location.z)
    this._IPlayer.teleport(loc, this._client.world.getDimension(dimension), xrot, yrot)
  }

  public teleportFacing(location: Location, dimension: Dimension, facingLocation: Location): void {
    const loc = new ILocation(location.x, location.y, location.z)
    const loc2 = new ILocation(facingLocation.x, facingLocation.y, facingLocation.z)
    this._IPlayer.teleportFacing(loc, this._client.world.getDimension(dimension), loc2)
  }

  public triggerEvent(event: string): void {
    this._IPlayer.triggerEvent(event)
  }

  public getRotation(): number {
    return this._IPlayer.bodyRotation
  }

  public getHeadLocation(): ILocation {
    return this._IPlayer.headLocation
  }

  public getComponent<K extends keyof PlayerComponents>(component: K): PlayerComponents[K] {
    return this._IPlayer.getComponent(component) as unknown
  }

  public hasComponent<K extends keyof PlayerComponents>(component: K): boolean {
    return this._IPlayer.hasComponent(component)
  }

  public addEffect(effect: EffectType, duration: number, amplifier: number): void {
    return this._IPlayer.addEffect(effect, duration, amplifier)
  }

  public getEffect(effect: EffectType): Effect {
    return this._IPlayer.getEffect(effect)
  }

  public setItemCooldown(itemCategory: string, ticks: number): void {
    this._IPlayer.startItemCooldown(itemCategory, ticks)
  }

  public getItemCooldown(itemCategory: string): number {
    return this._IPlayer.getItemCooldown(itemCategory)
  }

  public getXp(): number {
    const command = this.executeCommand<{ level: number }>('xp 0 @s')

    return command.data?.level ?? 0
  }

  public addXpLevel(level: number): number {
    const command = this.executeCommand<{ level: number }>(`xp ${level}l @s`)

    return command.data?.level ?? 0
  }

  public removeXpLevel(level: number): number {
    const command = this.executeCommand<{ level: number }>(`xp -${level}l @s`)

    return command.data?.level ?? 0
  }

  public addXpFloat(level: number): number {
    const command = this.executeCommand<{ level: number }>(`xp ${level} @s`)

    return command.data?.level ?? 0
  }

  public shakeCamera(type: 'positional' | 'rotational' | 'clear', intensity?: number, seconds?: number): void {
    if (type === 'clear') {
      this.executeCommand('camerashake stop @s')
    } else {
      this.executeCommand(`camerashake add @s ${intensity ?? 1} ${seconds ?? 1} ${type}`)
    }
  }

  public setSpawnPoint(location: Location): void {
    const command = this.executeCommand(`spawnpoint @s ${location.x} ${location.y} ${location.z}`)
    if (command.err) return console.error(command.statusMessage)
  }

  public isSneaking(): boolean {
    return this._IPlayer.isSneaking
  }

  public isSwimming(): boolean
  public isSwimming(val: boolean): void
  public isSwimming(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isSwimming = val
    } else return this._isSwimming
  }

  public isInWater(): boolean
  public isInWater(val: boolean): void
  public isInWater(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isInWater = val
    } else return this._isInWater
  }

  public isLanded(): boolean
  public isLanded(val: boolean): void
  public isLanded(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isLanded = val
    } else return this._isLanded
  }

  public isBurning(): boolean
  public isBurning(val: boolean): void
  public isBurning(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isBurning = val
    } else return this._isBurning
  }

  public isMoving(): boolean
  public isMoving(val: boolean): void
  public isMoving(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isMoving = val
    } else return this._isMoving
  }

  public isSprinting(): boolean
  public isSprinting(val: boolean): void
  public isSprinting(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isSprinting = val
    } else return this._isSprinting
  }

  public isRiding(): boolean
  public isRiding(val: boolean): void
  public isRiding(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isRiding = val
    } else return this._isRiding
  }

  public isSleeping(): boolean
  public isSleeping(val: boolean): void
  public isSleeping(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isSleeping = val
    } else return this._isSleeping
  }

  public isAlive(): boolean
  public isAlive(val: boolean): void
  public isAlive(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isAlive = val
    } else return this._isAlive
  }

  public isMuted(): boolean
  public isMuted(val: boolean): void
  public isMuted(val?: boolean): boolean | void {
    if (typeof val === 'boolean') {
      this._isMuted = val
    } else return this._isMuted
  }
}
