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
				try {
					const pid = await OBR.player.getId();
					try {
						const pname = await OBR.player.getName();
						try {
							await OBR.scene.items.updateItems(context.items, (items) => {
								items.forEach(item => {
									let img = item as Image
									let name = `${(img.text.plainText.length > 0) ? img.text.plainText : img.name}(${pname})`
									const player = deck.addPlayer(name, item.id, pid)
									if (player) {
										item.metadata[Util.PlayerMkey] = player.getMeta;
										player.updateOBR() //updates token
										deck.updateOBR() //updates deck
										//console.log(`added player ${player.id}`)
									}
									
								});
							})
						} catch (error) {
							console.warn(`getId:`, error)
						}
					} catch (error) {
						console.warn(`getName:`, error)
					}
				} catch (error) {
					console.error(`addToInitiative:`, error)
				}
			} else {
				try {
					await OBR.scene.items.updateItems(context.items, (items) => {
						try {
							items.forEach(item => {
								const playerMeta = item.metadata[Util.PlayerMkey] as PlayerMeta | undefined;
								if (playerMeta) {
									const player = deck.getPlayerById(playerMeta.id);
									if (player) {
										deck.removePlayer(player);
										deck.updateOBR()
										//console.log(`deleted player ${player.id}`)
									}
									delete item.metadata[Util.PlayerMkey];
									deck.renderDeck()
								}
							})
						} catch(error){
							console.error(`removeInitiative:`, error)
						}
					})
				} catch (error) {
					console.error(`removeInitiative:`, error)
				}
			}
		}
	})
}
