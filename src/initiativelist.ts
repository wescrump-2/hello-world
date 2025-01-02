import OBR, { isImage } from "@owlbear-rodeo/sdk"
import { Game } from "./game"


export interface InitiativeMetadata {
  playerid: string
  playername: string
}

interface InitiativeItem {
  playerid: string
  playername: string
  cardname: string
  sequence: number
}
// export async function startupClean(){
//   OBR.onReady
//   let flgexisting = false
//   let changes = []
//   const characters = await OBR.scene.items.getItems((item) => item.layer === "CHARACTER" && isImage(item))
//   for (const item of characters) {
//     const charmeta: InitiativeMetadata = item.metadata[`${Game.ID}/metadata`] as InitiativeItem
//     if (charmeta) {
//       delete charmeta
//       flgexisting=true
//     }
//   }
//   if (flgexisting) Game.instance.render()
//     OBR.scene.items.onChange(renderList)
// } 
export async function setupInitiativeList(): Promise<void> {
  // start up, find chars with metadata and create players for them if needed
  const renderList = (items: any[]): void => {
    // Get the name and initiative of any item with
    // our initiative metadata
    let flgrender = false
    const initiativeItems: InitiativeItem[] = [];
    for (const item of items) {
      if (item.layer === "CHARACTER" && isImage(item)) {
        const metadata: InitiativeMetadata = item.metadata[`${Game.ID}/metadata`] as InitiativeMetadata
        if (metadata) {
          let inititem = rehydratePlayer(metadata)
          initiativeItems.push(inititem);
          flgrender = true
        }
      }
    }

    const result = Game.instance.deck.players.filter(p => !initiativeItems.find(item => p.id === item.playerid));
    for (const p of result) {
      p.removeRender()
      Game.instance.removePlayer(p)
      flgrender = true
    }

    if (flgrender) {
      Game.instance.render()
    }
  };
  OBR.scene.items.onChange(renderList)
}
function rehydratePlayer(metadata: InitiativeMetadata): InitiativeItem {
  let p = Game.instance.deck.getPlayer(metadata.playerid)
  if (!p) {
    // if not, create them, give name and unique id from metadata
    p = Game.instance.addPlayer(metadata.playername)
    p.id = metadata.playerid
  }
  const c = p.bestCard()
  let cn = "No cards"
  let seq = 0
  if (c) {
    cn = c.toString()
    seq = c.sequence
  }
  return {
    playerid: p.id,
    playername: p.name,
    cardname: cn,
    sequence: seq,
  }
}