import OBR from "@owlbear-rodeo/sdk"
import { Game } from "./game"

export interface InitiativeMetadata {
  playerid: string
  playername: string
}

export interface InitiativeItem {
  playerid: string
  playername: string
  cardname: string
  sequence: number
}

export async function setupInitiativeList(): Promise<void> {
  function renderList(items: any[]): void {
    Game.instance.updateGameOBState(items)
  }
  OBR.scene.items.onChange(renderList)
}