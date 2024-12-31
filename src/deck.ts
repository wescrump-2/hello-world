import { ButtonFactory } from "./button"
import { Card, Facing } from "./cards"
import { Game } from "./game"
import { Player } from "./player"

export class Deck {
	players: Player[]
	cards: Card[]
	discardPool: Card[]
	specialPool: Card[]
	use4jokers: boolean
	public scale: number

	constructor() {
		this.players = []
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
		const limit = numCards === 0 ? from.length : Math.min(numCards, from.length)
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

	removeRender(container: HTMLDivElement) {
		for (let str of ["Draw", "Discard", "Pool"]) {
			const rem = container.querySelector(`fieldset[id="${str}"]`);
			if (rem) {
				rem.remove();
			}
		}
	}

	render(container: HTMLDivElement) {
		let x = 0
		let y = 0
		const doc = container.ownerDocument
		const deckfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
		const deckleg = doc.createElement('legend') as HTMLLegendElement
		deckleg.textContent = `Draw Deck [${this.cards.length}]`
		deckfieldset.appendChild(deckleg)
		deckfieldset.classList.add('flex-container')
		deckfieldset.id = "Draw"
		const deckdiv = doc.createElement('div') as HTMLDivElement
		deckdiv.classList.add('flex-item-3')
		deckdiv.classList.add(Card.relcard[0])
		const deckcarddiv = doc.createElement('div') as HTMLDivElement
		deckcarddiv.classList.add('flex-item-2')
		deckcarddiv.classList.add(...Card.relcard)
		deckfieldset.appendChild(deckdiv)
		deckfieldset.appendChild(deckcarddiv)
		container.appendChild(deckfieldset)

		for (const c of this.cards) {
			c.render(deckcarddiv, x, y)
			x = x + Deck.rem2px(Card.cardStackedDown())
		}
		const di = ButtonFactory.getButton("di", "Deal Initiative", "card-draw", "")
		di.addEventListener('click', () => {
			Game.instance.drawInitiative()
			Game.instance.render()
		})
		deckdiv.appendChild(di)

		const dint = ButtonFactory.getButton("dint", "Deal Interlude", "card-pick", "")
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
		joke.addEventListener('click', function (event) {
			Game.instance.deck.toggleJokers()
			ButtonFactory.toggle(event)
			Game.instance.render()
		})
		deckdiv.appendChild(joke)

		if (this.jokerDrawn()) {
			const jokediv = doc.createElement('div')
			jokediv.classList.add('alert-danger')
			const joke = doc.createElement('label')
			joke.textContent = 'Joker Drawn! Reshuffle and issue Bennies.'
			jokediv.appendChild(joke)
			deckfieldset.appendChild(jokediv);
		}

		const discardfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
		const discardleg = doc.createElement('legend') as HTMLLegendElement
		discardleg.textContent = `Discard Pile [${this.discardPool.length}]`
		discardfieldset.appendChild(discardleg)
		discardfieldset.classList.add("flex-container")
		discardfieldset.id = "Discard"
		discardfieldset.title = "Discard Pile"
		const discarddiv = doc.createElement('div') as HTMLDivElement
		discarddiv.classList.add("flex-item-3")
		discarddiv.classList.add(Card.relcard[0])
		const discardcarddiv = doc.createElement('div') as HTMLDivElement
		discardcarddiv.classList.add("flex-item-2")
		discardcarddiv.classList.add(...Card.relcard)
		discardfieldset.appendChild(discarddiv)
		discardfieldset.appendChild(discardcarddiv)
		container.appendChild(discardfieldset)
		for (const c of this.discardPool) {
			c.render(discardcarddiv, x, y)
			x = x + Deck.rem2px(Card.cardStacked())
		}

		const dp = ButtonFactory.getButton("dp", "Discard All Hands", "card-burn", "")
		dp.addEventListener('click', () => {
			Game.instance.discardPlayers()
			Game.instance.render()
		})
		discarddiv.appendChild(dp)

		const specialfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
		const specialleg = doc.createElement('legend') as HTMLLegendElement
		specialleg.textContent = `Card Pool [${this.specialPool.length}]`
		specialfieldset.appendChild(specialleg)
		specialfieldset.classList.add("flex-container")
		specialfieldset.id = "Pool"
		specialfieldset.title = "Card Pool"

		const specialdiv = doc.createElement('div') as HTMLDivElement
		specialdiv.classList.add("flex-item-3")
		specialdiv.classList.add(...Card.relcard)
		const specialcarddiv = doc.createElement('div') as HTMLDivElement
		specialcarddiv.classList.add("flex-item-2")
		specialcarddiv.classList.add(...Card.relcard)
		specialfieldset.appendChild(specialdiv)
		specialfieldset.appendChild(specialcarddiv)
		container.appendChild(specialfieldset)

		for (const c of this.specialPool) {
			c.render(specialcarddiv, x, y)
			x = x + Deck.rem2px(Card.cardStacked())
		}

		const cp = ButtonFactory.getButton("cp", "Draw a Card", "card-pickup", "")
		cp.addEventListener('click', () => {
			Game.instance.deck.moveToSpecialPool(Game.instance.deck.cards, 1)
			Game.instance.render()
		})
		specialdiv.appendChild(cp)
	}
}