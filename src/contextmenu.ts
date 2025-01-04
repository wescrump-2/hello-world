import OBR from "@owlbear-rodeo/sdk";
import { Player, PlayerMeta } from "./player";
import { Util } from "./util";
import { Deck } from "./deck";

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
						{ key: ["metadata", Util.PlayerMkey], value: undefined },
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
				(item) => item.metadata[Util.PlayerMkey] === undefined
			);
			if (addToInitiative) {
				OBR.scene.items.updateItems(context.items, (items) => {
					for (let item of items) {
						const player = Deck.getInstance().addPlayer(item.name)
						item.metadata[Util.PlayerMkey] = player.getMeta
					}
					Deck.getInstance().renderDeck()
				});
			} else {
				OBR.scene.items.updateItems(context.items, (items) => {
					let flgrender = false
					for (let item of items) {
						let md = item.metadata[Util.PlayerMkey] as PlayerMeta | undefined
						if (md) {
							let p = Deck.getInstance().getPlayer(md.id) as Player
							if (p) {
								p.removeRender()
								Deck.getInstance().removePlayer(p)
							}
							flgrender = true
						}
						delete item.metadata[Util.PlayerMkey]
					}
					if (flgrender) Deck.getInstance().renderDeck()
				});
			}
		},
	});
}