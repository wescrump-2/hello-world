import OBR from "@owlbear-rodeo/sdk";
import { Player } from "./player";
import { Util } from "./util";
import { Deck } from "./deck";

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

export function setupContextMenu() {
	OBR.contextMenu.create({
		id: `${Util.ID}/context-menu`,
		icons: [
			{
				icon: "/add.svg",
				label: "Add to Initiative",
				filter: {
					every: [
						{ key: "layer", value: "CHARACTER" },
						{ key: ["metadata", `${Util.ID}/metadata`], value: undefined },
					],
				},
			},
			{
				icon: "/remove.svg",
				label: "Remove from Initiative",
				filter: {
					every: [{ key: "layer", value: "CHARACTER" }],
				},
			},
		],
		onClick(context) {
			const addToInitiative = context.items.every(
				(item) => item.metadata[`${Util.ID}/metadata`] === undefined
			);
			if (addToInitiative) {
				OBR.scene.items.updateItems(context.items, (items) => {
					for (let item of items) {
						const player = Deck.getInstance().addPlayer(item.name)
						item.metadata[`${Util.ID}/metadata`] = {
							playerid: player.id,
							playername: player.name,
						};
					}
					Deck.getInstance().render()
				});
			} else {
				OBR.scene.items.updateItems(context.items, (items) => {
					let flgrender = false
					for (let item of items) {
						let md = item.metadata[`${Util.ID}/metadata`] as InitiativeMetadata | undefined
						if (md) {
							let p = Deck.getInstance().getPlayer(md.playerid) as Player
							if (p) {
								p.removeRender()
								Deck.getInstance().removePlayer(p)
							}
							flgrender = true
						}
						delete item.metadata[`${Util.ID}/metadata`]
					}
					if (flgrender) Deck.getInstance().render()
				});
			}
		},
	});
}


export async function setupInitiativeList(): Promise<void> {
	function renderList(items: any[]): void {
	  Deck.getInstance().updateGameOBState(items)
	}
	OBR.scene.items.onChange(renderList)
  }