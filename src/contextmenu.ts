// contextmenu.ts
import OBR from "@owlbear-rodeo/sdk";
import { Deck } from "./deck";
import { Util } from "./util";
import { PlayerMeta } from "./player";

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
					every: [
					{ key: "layer", value: "CHARACTER" },
				],
				},
			},
		],
		async onClick(context, _elementId) {
			const deck = Deck.getInstance();
			let playerId = '';
			let playerName = '';
			
			try {
				playerId = await OBR.player.getId();
				playerName = await OBR.player.getName();
			} catch (error) {
				console.error("Failed to get player info:", error);
				return;
			}

			const itemsToAdd = context.items.filter(
				(item) => item.metadata[Util.PlayerMkey] === undefined
			);
			const itemsToRemove = context.items.filter(
				(item) => item.metadata[Util.PlayerMkey] !== undefined
			);

			// ─── ADD TO INITIATIVE ───
			if (itemsToAdd.length > 0) {
				try {
					await OBR.scene.items.updateItems(itemsToAdd, (items) => {
						for (const item of items) {
							const displayName = (item as any).text?.plainText?.trim() || item.name?.trim() || "Nameless Hero";

							const player = deck.addPlayer(
								`${displayName} (${playerName})`,
								//item.id,
								Util.shortId(), //this gives a unique id for charactar hand id.
								playerId
							);

							item.metadata[Util.PlayerMkey] = player.Meta;
						}
					});
					deck.renderDeckAsync();
				} catch (error) {
					console.error("Failed to add items to initiative:", error);
				}
			}

			// ─── REMOVE FROM INITIATIVE ───
			if (itemsToRemove.length > 0) {
				// First, delete metadata from tokens to prevent scene item change events
				try {
					await OBR.scene.items.updateItems(itemsToRemove, (items) => {
						for (const item of items) {
							item.metadata[Util.PlayerMkey] = undefined;
						}
					});
				} catch (error) {
					console.error("Failed to remove items from initiative:", error);
				}

				// Then, clean up local players (moves cards to discard, removes from Map)
				for (const item of itemsToRemove) {
					const meta = item.metadata[Util.PlayerMkey] as PlayerMeta | undefined;
					if (meta) {
						const player = deck.getPlayerById(meta.characterId);
						if (player) {
							deck.removePlayer(player); // sync, moves cards + deletes from Map
						}
					}
				}

				deck.renderDeckAsync();
			}
		},
	});
}
