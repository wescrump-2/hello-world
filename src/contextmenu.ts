import OBR from "@owlbear-rodeo/sdk";
import { Game } from "./game";
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
				//let initiative = window.prompt("Enter the initiative value");
				OBR.scene.items.updateItems(context.items, (items) => {
					for (let item of items) {
						const player = Game.instance.addPlayer(item.name)
						let initiative= player.id
						let playername= player.name
						item.metadata[`${ID}/metadata`] = {
							initiative,
							playername,
						};
					}
					Game.instance.render()
				});
			} else {
				OBR.scene.items.updateItems(context.items, (items) => {
					for (let item of items) {
						delete item.metadata[`${ID}/metadata`]
					}
				});
			}
		},
	});
}
