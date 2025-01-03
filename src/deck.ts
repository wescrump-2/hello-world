import OBR, { isImage, Item } from "@owlbear-rodeo/sdk"
import { Player } from "./player"
import { InitiativeItem, InitiativeMetadata } from "./contextmenu"
import { ButtonFactory } from "./button"
import { Card, Facing } from "./cards"
import { Util } from "./util"

// // Define types for clarity
// interface Metadata {
// 	[key: string]: any;
//   }

//   interface Item {
// 	id: string
// 	layer: string
// 	name: string
// 	createdUserId: string
// 	zIndex: number
// 	lastModified:string
// 	type: string
// 	visible: boolean
// 	locked: boolean
// 	metadata: {
// 	  [key: string]: Metadata
// 	};
// 	// Include other properties as needed
//   }


export interface DeckMetadata {
	drawdeck: number[]
	discardpile: number[]
	cardpool: number[]
}


export class Deck {
	private static instance: Deck
	private constructor() { }
	// graphic assets
	svgbuttons!: HTMLObjectElement
	svgcontainer!: HTMLDivElement

	// cards: Card[]=[]
	// discardPool: Card[]=[]
	// specialPool: Card[]=[]
	players: Player[] = []

	//game state
	drawdeck: number[] = []
	discardpile: number[] = []
	cardpool: number[] = []
	playerorder: number[] = []
	currentRound: number = 0
	currentPlayer: number = -1
	use4jokers: boolean = false
	scale: number = 1

	public static getInstance(): Deck {
		if (!Deck.instance) {
			Deck.instance = new Deck();
			Deck.instance.svgbuttons = document.getElementById('buttons-svg') as HTMLObjectElement
			Deck.instance.svgcontainer = document.getElementById('svgContainer') as HTMLDivElement
			Deck.instance.initializeDeck()
			Deck.instance.shuffle()
		}
		return Deck.instance;
	}

	startGame() {
		this.newGame()
		this.testPlayers()
	}

	newGame() {
		this.newRound()
		this.moveToDiscardPool(this.cardpool)
		this.returnCardsToDeck(this.discardpile)
		this.shuffle()
	}
	private testPlayers() {
		const testplayers: string[] = []
		for (const pn of testplayers) {
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
		for (const p of this.players) {
			p.drawInitiative()
		}
	}

	drawInterlude() {
		for (const p of this.players) {
			p.drawInterlude()
		}
	}

	discardAllHands() {
		for (const p of this.players) {
			p.discardHand()
		}
	}

	getPlayer(pid: string | null): Player {
		return this.players.find(item => item.id === pid) as Player
	}

	newRound() {
		for (const p of this.players) {
			this.moveToDiscardPool(p.hand)
		}
	}



	toggleJokers() {
		this.use4jokers = !this.use4jokers
		this.newGame()
		this.initializeDeck()
		this.shuffle()
	}

	initializeDeck() {
		Card.cards.length
		if (this.drawdeck.length > 0) {
			this.drawdeck = []
		}
		const size = (this.use4jokers) ? 56 : 54
		for (let i = 1; i <= size; i++) {
			this.drawdeck.push(i);  //new Card(i)
		}
	}

	setBack(n: number) {
		this.shuffle()
		for (const c of Card.cards) {
			c.setBack(n)
		}
	}

	drawnCards(): number[] {
		let ret: number[] = []
		ret = ret.concat(this.discardpile)
		ret = ret.concat(this.cardpool)
		for (const p of this.players) {
			ret = ret.concat(p.hand)
		}
		return ret
	}

	shuffle() {
		for (let i = this.drawdeck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.drawdeck[i], this.drawdeck[j]] = [this.drawdeck[j], this.drawdeck[i]];
		}
	}

	cut(index: number) {
		const top = this.drawdeck.slice(0, index);
		const bottom = this.drawdeck.slice(index);
		this.drawdeck = bottom.concat(top);
	}

	dealFromTop(hand: number[], numCards: number, dir: Facing) {
		this.moveToPool(hand, this.drawdeck, numCards, true, dir)
	}

	returnCardsToDeck(from: number[], numCards: number = 0) {
		this.moveToPool(this.drawdeck, from, numCards, true, Facing.Down)
	}

	moveToDiscardPool(from: number[], numCards: number = 0) {
		this.moveToPool(this.discardpile, from, numCards, true, Facing.Up)
	}

	moveToSpecialPool(from: number[], numCards: number = 0) {
		this.moveToPool(this.cardpool, from, numCards, true, Facing.Up)
	}

	moveToPool(to: number[], from: number[], numCards: number = 0, top: boolean, dir: Facing) {
		const limit = numCards < 1 ? from.length : Math.min(numCards, from.length)
		for (let i = 0; i < limit; i++) {
			let cid = 0
			if (top) {
				cid = from.shift()!
			} else {
				cid = from.pop()!
			}
			let card = Card.byId(cid)
			if (dir != Facing.None) {
				card.dir = dir
			}
			to.push(cid)
		}
	}

	jokerDrawn(): boolean {
		return this.players.some(p => p.hasJoker()) || this.discardpile.some(c => Card.isJoker(c)) || this.cardpool.some(c => Card.isJoker(c))
	}

	addPlayer(name: string): Player {
		const p = new Player(name)
		this.players.push(p);
		return p
	}

	removePlayer(player: Player) {
		const index = this.players.findIndex(p => p.id === player.id);
		if (index !== -1) {
			const p = this.players[index]
			this.moveToDiscardPool(p.hand)
			this.players.splice(index, 1)
			this.removePlayerMetadata(p)
		}
	}

	async removePlayerMetadata(p: Player) {
		const metakey = `${Util.ID}/metadata`
		try {
			// Update the item with the given characterId
			await OBR.scene.items.updateItems(
				(item) => 
				  item.layer === "CHARACTER" &&
				  isImage(item) &&
				  item.metadata[metakey] !=undefined,
				(characters) => {
				  for (let character of characters) {
					let pmd =character.metadata[metakey] as InitiativeMetadata
					if (pmd.playerid === p.id){
						delete character.metadata[metakey]
					}
				  }
				}
			  );
				} catch (error) {
					console.error("Failed to remove metadata from character:", error);
				}
		}


	render() {
			this.renderDeck(this.svgcontainer)
			this.renderPlayers(this.svgcontainer)
			this.setCurrentPlayer(this.players[0]?.id) //fixme
		}

	async getCharacterItems() {
			let r: any[] = []
			try {
				const characters = await OBR.scene.items.getItems((item) => {
					return item.layer === "CHARACTER" && isImage(item);
				});
				return characters
			} catch (error) {
				console.error("Failed to get character items:", error);
			}
			return r
		}

		updateGameOBState(items: any[]) {
			let flgrender = false
			const initiativeItems: InitiativeItem[] = [];
			for (const item of items) {
				if (item.layer === "CHARACTER" && isImage(item)) {
					const metadata: InitiativeMetadata = item.metadata[`${Util.ID}/metadata`] as InitiativeMetadata
					if (metadata) {
						let inititem = this.rehydratePlayer(metadata)
						initiativeItems.push(inititem);
						flgrender = true
					}
				}
			}

			const result = this.players.filter(p => !initiativeItems.find(item => p.id === item.playerid));
			for (const p of result) {
				p.removeRender()
				this.removePlayer(p)
				flgrender = true
			}

			if (flgrender) {
				this.render()
			}
		}

		rehydratePlayer(metadata: InitiativeMetadata): InitiativeItem {
			let p = this.getPlayer(metadata.playerid)
			if (!p) {
				// if not, create them, give name and unique id from metadata
				p = this.addPlayer(metadata.playername)
				p.id = metadata.playerid
			}
			const c = p.bestCard()
			let cn = "No cards"
			let seq = 0
			if (c) {
				cn = Card.byId(c).toString()
				seq = c
			}
			return {
				playerid: p.id,
				playername: p.name,
				cardname: cn,
				sequence: seq,
			}
		}

		renderDeck(container: HTMLDivElement) {
			//this.renderJoker(container)
			this.renderDraw(container)
			this.renderDiscardPile(container)
			this.renderCardPool(container)
			if (this.jokerDrawn()) {
				this.showNotification('Joker Drawn Reshuffle and issue Bennies.', "WARNING")
			}

		}

		renderJoker(container: HTMLDivElement) {
			const doc = container.ownerDocument
			let jokediv = doc.getElementById('JokerMsg');
			if (!jokediv) {
				jokediv = doc.createElement('div')
				jokediv.id = 'JokerMsg'
				jokediv.classList.add('alert-danger')
				const joke = doc.createElement('label')
				joke.textContent = 'Joker Drawn Reshuffle and issue Bennies.'
				jokediv.appendChild(joke)
				container.appendChild(jokediv);
			}
			if (this.jokerDrawn()) {
				jokediv.style.display = "block"
			} else {
				jokediv.style.display = "none"
			}
		}

		renderDraw(container: HTMLDivElement) {
			const doc = container.ownerDocument
			let deckcarddiv = doc.getElementById('drawdeckcards') as HTMLDivElement
			if (!deckcarddiv) {
				const deckfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
				const deckleg = doc.createElement('legend') as HTMLLegendElement
				deckfieldset.appendChild(deckleg)
				deckfieldset.classList.add('flex-container')
				deckfieldset.id = "Draw"
				const deckdiv = doc.createElement('div') as HTMLDivElement
				deckdiv.classList.add('flex-item-3')
				deckdiv.classList.add(Card.relcard[0])
				deckcarddiv = doc.createElement('div') as HTMLDivElement
				deckcarddiv.classList.add('flex-item-2')
				deckcarddiv.classList.add(...Card.relcard)
				deckcarddiv.id = "drawdeckcards"
				deckfieldset.appendChild(deckdiv)
				deckfieldset.appendChild(deckcarddiv)
				container.appendChild(deckfieldset)

				const di = ButtonFactory.getButton("di", "Deal Initiative", "card-draw", "")
				di.addEventListener('click', () => {
					this.drawInitiative()
					this.render()
				})
				deckdiv.appendChild(di)

				const dint = ButtonFactory.getButton("dint", "Deal Interlude", "suits", "")
				dint.addEventListener('click', () => {
					this.drawInterlude()
					this.render()
				})
				deckdiv.appendChild(dint)

				const shf = ButtonFactory.getButton("shf", "Shuffle", "stack", "")
				shf.addEventListener('click', () => {
					this.newGame()
					this.render()
				})
				deckdiv.appendChild(shf)

				const joke = ButtonFactory.getButton("joke", "Use Four Jokers", "joker", "")
				if (this.use4jokers) joke.classList.add("btn-success")
				joke.addEventListener('click', function (event) {
					Deck.getInstance().toggleJokers()
					ButtonFactory.toggle(event)
					Deck.getInstance().render()
				})
				deckdiv.appendChild(joke)
			}

			let deckleg = deckcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
			deckleg.textContent = `Draw Deck [${this.drawdeck.length}]`

			while (deckcarddiv.firstChild) {
				deckcarddiv.removeChild(deckcarddiv.firstChild);
			}

			let x = 0
			for (const c of this.drawdeck) {
				let card = Card.byId(c)
				card.render(deckcarddiv, x, 0)
				x = x + Util.rem2px(Card.cardStackedDown())
			}
		}

		renderDiscardPile(container: HTMLDivElement) {
			const doc = container.ownerDocument
			let discardcarddiv = doc.getElementById("discardpilecards") as HTMLDivElement
			if (!discardcarddiv) {
				const discardfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
				const discardleg = doc.createElement('legend') as HTMLLegendElement
				discardfieldset.appendChild(discardleg)
				discardfieldset.classList.add("flex-container")
				discardfieldset.id = "Discard"
				discardfieldset.title = "Discard Pile"
				const discarddiv = doc.createElement('div') as HTMLDivElement
				discarddiv.classList.add("flex-item-3")
				discarddiv.classList.add(Card.relcard[0])
				discardcarddiv = doc.createElement('div') as HTMLDivElement
				discardcarddiv.id = "discardpilecards"
				discardcarddiv.classList.add("flex-item-2")
				discardcarddiv.classList.add(...Card.relcard)
				discardfieldset.appendChild(discarddiv)
				discardfieldset.appendChild(discardcarddiv)
				container.appendChild(discardfieldset)

				const dp = ButtonFactory.getButton("dp", "Discard All Hands", "card-burn", "")
				dp.addEventListener('click', () => {
					Deck.getInstance().discardAllHands()
					Deck.getInstance().render()
				})
				discarddiv.appendChild(dp)
			}

			let discardleg = discardcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
			discardleg.textContent = `Discard Pile [${this.discardpile.length}]`

			while (discardcarddiv.firstChild) {
				discardcarddiv.removeChild(discardcarddiv.firstChild);
			}

			let x = 0
			for (const c of this.discardpile) {
				let card = Card.byId(c)
				card.render(discardcarddiv, x, 0)
				x = x + Util.rem2px(Card.cardStacked())
			}

		}

		renderCardPool(container: HTMLDivElement) {
			const doc = container.ownerDocument
			let specialcarddiv = doc.getElementById("cardpoolcards") as HTMLDivElement
			if (!specialcarddiv) {
				const specialfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
				const specialleg = doc.createElement('legend') as HTMLLegendElement
				specialfieldset.appendChild(specialleg)
				specialfieldset.classList.add("flex-container")
				specialfieldset.id = "Pool"
				specialfieldset.title = "Card Pool"
				const specialdiv = doc.createElement('div') as HTMLDivElement
				specialdiv.classList.add("flex-item-3")
				specialdiv.classList.add(...Card.relcard)
				specialcarddiv = doc.createElement('div') as HTMLDivElement
				specialcarddiv.id = "cardpoolcards"
				specialcarddiv.classList.add("flex-item-2")
				specialcarddiv.classList.add(...Card.relcard)
				specialfieldset.appendChild(specialdiv)
				specialfieldset.appendChild(specialcarddiv)
				container.appendChild(specialfieldset)
				const cp = ButtonFactory.getButton("cp", "Draw a Card", "card-pickup", "")
				cp.addEventListener('click', () => {
					this.moveToSpecialPool(this.drawdeck, 1)
					this.render()
				})
				specialdiv.appendChild(cp)

				const discardpool = ButtonFactory.getButton("discardpool", "Discard Card Pool", "card-burn", "")
				discardpool.addEventListener('click', () => {
					this.moveToDiscardPool(this.cardpool, 0)
					Deck.getInstance().render()
				})
				specialdiv.appendChild(discardpool)
			}

			let specialleg = specialcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
			specialleg.textContent = `Card Pool [${this.cardpool.length}]`

			while (specialcarddiv.firstChild) {
				specialcarddiv.removeChild(specialcarddiv.firstChild);
			}

			let x = 0
			for (const c of this.cardpool) {
				let card = Card.byId(c)
				card.render(specialcarddiv, x, 0)
				x = x + Util.rem2px(Card.cardStacked())
			}
		}

		renderPlayers(div: HTMLDivElement) {
			let y = 0
			let x = 0
			this.players.sort((a, b) => {
				const aa = (a.bestCard() === undefined) ? 0 : a.bestCard() ?? 0
				const bb = (b.bestCard() === undefined) ? 0 : b.bestCard() ?? 0
				return bb - aa
			})
			for (const p of this.players) {
				p.removeRender()
				p.render(div, x, y)
			}
		}

		setCurrentPlayer(pid: string) {
			this.currentPlayer = 0 //pid
			for (let fs of document.querySelectorAll('fieldset[data-pid]')) {
				if (fs.getAttribute('data-pid') === pid) {
					fs.classList.add("nextplayer")
				} else {
					fs.classList.remove("nextplayer")
				}
			}
		}

	async showNotification(message: string, level: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING" = "DEFAULT") {
			try {
				await OBR.notification.show(message, level)
			} catch (error) {
				console.error('Failed to show notification:', error)
			}
		}
	}
