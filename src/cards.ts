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
	static stackedinc: number = 2
	static spreadinc: number = 100
	rank: number
	dir: Facing = Facing.Down
	suit: Suit
	value: Value
	face: SVGElement
	backidx: number = 0
	color: Color

	constructor(rank: number, obj: HTMLObjectElement, backx: number = 2) {
		this.rank = rank
		this.dir = Facing.Down
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
		this.color = (this.suit === Suit.Hearts || this.suit === Suit.Diamonds) ? Color.Red : Color.Black
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
		return `${this.value} of ${this.suit}`;
	}

	render(container: HTMLDivElement, scale: number, x: number, y: number) {
		const svg = container.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement
		svg.innerHTML = this.getImageSvg()
		container.appendChild(svg)
		let cls: string[] = ["position-absolute", "small-card"]
		svg.classList.add(...cls)
		const bbox = svg.getBBox()
		if (bbox.width > 0 && bbox.height > 0)
			svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
		svg.style.top = `${y}px`
		svg.style.left = `${x}px`
		//Card.scale(svg, scale, scale)
	}

	static scale(svg: SVGSVGElement, x: number, y: number) {
		const trans = svg.createSVGTransform()
		trans.setScale(x, y)
		svg.transform.baseVal.clear
		svg.transform.baseVal.appendItem(trans)
	}
}

export class Player {
	hand: Card[] = [];

	public onHold: boolean = false;
	public outOfCombat: boolean = false;
	public levelHeaded: boolean = false;
	public impLevelHeaded: boolean = false;
	public quick: boolean = false;
	public chooseCard: boolean = false;
	public hesitant: boolean = false;

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

	render(container: HTMLDivElement, scale: number, x: number, y: number) {
		const doc = container.ownerDocument
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const playerdiv = doc.createElement('div') as HTMLDivElement
		const carddiv = doc.createElement('div') as HTMLDivElement
		carddiv.classList.add(...["position-relative", "small-card"])
		container.appendChild(playerdiv)
		playerdiv.appendChild(fieldset)

		const legend = doc.createElement('legend') as HTMLLegendElement;
		legend.textContent = `Player: ${this.name}`;
		fieldset.appendChild(legend);

		const onholdlabel = doc.createElement('label') as HTMLLabelElement
		onholdlabel.textContent = `On Hold:${this.onHold}`
		const outofcombatlabel = doc.createElement('label') as HTMLLabelElement
		outofcombatlabel.textContent = `Out of Combat:${this.outOfCombat}`
		const levelheadedlabel = doc.createElement('label') as HTMLLabelElement
		levelheadedlabel.textContent = `Level Headed:${this.levelHeaded}`
		const impLevelHeadedlabel = doc.createElement('label') as HTMLLabelElement
		impLevelHeadedlabel.textContent = `Improved Level Headed:${this.impLevelHeaded}`
		const quicklabel = doc.createElement('label') as HTMLLabelElement
		quicklabel.textContent = `Quick:${this.quick}`
		const hesitantlabel = doc.createElement('label') as HTMLLabelElement
		hesitantlabel.textContent = `Hesitant:${this.hesitant}`
		const choosecardlable = doc.createElement('label') as HTMLLabelElement
		choosecardlable.textContent = `Chooses Card:${this.chooseCard}`

		fieldset.appendChild(onholdlabel)
		fieldset.appendChild(outofcombatlabel)
		fieldset.appendChild(levelheadedlabel)
		fieldset.appendChild(impLevelHeadedlabel)
		fieldset.appendChild(quicklabel)
		fieldset.appendChild(hesitantlabel)
		fieldset.appendChild(choosecardlable)
		fieldset.appendChild(carddiv)

		for (const c of this.hand) {
			c.render(carddiv, scale, x, y)
			x = x + Card.spreadinc
		}
	}
}

export class Deck {
	players: Player[] = []
	cards: Card[] = []

	discardPool: Card[] = []
	specialPool: Card[] = []

	public scale: number = 1

	constructor(obj: HTMLObjectElement) {
		this.scale = 1
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

	render(container: HTMLDivElement) {
		const doc = container.ownerDocument
		const deckfieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const deckdiv = doc.createElement('div') as HTMLDivElement
		const deckcarddiv = doc.createElement('div') as HTMLDivElement
		deckcarddiv.classList.add(...["position-relative", "small-card"])
		deckdiv.classList.add("position-relative")
		container.appendChild(deckdiv)
		deckdiv.appendChild(deckfieldset)
		deckfieldset.appendChild(deckcarddiv)

		//draw deck
		let x = 0
		let y = 0
		for (const c of this.cards) {
			c.render(deckcarddiv, this.scale, x, y)
			x = x + Card.stackedinc
		}
		const discardfieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const discarddiv = doc.createElement('div') as HTMLDivElement
		const discardcarddiv = doc.createElement('div') as HTMLDivElement
		discardcarddiv.classList.add(...["position-relative", "small-card"])
		discarddiv.classList.add("position-relative")
		container.appendChild(discarddiv)
		discarddiv.appendChild(discardfieldset)
		discardfieldset.appendChild(discardcarddiv)

		//draw dicard
		for (const c of this.discardPool) {
			c.render(discardcarddiv, this.scale, x, y)
			x = x + Card.spreadinc
		}
		const specialfieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const specialdiv = doc.createElement('div') as HTMLDivElement
		const specialcarddiv = doc.createElement('div') as HTMLDivElement
		specialcarddiv.classList.add(...["position-relative", "small-card"])
		specialdiv.classList.add("position-relative")
		container.appendChild(specialdiv)
		specialdiv.appendChild(specialfieldset)
		specialfieldset.appendChild(specialcarddiv)
		//draw special
		for (const c of this.specialPool) {
			c.render(specialcarddiv, this.scale, x, y)
			x = x + Card.spreadinc
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

	addPlayer(name: string): Player {
		const p = new Player(name)
		this.deck.players.push(p);
		return p
	}

	render() {
		//draw deck
		this.deck.render(this.div)
		//draw player hands
		let y = 0
		let x = 0
		for (const p of this.deck.players) {
			p.render(this.div, this.deck.scale, x, y)
		}
	}
	testplayers: string[] = ["h", "il", "lh", "a", "a", "q", "lhq", "ilq"]
	startGame() {
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

	newRound() {
		for (const p of this.deck.players) {
			this.deck.moveToDiscardPool(p.hand)
		}
	}

	newGame() {
		this.newRound()
		this.deck.moveToDiscardPool(this.deck.specialPool)
		this.deck.returnCardsToDeck(this.deck.discardPool)
	}

	drawInitiative() {
		for (const p of this.deck.players) {
			if (p.hesitant) {
				p.quick = false
				p.levelHeaded = false
				p.impLevelHeaded = false
			}
			if (p.onHold)
				return
			this.deck.moveToDiscardPool(p.hand)
			if (p.outOfCombat)
				return
			this.deck.dealFromTop(p.hand, 1, Facing.Up)
			if (p.impLevelHeaded)
				this.deck.dealFromTop(p.hand, 1, Facing.Up)
			if (p.levelHeaded || p.impLevelHeaded || p.hesitant)
				this.deck.dealFromTop(p.hand, 1, Facing.Up)
			if (p.quick)
				while (p.hand.every(c => c.value <= 5)) {
					this.deck.dealFromTop(p.hand, 1, Facing.Up)
				}
		}
	}
}