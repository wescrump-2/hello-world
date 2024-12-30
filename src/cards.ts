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

	static cardStackedDown(): string {
		const rootStyles = getComputedStyle(document.documentElement)
		return rootStyles.getPropertyValue('--card-stacked-down-inc').trim()
	}

	static cardStacked(): string {
		const rootStyles = getComputedStyle(document.documentElement)
		return rootStyles.getPropertyValue('--card-stacked-inc').trim()
	}

	static cardSpread(): string {
		const rootStyles = getComputedStyle(document.documentElement)
		return rootStyles.getPropertyValue('--card-spread-inc').trim()
	}

	isJoker(): boolean {
		return (this.value===15)
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
