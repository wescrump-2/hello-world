// Enum for card suits
export enum Suit {
	Hearts = "Hearts",
	Diamonds = "Diamonds",
	Clubs = "Clubs",
	Spades = "Spades",
	Joker = "Joker"
}

// Enum for card values
export enum Value {
	Ace = "14",
	Two = "2",
	Three = "3",
	Four = "4",
	Five = "5",
	Six = "6",
	Seven = "7",
	Eight = "8",
	Nine = "9",
	Ten = "10",
	Jack = "11",
	Queen = "12",
	King = "13",
	Joker = "15"
}
export enum Color {
	Red = "Red",
	Black = "Black"
}

// Card class
export class Card {
	static inc: number = 20
	rank: number
	faceup: boolean = false
	suit: Suit
	value: Value
	face: SVGElement
	color: Color

	constructor(rank: number, obj: HTMLObjectElement) {
		this.rank = rank
		this.faceup = false
		const svg = obj.contentDocument
		this.face = svg?.querySelector(`[rank="${rank}"]`) as SVGElement
		this.value = this.face.getAttribute("number") as Value
		this.suit = this.face.getAttribute("suit") as Suit
		this.color = (this.suit === Suit.Hearts || this.suit === Suit.Diamonds) ? Color.Red : Color.Black
	}

	toString(): string {
		return `${this.value} of ${this.suit}`;
	}

	draw(div: HTMLDivElement, scale: number, x: number, y: number) {
		const svg = div.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg")
		svg.innerHTML = this.face.innerHTML
		div.appendChild(svg)
		Card.scale(svg, scale, scale)
		let cls: string[] = ["position-absolute", "small-card"]
		svg.classList.remove(...cls)
		svg.classList.add(...cls)
		svg.style.top = `${y}px`
		svg.style.left = `${x}px`
	}

	static scale(svg: SVGSVGElement, x: number, y: number) {
		const trans = svg.createSVGTransform()
		trans.setScale(x, y)
		svg.transform.baseVal.clear
		svg.transform.baseVal.appendItem(trans)
		svg.parentElement?.offsetWidth
		const bbox = svg.getBBox()
		svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
	}
}

export class Player {
	hand: Card[] = [];
	onHold: boolean = false;
	levelHeaded: boolean = false;
	quick: boolean = false;
	outOfCombat: boolean = false;
	chooseCard: boolean = false;
	hesitant: boolean = false;

	constructor(public name: string) { }

	addCard(card: Card) {
		this.hand.push(card);
	}

	removeCard(card: Card) {
		const index = this.hand.indexOf(card);
		if (index > -1) {
			this.hand.splice(index, 1);
		}
	}

	draw(div: HTMLDivElement, scale: number, x: number, y: number) {
		for (const c of this.hand) {
			c.draw(div, scale, x, y)
			x = x + Card.inc
		}
	}
}

export class Deck {
	players: Player[] = []
	cards: Card[] = []
	backs: SVGSVGElement[] = []
	back: SVGElement
	discardPool: Card[] = []
	specialPool: Card[] = []

	public scale: number = 1

	constructor(obj: HTMLObjectElement) {
		this.scale = 1
		const svg = obj.contentDocument
		const elements = svg?.querySelectorAll("[cardback]")?.values()
		for (const el of elements ?? []) {
			this.backs.push(el as SVGSVGElement)
		}
		this.back = this.backs[Math.floor(Math.random() * (this.backs.length + 1))]
		this.initializeDeck(obj)
		this.shuffle()
	}

	initializeDeck(obj: HTMLObjectElement) {
		if (this.cards.length > 0) {
			this.cards = []
		}
		for (let i = 1; i <= 56; i++) {
			this.cards.push(new Card(i, obj));
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

	changeBack(back: number) {
		this.back = this.backs[Math.max(0, Math.min(this.backs.length, back - 1))]
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

	dealFromTop(player: Player, numCards: number) {
		this.moveToPool(player.hand, this.cards, numCards, true)
	}

	dealFromBottom(player: Player, numCards: number) {
		this.moveToPool(player.hand, this.cards, numCards, false)
	}

	returnCardsToDeck(from: Card[], numCards: number = 0) {
		this.moveToPool(this.cards, from, numCards)
	}

	moveToDiscardPool(from: Card[], numCards: number = 0) {
		this.moveToPool(this.discardPool, from, numCards)
	}

	moveToSpecialPool(from: Card[], numCards: number = 0) {
		this.moveToPool(this.specialPool, from, numCards)
	}

	moveToPool(to: Card[], from: Card[], numCards: number = 0, top: boolean = true) {
		const limit = numCards === 0 ? from.length : Math.min(numCards, from.length)
		for (let i = 0; i < limit; i++) {
			if (top) {
				to.push(from.shift()!)
			} else {
				to.push(from.pop()!)
			}
		}
	}

	drawBack(div: HTMLDivElement, x: number, y: number) {
		const svg = div.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg")
		svg.innerHTML = this.back.innerHTML
		div.appendChild(svg)
		Card.scale(svg, this.scale, this.scale)
		let cls: string[] = ["position-absolute", "small-card"]
		svg.classList.remove(...cls)
		svg.classList.add(...cls)
		svg.style.top = `${y}px`
		svg.style.left = `${x}px`
	}

	draw(div: HTMLDivElement) {
		//draw deck	
		let y = 500
		let x = 0

		for (let i = 0; i < this.cards.length; i++) {
			this.drawBack(div, x, y)
			x = x + 3
		}

		//draw dicard
		x = 0
		y = y + 100
		for (const c of this.discardPool) {
			c.draw(div, this.scale, x, y)
			x = x + Card.inc
		}

		//draw special
		x = 0
		y = y + 100
		for (const c of this.specialPool) {
			c.draw(div, this.scale, x, y)
			x = x + Card.inc
		}
	}
}

// Game class
export class Game {
	deck: Deck
	div: HTMLDivElement

	constructor(cardobject: HTMLObjectElement, container: HTMLDivElement) {
		this.deck = new Deck(cardobject)
		this.div = container
	}

	addPlayer(name: string) {
		this.deck.players.push(new Player(name));
	}

	draw() {
		//draw deck
		this.deck.draw(this.div)
		//draw player hands
		let y = 700
		let x = 0
		for (const p of this.deck.players) {
			p.draw(this.div, this.deck.scale, x, y)
			y = y + 120
		}
	}

	startGame() {
		this.deck.shuffle();
		// Add game logic here
	}

	newRound() {
		for (const p of this.deck.players) {
			this.deck.moveToDiscardPool(p.hand)
		}
	}

	newGame() {
		for (const p of this.deck.players) {
			this.deck.moveToDiscardPool(p.hand)
		}
		this.deck.moveToDiscardPool(this.deck.specialPool)
		this.deck.returnCardsToDeck(this.deck.discardPool)
	}
}