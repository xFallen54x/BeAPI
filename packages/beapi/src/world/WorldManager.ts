import type { Client } from '../client'
import type { Difficulty, Dimension, Weather, Location } from '../types'
import type { Entity } from '../entity'
import type { Player } from '../player'
import {
  Block,
  BlockLocation,
  world,
  Dimension as IDimension,
  ItemStack,
  BlockPermutation,
  MolangVariableMap,
  Location as ILocation,
} from 'mojang-minecraft'
export class WorldManager {
  protected readonly _client: Client
  public constructor(client: Client) {
    this._client = client
  }

  public sendMessage(message: string): void {
    this._client.executeCommand(`tellraw @a {"rawtext":[{"text":"${message.replace(/"/g, '\\"')}"}]}`)
  }

  public getEntitiesFromLocation(dimension: Dimension, location: Location): Entity[] {
    const entities = Array.from(this._client.entities.getAll().values()).filter(
      (x) => x.getLocation() === location && x.getDimensionName() === dimension,
    )

    return entities
  }

  public getPlayersFromLocation(dimension: Dimension, location: Location): Player[] {
    const players = Array.from(this._client.players.getAll().values()).filter(
      (x) => x.getLocation() === location && x.getDimensionName() === dimension,
    )

    return players
  }

  public spawnEntity(id: string, location: Location, dimension: Dimension): Entity | undefined {
    const entity = this.getDimension(dimension).spawnEntity(id, new BlockLocation(location.x, location.y, location.z))
    return this._client.entities.getByIEntity(entity)
  }

  public spawnItem(item: ItemStack, location: Location, dimension: Dimension): Entity | undefined {
    const entity = this.getDimension(dimension).spawnItem(item, new BlockLocation(location.x, location.y, location.z))
    return this._client.entities.getByIEntity(entity)
  }

  public spawnParticle(id: string, location: Location, dimension: Dimension, molangVarMap: MolangVariableMap): void {
    this.getDimension(dimension).spawnParticle(id, new ILocation(location.x, location.y, location.z), molangVarMap)
  }

  public setBlockPermutation(location: Location, dimension: Dimension, blockPermutation: BlockPermutation): Block {
    const block = this.getBlock(location, dimension)
    block.setPermutation(blockPermutation)

    return block
  }

  public getBlock(location: Location, dimension: Dimension): Block {
    return this.getDimension(dimension).getBlock(new BlockLocation(location.x, location.y, location.z))
  }

  public getDimension(dimension: Dimension): IDimension {
    return world.getDimension(dimension)
  }

  public getTime(): number {
    const command = this._client.executeCommand('time query daytime')
    if (command.err) return 0

    return parseInt(command.statusMessage.split(' ')[2], 10)
  }

  public setTime(time: number): void {
    this._client.executeCommand(`time set ${time}`)
  }

  public getWeather(): Weather {
    const command = this._client.executeCommand('weather query')
    if (command.err) return 'clear'

    return command.statusMessage.split(' ')[3] as Weather
  }

  public setWeather(weather: Weather): void {
    this._client.executeCommand(`weather ${weather}`)
  }

  public setDifficulty(difficulty: Difficulty): void {
    this._client.executeCommand(`difficulty ${difficulty}`)
  }
}
