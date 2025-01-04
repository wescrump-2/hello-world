import OBR from "@owlbear-rodeo/sdk"
import { Player } from "./player"
import { ButtonFactory } from "./button"
import { Card, Facing } from "./cards"
import { Util } from "./util"

export interface DeckMeta {
	drawdeck: number[]
	discardpile: number[]
	cardpool: number[]
	currentRound: number
	currentPlayer: number
	back: number
	use4jokers: boolean
	scale: number
}

export class Deck {
	private static instance: Deck
	isGM: boolean = false
	private constructor() { }
	// graphic assets
	svgbuttons!: HTMLObjectElement
	svgcontainer!: HTMLDivElement
	jokerNotified: number = 0
	players: Player[] = []

	//game state
	private meta: DeckMeta = {
		back: 0,
		cardpool: [],
		currentPlayer: -1,
		currentRound: 0,
		discardpile: [],
		drawdeck: [],
		scale: 1,
		use4jokers: false,
	}

	get getMeta(): DeckMeta { return this.meta }
	set setMeta(newMeta: DeckMeta) { this.meta = newMeta }

	get back(): number { return this.meta.back }
	set back(n: number) { this.meta.back = n }
	get cardpool(): number[] { return this.meta.cardpool }
	set cardpool(cp: number[]) { this.meta.cardpool = cp }
	get currentPlayer(): number { return this.meta.currentPlayer }
	set currentPlayer(cp: number) { this.meta.currentPlayer = cp }
	get currentRound(): number { return this.meta.currentRound }
	set currentRound(cr: number) { this.meta.currentRound = cr }
	get discardpile(): number[] { return this.meta.discardpile }
	set discardpile(dp: number[]) { this.meta.discardpile = dp }
	get drawdeck(): number[] { return this.meta.drawdeck }
	set drawdeck(dd: number[]) { this.meta.drawdeck = dd }
	get scale(): number { return this.meta.scale }
	set scale(s: number) { this.meta.scale = s }
	get use4jokers(): boolean { return this.meta.use4jokers }
	set use4jokers(uj: boolean) { this.meta.use4jokers = uj }
	get backsvg(): SVGElement {
		return Card.backs[this.back]
	}

	getImageSvg(c: Card): string {
		let img = c.face.innerHTML
		if (c.dir != Facing.Up) {
			img = this.backsvg.innerHTML
		}
		return img
	}
	public static getInstance(): Deck {
		if (!Deck.instance) {
			Deck.instance = new Deck();
			Deck.instance.svgbuttons = document.getElementById('buttons-svg') as HTMLObjectElement
			Deck.instance.svgcontainer = document.getElementById('svgContainer') as HTMLDivElement
			Deck.instance.shuffle()
		}
		return Deck.instance;
	}

	newGame() {
		this.newRound()
		this.moveToDiscardPool(this.cardpool)
		this.returnCardsToDeck(this.discardpile)
		this.shuffle()
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
		this.shuffle()
	}

	initializeDeck() {
		const size = (this.use4jokers) ? 56 : 54
		this.jokerNotified = 0
		this.drawdeck = []
		this.discardpile = []
		this.cardpool = []
		for (let i = 1; i <= size; i++) {
			this.drawdeck.push(i);  //new Card(i)
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
		this.initializeDeck()
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
		if (limit > 0) {
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
				if (cid != 0 && !to.includes(cid)) {
					to.push(cid)
				} else {
					console.log(`found duplicate card [${cid}]${card.toString}`)
				}
			}
		 } else {
		 	console.log(`from array is empty, no move.`)
		 }
	}

	extractPlayerCards(p: Player) {
		const removeSet = new Set(p.hand)
		this.drawdeck = this.drawdeck.filter(item => !removeSet.has(item))
		this.discardpile = this.discardpile.filter(item => !removeSet.has(item))
		this.cardpool = this.cardpool.filter(item => !removeSet.has(item))
	}

	jokersDrawn(): number {
		return this.players.filter(p => p.hasJoker()).length + this.discardpile.filter(c => Card.isJoker(c)).length + this.cardpool.filter(c => Card.isJoker(c)).length
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
			p.removeOBR()
		}
	}

	renderDeck() {
		this.renderDraw(this.svgcontainer)
		if (this.isGM) {
			this.renderDiscardPile(this.svgcontainer)
			this.renderCardPool(this.svgcontainer)
		}
		this.renderPlayers(this.svgcontainer)
		this.setCurrentPlayer(this.players[0]?.id) //fixme
		const drawn = this.jokersDrawn()	
		if (drawn>this.jokerNotified ) {
			this.showNotification('Joker Drawn Reshuffle and issue Bennies.', "WARNING")
			this.jokerNotified = drawn
		}
		//this.updateOBR()
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

			if (this.isGM) {
				const di = ButtonFactory.getButton("di", "Deal Initiative", "card-draw", "")
				di.addEventListener('click', () => {
					this.drawInitiative()
					this.updateOBR()
					this.renderDeck()
				})
				deckdiv.appendChild(di)

				const dint = ButtonFactory.getButton("dint", "Deal Interlude", "suits", "")
				dint.addEventListener('click', () => {
					this.drawInterlude()
					this.updateOBR()
					this.renderDeck()
				})
				deckdiv.appendChild(dint)

				const joke = ButtonFactory.getButton("joke", "Use Four Jokers", "joker", "")
				if (this.use4jokers) joke.classList.add("btn-success")
				joke.addEventListener('click', function (event) {
					const deck = Deck.getInstance()
					deck.toggleJokers()
					ButtonFactory.toggle(event)
					deck.updateOBR()
					deck.renderDeck()
				})
				deckdiv.appendChild(joke)

				const sb = ButtonFactory.getButton("sb", "Change Backs", "card-exchange", "")
				sb.addEventListener('click',  () =>{
					const deck = Deck.getInstance()
					deck.changeBack()
					deck.updateOBR()
					deck.renderDeck()
				})
				deckdiv.appendChild(sb)
			}
		}

		let deckleg = deckcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
		deckleg.textContent = `Draw Deck [${this.drawdeck.length}]`

		while (deckcarddiv.firstChild) {
			deckcarddiv.removeChild(deckcarddiv.firstChild);
		}

		let x = 0
		for (const c of this.drawdeck) {
			let card = Card.byId(c)
			card.render(deckcarddiv, x, 0, Facing.Down)
			x = x + Util.rem2px(Card.cardStackedDown())
		}
	}
	changeBack() {
		this.back= (++this.back>=Card.backs.length)?0:this.back
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
				this.discardAllHands()
				this.updateOBR()
				this.renderDeck()
			})
			discarddiv.appendChild(dp)
			const shf = ButtonFactory.getButton("shf", "Shuffle", "stack", "")
			shf.addEventListener('click', () => {
				this.newGame()
				this.updateOBR()
				this.renderDeck()
			})
			discarddiv.appendChild(shf)
		}

		let discardleg = discardcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
		discardleg.textContent = `Discard Pile [${this.discardpile.length}]`

		while (discardcarddiv.firstChild) {
			discardcarddiv.removeChild(discardcarddiv.firstChild);
		}

		let x = 0
		for (const c of this.discardpile) {
			let card = Card.byId(c)
			card.render(discardcarddiv, x, 0, Facing.Up)
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
				this.updateOBR()
				this.renderDeck()
			})
			specialdiv.appendChild(cp)

			const dcp = ButtonFactory.getButton("dcp", "Discard Card Pool", "card-burn", "")
			dcp.addEventListener('click', () => {
				this.moveToDiscardPool(this.cardpool, 0)
				this.updateOBR()
				this.renderDeck()
			})
			specialdiv.appendChild(dcp)
		}

		let specialleg = specialcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
		specialleg.textContent = `Card Pool [${this.cardpool.length}]`

		while (specialcarddiv.firstChild) {
			specialcarddiv.removeChild(specialcarddiv.firstChild);
		}

		let x = 0
		for (const c of this.cardpool) {
			let card = Card.byId(c)
			card.render(specialcarddiv, x, 0, Facing.Up)
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

	showNotification(message: string, level: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING" = "DEFAULT") {
		try {
			OBR.notification.show(message, level)
		} catch (error) {
			console.error('Failed to show notification:', error)
		}
	}

	async updateState(dmd: DeckMeta) {
		if (dmd) {
			this.setMeta = dmd
		} else {
			console.log("No metadata found for this extension in the room.");
			this.newGame()
			this.updateOBR()
		}
	}

	updateOBR() {
		const dmd = this.getMeta
		OBR.room.setMetadata({
			[Util.DeckMkey]: dmd
		})
		for (let p of this.players) {
			p.updateOBR()
		}
	}
}
