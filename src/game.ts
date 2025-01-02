import OBR, { isImage } from "@owlbear-rodeo/sdk"
import { Deck } from "./deck"
import { Player } from "./player"
import { InitiativeMetadata } from "./initiativelist"

// Game class
export class Game {

	static instance: Game
	deck: Deck
	div: HTMLDivElement
	static ID = "com.wescrump.initiative-tracker"

	constructor(container: HTMLDivElement) {
		this.deck = new Deck()
		this.div = container
		Game.instance = this
	}

	addPlayer(name: string): Player {
		const p = new Player(name)
		this.deck.players.push(p);
		return p
	}

	removePlayer(player: Player) {
		const index = this.deck.players.findIndex(p => p.id === player.id);
		if (index !== -1) {
			const p = this.deck.players[index]
			this.deck.moveToDiscardPool(p.hand)
			this.deck.players.splice(index, 1)
			this.removePlayerMetadata(p)
		}
	}

	async removePlayerMetadata(p: Player) {
		let flgexisting = false
		const characters = await OBR.scene.items.getItems((item) => item.layer === "CHARACTER" && isImage(item))
		for (const item of characters) {
		  const charmeta: InitiativeMetadata = item.metadata[`${Game.ID}/metadata`] as InitiativeMetadata
		  if (charmeta) {
			if (p.id===charmeta.playerid) {
				delete item.metadata[`${Game.ID}/metadata`]
			flgexisting=true
			}
		  }
		}
		if (flgexisting) Game.instance.render()
	}
	render() {
		this.deck.render(this.div)
		this.deck.renderPlayers(this.div)
		this.deck.setCurrentPlayer(this.deck.players[0]?.id)	
	}

	testplayers: string[] = []
	startGame() {
		this.deck.newGame()
		this.deck.shuffle();
		for (const pn of this.testplayers) {
			let p = this.addPlayer(pn)
			let pnl = pn.toLowerCase()
			p.hesitant = pnl.indexOf("h") >= 0
			p.impLevelHeaded = pnl.indexOf("il") >= 0
			p.levelHeaded = pnl.indexOf("lh") >= 0
			p.onHold = pnl.indexOf("oh") >= 0
			p.outOfCombat = pnl.indexOf("oc") >= 0
			p.quick = pnl.indexOf("q") >= 0
		}
	}

	drawInitiative() {
		for (const p of this.deck.players) {
			p.drawInitiative()
		}
	}

	drawInterlude() {
		for (const p of this.deck.players) {
			p.drawInterlude()
		}
	}

	discardAllHands() {
		for (const p of this.deck.players) {
			p.discardHand()
		}
	}
	static shortUUID(): string {
		const uuid = crypto.randomUUID()
		const cleanUUID = uuid.replace(/-/g, '');
		const byteArray = new Uint8Array(cleanUUID.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
		const base64UUID = btoa(String.fromCharCode(...byteArray));
		return base64UUID.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
	}

	static expandUUID(shortUUID: string): string {
		let paddedUUID = shortUUID + '=='.slice(0, (4 - shortUUID.length % 4) % 4);
		const byteString = atob(paddedUUID.replace(/-/g, '+').replace(/_/g, '/'));
		const byteArray = new Uint8Array(byteString.length);
		for (let i = 0; i < byteString.length; i++) {
			byteArray[i] = byteString.charCodeAt(i);
		}
		const hexUUID = Array.from(byteArray, byte => byte.toString(16).padStart(2, '0')).join('');
		return `${hexUUID.slice(0, 8)}-${hexUUID.slice(8, 12)}-${hexUUID.slice(12, 16)}-${hexUUID.slice(16, 20)}-${hexUUID.slice(20)}`;
	}
}

