import OBR, { Image } from "@owlbear-rodeo/sdk";
import { PlayerMeta } from "./player";
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
		async onClick(context) {
			const deck = Deck.getInstance();
			const addToInitiative = context.items.every(item => item.metadata[Util.PlayerMkey] === undefined);

			if (addToInitiative) {
				await OBR.scene.items.updateItems(context.items, (items) => {
					items.forEach(item => {
						let img = item as Image
						let name = (img.text.plainText.length>0)?img.text.plainText:img.name
						const player = deck.addPlayer(name);
						if (player) {
							item.metadata[Util.PlayerMkey] = player.getMeta;
						}
					});
					deck.renderDeck();
				});
			} else {
				await OBR.scene.items.updateItems(context.items, (items) => {
					let shouldRender = false;
					items.forEach(item => {
						const playerMeta = item.metadata[Util.PlayerMkey] as PlayerMeta | undefined;
						if (playerMeta) {
							const player = deck.getPlayer(playerMeta.id);
							if (player) {
								player.removeRender();
								deck.removePlayer(player);
								shouldRender = true;
							}
							delete item.metadata[Util.PlayerMkey];
						}
					});
					if (shouldRender) deck.renderDeck();
				});
			}
		},
	});
}
