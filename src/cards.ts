import { ButtonFactory } from "./button"
import { Game } from "./game"
import { Player } from "./player"

// Enum for card suits
export enum Suit {
	Hearts = "Hearts",
	Diamonds = "Diamonds",
	Clubs = "Clubs",
	Spades = "Spades",
	RedJoker = "RedJoker",
	BlackJoker = "BlackJoker"
}

// Enum for card values
export enum Value {
	Two = 2,
	Three = 3,
	Four = 4,
	Five = 5,
	Six = 6,
	Seven = 7,
	Eight = 8,
	Nine = 9,
	Ten = 10,
	Jack = 11,
	Queen = 12,
	King = 13,
	Ace = 14,
	Joker = 15
}
export enum Color {
	Red = "Red",
	Black = "Black"
}
export enum Facing {
	None, Up, Down
}

// Card class
export class Card {
	static backs: SVGSVGElement[] = []
	static stackeddowninc: string = '.25rem'
	static stackedupinc: string = '.5rem'
	static spreadinc: string = '3rem'
	static abscard: string[] = ["position-absolute", "small-card"]
	static relcard: string[] = ["position-relative", "small-card"]
	rank: number
	dir: Facing = Facing.Down
	suit: Suit
	value: Value
	face: SVGElement
	backidx: number = 0
	color: Color

	constructor(rank: number, backx: number = 2) {
		this.rank = rank
		this.dir = Facing.Down
		const obj = document.getElementById("cards-svg") as HTMLObjectElement
		const svg = obj.contentDocument
		if (Card.backs.length === 0) {
			const elements = svg?.querySelectorAll("[cardback]")?.values()
			for (const el of elements ?? []) {
				Card.backs.push(el as SVGSVGElement)
			}
		}
		this.face = svg?.querySelector(`[rank="${rank}"]`) as SVGElement
		this.setBack(backx)
		this.value = Number(this.face.getAttribute("number")) as Value
		this.suit = this.face.getAttribute("suit") as Suit
		this.color = (this.suit === Suit.Spades || this.suit === Suit.Clubs || this.suit === Suit.BlackJoker) ? Color.Black : Color.Red
	}
	setBack(back: number) {
		this.backidx = Math.max(0, Math.min(back, Card.backs.length - 1))
	}
	back(): SVGElement {
		return Card.backs[this.backidx]
	}

	getImageSvg(): string {
		let img = this.face.innerHTML
		if (this.dir != Facing.Up) {
			img = this.back().innerHTML
		}
		return img
	}

	toString(): string {
		if (this.dir === Facing.Up)
			return `${Value[this.value]} of ${(this.value === Value.Joker) ? this.color : this.suit}`
		else
			return 'card'
	}

	render(container: HTMLDivElement, x: number, y: number) {
		const doc = container.ownerDocument
		const div = doc.createElement('div') as HTMLDivElement
		const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement
		svg.innerHTML = this.getImageSvg()
		div.appendChild(svg)
		container.appendChild(div)
		div.title = this.toString()
		svg.classList.add(...Card.abscard)
		const bbox = svg.getBBox()
		if (bbox.width > 0 && bbox.height > 0)
			svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
		svg.style.top = `${y}px`
		svg.style.left = `${x}px`
	}
}

export class Deck {
	players: Player[] = []
	cards: Card[] = []
	discardPool: Card[] = []
	specialPool: Card[] = []
	use4jokers: boolean = false
	public scale: number = 1

	constructor() {
		this.scale = 1
		this.initializeDeck()
		this.shuffle()
	}

	static rem2px(remstr: string): number {
		const rem = parseFloat(remstr)
		const rootFontSize = parseInt(getComputedStyle(document.documentElement).fontSize, 10);
		return rem * rootFontSize;
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

	removeRender(container: HTMLDivElement) {
		for (let str of ["Draw", "Discard", "Pool"]) {
			const rem = container.querySelector(`div[id="${str}"]`);
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
		const deckdiv = doc.createElement('div') as HTMLDivElement
		deckdiv.title = deckleg.textContent
		deckdiv.id = "Draw"
		const deckcarddiv = doc.createElement('div') as HTMLDivElement
		deckcarddiv.classList.add(...Card.relcard)
		deckdiv.classList.add(Card.relcard[0])
		container.appendChild(deckdiv)
		deckdiv.appendChild(deckfieldset)
		deckfieldset.appendChild(deckcarddiv)
		for (const c of this.cards) {
			c.render(deckcarddiv, x, y)
			x = x + Deck.rem2px(Card.stackeddowninc)
		}

		const discardfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
		const discardleg = doc.createElement('legend') as HTMLLegendElement
		discardleg.textContent = `Discard Pile [${this.discardPool.length}]`
		discardfieldset.appendChild(discardleg)
		const discarddiv = doc.createElement('div') as HTMLDivElement
		discarddiv.title = discardleg.textContent
		discarddiv.id = "Discard"
		const discardcarddiv = doc.createElement('div') as HTMLDivElement
		discardcarddiv.classList.add(...Card.relcard)
		discarddiv.classList.add(Card.relcard[0])
		container.appendChild(discarddiv)
		discarddiv.appendChild(discardfieldset)
		discardfieldset.appendChild(discardcarddiv)
		for (const c of this.discardPool) {
			c.render(discardcarddiv, x, y)
			x = x + Deck.rem2px(Card.stackedupinc)
		}

		const specialfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
		const specialleg = doc.createElement('legend') as HTMLLegendElement
		specialleg.textContent = `Card Pool [${this.specialPool.length}]`
		specialfieldset.appendChild(specialleg)
		const specialdiv = doc.createElement('div') as HTMLDivElement
		specialdiv.title = specialleg.textContent
		specialdiv.id = "Pool"
		const specialcarddiv = doc.createElement('div') as HTMLDivElement
		specialcarddiv.classList.add(...Card.relcard)
		specialdiv.classList.add(Card.relcard[0])
		container.appendChild(specialdiv)
		specialdiv.appendChild(specialfieldset)
		specialfieldset.appendChild(specialcarddiv)
		for (const c of this.specialPool) {
			c.render(specialcarddiv, x, y)
			x = x + Deck.rem2px(Card.spreadinc) 
		}

		const cp = ButtonFactory.getButton("cp", "Draw a Card", "card-pickup", "")
		cp.addEventListener('click', () => {
			Game.instance.deck.moveToSpecialPool(Game.instance.deck.cards, 1)
			Game.instance.render()
		})
		specialfieldset.appendChild(cp)
	}
}