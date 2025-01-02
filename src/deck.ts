import OBR from "@owlbear-rodeo/sdk";

import { ButtonFactory } from "./button"
import { Card, Facing } from "./cards"
import { Game } from "./game"
import { Player } from "./player"

export class Deck {
	players: Player[]
	currentRound: number
	currentPlayer: string
	cards: Card[]
	discardPool: Card[]
	specialPool: Card[]
	use4jokers: boolean
	public scale: number

	constructor() {
		this.players = []
		this.currentRound = 0
		this.currentPlayer = ""
		this.cards = []
		this.discardPool = []
		this.specialPool = []
		this.use4jokers = false
		this.scale = 1

		this.initializeDeck()
		this.shuffle()
	}

	static rem2px(remstr: string): number {
		const rem = parseFloat(remstr)
		return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
	}

	getPlayer(pid: string | null): Player {
		return this.players.find(item => item.id === pid) as Player
	}

	newRound() {
		for (const p of this.players) {
			this.moveToDiscardPool(p.hand)
		}
	}

	newGame() {
		this.newRound()
		this.moveToDiscardPool(this.specialPool)
		this.returnCardsToDeck(this.discardPool)
		this.shuffle()
	}

	toggleJokers() {
		this.use4jokers = !this.use4jokers
		this.newGame()
		this.initializeDeck()
		this.shuffle()
	}

	initializeDeck() {
		if (this.cards.length > 0) {
			this.cards = []
		}
		const size = (this.use4jokers) ? 56 : 54
		for (let i = 1; i <= size; i++) {
			this.cards.push(new Card(i));
		}
	}

	setBack(n: number) {
		for (const c of this.drawnCards()) {
			c.setBack(n)
		}
	}

	drawnCards(): Card[] {
		let ret: Card[] = []
		ret = ret.concat(this.discardPool)
		ret = ret.concat(this.specialPool)
		for (const player of this.players) {
			ret = ret.concat(player.hand)
		}
		return ret
	}

	shuffle() {
		for (let i = this.cards.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
		}
	}

	cut(index: number) {
		const top = this.cards.slice(0, index);
		const bottom = this.cards.slice(index);
		this.cards = bottom.concat(top);
	}

	dealFromTop(hand: Card[], numCards: number, dir: Facing) {
		this.moveToPool(hand, this.cards, numCards, true, dir)
	}

	returnCardsToDeck(from: Card[], numCards: number = 0) {
		this.moveToPool(this.cards, from, numCards, true, Facing.Down)
	}

	moveToDiscardPool(from: Card[], numCards: number = 0) {
		this.moveToPool(this.discardPool, from, numCards, true, Facing.Up)
	}

	moveToSpecialPool(from: Card[], numCards: number = 0) {
		this.moveToPool(this.specialPool, from, numCards, true, Facing.Up)
	}

	moveToPool(to: Card[], from: Card[], numCards: number = 0, top: boolean, dir: Facing) {
		const limit = numCards < 1 ? from.length : Math.min(numCards, from.length)
		for (let i = 0; i < limit; i++) {
			let card = null
			if (top) {
				card = from.shift()!
			} else {
				card = from.pop()!
			}
			if (dir != Facing.None) card.dir = dir
			to.push(card)
		}
	}

	jokerDrawn(): boolean {
		return this.players.some(p => p.hasJoker()) || this.discardPool.some(c => c.isJoker()) || this.specialPool.some(c => c.isJoker())
	}

	render(container: HTMLDivElement) {
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
				Game.instance.drawInitiative()
				Game.instance.render()
			})
			deckdiv.appendChild(di)

			const dint = ButtonFactory.getButton("dint", "Deal Interlude", "suits", "")
			dint.addEventListener('click', () => {
				Game.instance.drawInterlude()
				Game.instance.render()
			})
			deckdiv.appendChild(dint)

			const shf = ButtonFactory.getButton("shf", "Shuffle", "stack", "")
			shf.addEventListener('click', () => {
				Game.instance.deck.newGame()
				Game.instance.render()
			})
			deckdiv.appendChild(shf)

			const joke = ButtonFactory.getButton("joke", "Use Four Jokers", "joker", "")
			if (this.use4jokers) joke.classList.add("btn-success")
			joke.addEventListener('click', function (event) {
				Game.instance.deck.toggleJokers()
				ButtonFactory.toggle(event)
				Game.instance.render()
			})
			deckdiv.appendChild(joke)
		}

		let deckleg = deckcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
		deckleg.textContent = `Draw Deck [${this.cards.length}]`

		while (deckcarddiv.firstChild) {
			deckcarddiv.removeChild(deckcarddiv.firstChild);
		}

		let x = 0
		for (const c of this.cards) {
			c.render(deckcarddiv, x, 0)
			x = x + Deck.rem2px(Card.cardStackedDown())
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
				Game.instance.discardAllHands()
				Game.instance.render()
			})
			discarddiv.appendChild(dp)
		}

		let discardleg = discardcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
		discardleg.textContent = `Discard Pile [${this.discardPool.length}]`

		while (discardcarddiv.firstChild) {
			discardcarddiv.removeChild(discardcarddiv.firstChild);
		}

		let x = 0
		for (const c of this.discardPool) {
			c.render(discardcarddiv, x, 0)
			x = x + Deck.rem2px(Card.cardStacked())
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
				this.moveToSpecialPool(this.cards, 1)
				Game.instance.render()
			})
			specialdiv.appendChild(cp)

			const discardpool = ButtonFactory.getButton("discardpool", "Discard Card Pool", "card-burn", "")
			discardpool.addEventListener('click', () => {
				this.moveToDiscardPool(this.specialPool, 0)
				Game.instance.render()
			})
			specialdiv.appendChild(discardpool)
		}

		let specialleg = specialcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
		specialleg.textContent = `Card Pool [${this.specialPool.length}]`

		while (specialcarddiv.firstChild) {
			specialcarddiv.removeChild(specialcarddiv.firstChild);
		}

		let x = 0
		for (const c of this.specialPool) {
			c.render(specialcarddiv, x, 0)
			x = x + Deck.rem2px(Card.cardStacked())
		}
	}

	renderPlayers(div: HTMLDivElement) {
		let y = 0
		let x = 0
		this.players.sort((a, b) => {
			const aa = (a.bestCard() === undefined) ? 0 : a.bestCard()?.sequence ?? 0
			const bb = (b.bestCard() === undefined) ? 0 : b.bestCard()?.sequence ?? 0
			return bb - aa
		})
		for (const p of this.players) {
			p.removeRender()
			p.render(div, x, y)
		}
	}

	setCurrentPlayer(pid: string) {
		this.currentPlayer = pid
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
