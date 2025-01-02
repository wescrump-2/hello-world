import OBR from "@owlbear-rodeo/sdk";
import { Game } from "./game";
const ID = "com.wescrump.initiative-tracker";

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

export function setupInitiativeList(element: HTMLElement): void {
  const renderList = (items: any[]): void => {
    // Get the name and initiative of any item with
    // our initiative metadata
    const initiativeItems: InitiativeItem[] = [];
    for (const item of items) {
      const metadata: InitiativeMetadata = item.metadata[`${ID}/metadata`];
      if (metadata) {
        //see if player is already created in initiative
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
        initiativeItems.push({
          playerid: metadata.playerid,
          playername: p.name,
          cardname: cn,
          sequence: seq,
        });
      }
    }

    const result = Game.instance.deck.players.filter(p => !initiativeItems.find(item => p.id === item.playerid));
    for (const p of result) {
      p.removeRender()
      Game.instance.removePlayer(p)
    }
    Game.instance.render()

    // Sort so the highest initiative value is on top
    // const sortedItems = initiativeItems.sort(
    //   (a, b) => b.sequence - a.sequence
    // );
    // Create new list nodes for each initiative item
    // const nodes = [];
    // for (const initiativeItem of sortedItems) {
    //   const node = document.createElement("li");
    //   node.innerHTML = `${initiativeItem.playername} (${initiativeItem.cardname})`;
    //   nodes.push(node);
    // }
    // element.replaceChildren(...nodes);
  };
  OBR.scene.items.onChange(renderList);
}