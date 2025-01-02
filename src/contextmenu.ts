import OBR from "@owlbear-rodeo/sdk";
import { Game } from "./game";
import { Player } from "./player";
import { InitiativeMetadata } from "./initiativelist";
const ID = "com.wescrump.initiative-tracker";

export function setupContextMenu() {
	OBR.contextMenu.create({
		id: `${ID}/context-menu`,
		icons: [
			{
				icon: "/add.svg",
				label: "Add to Initiative",
				filter: {
					every: [
						{ key: "layer", value: "CHARACTER" },
						{ key: ["metadata", `${ID}/metadata`], value: undefined },
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
				(item) => item.metadata[`${ID}/metadata`] === undefined
			);
			if (addToInitiative) {
				OBR.scene.items.updateItems(context.items, (items) => {
					for (let item of items) {
						const player = Game.instance.addPlayer(item.name)
						item.metadata[`${ID}/metadata`] = {
							playerid: player.id,
							playername: player.name,
						};
					}
					Game.instance.render()
				});
			} else {
				OBR.scene.items.updateItems(context.items, (items) => {
					let flgrender = false
					for (let item of items) {
						let md = item.metadata[`${ID}/metadata`] as InitiativeMetadata | undefined
						if (md) {
							let p = Game.instance.deck.getPlayer(md.playerid) as Player
							if (p) {
								p.removeRender()
								Game.instance.removePlayer(p)
							}
							flgrender = true
						}
						delete item.metadata[`${ID}/metadata`]
					}
					if (flgrender) Game.instance.render()
				});
			}
		},
	});
}
