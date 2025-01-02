import { ButtonFactory } from "./button"
import { Card, Facing } from "./cards"
import { Deck } from "./deck"
import { Game } from "./game"

export class Player {

	hand: Card[]
	public id: string
	public onHold: boolean
	public outOfCombat: boolean
	public levelHeaded: boolean
	public impLevelHeaded: boolean
	public tactician: boolean
	public mastertactician: boolean
	public quick: boolean
	public chooseCard: boolean
	public hesitant: boolean

	constructor(public name: string) {
		this.hand = []
		this.id = Game.shortUUID()
		this.onHold = false
		this.onHold = false
		this.outOfCombat = false
		this.levelHeaded = false
		this.impLevelHeaded = false
		this.tactician = false
		this.mastertactician = false
		this.quick = false
		this.chooseCard = false
		this.hesitant = false
		console.log(`name:${this.name}  id:[${this.id}]`)
	}

	addCard(card: Card) {
		this.hand.push(card);
	}

	bestCard(): Card | undefined {
		if (this.hesitant) {
			return this.lowCard()
		} else {
			return this.highCard()
		}
	}
	highCard(): Card | undefined {
		if (this.hand.length > 0) {
			const highestValueItem = this.hand.reduce((max, current) =>
				max.sequence > current.sequence ? max : current)
			return highestValueItem
		}
		return undefined
	}
	lowCard(): Card | undefined {
		if (this.hand.length > 0) {
			const lowestValueItem = this.hand.reduce((min, current) =>
				min.sequence < current.sequence || min.isJoker() ? min : current)
			return lowestValueItem
		}
		return undefined
	}

	drawInitiative() {
		let g = Game.instance
		let p = this
		if (p.hesitant) {
			p.quick = false
			p.levelHeaded = false
			p.impLevelHeaded = false
		}
		if (p.onHold)
			return
		g.deck.moveToDiscardPool(p.hand)
		if (p.outOfCombat)
			return
		g.deck.dealFromTop(p.hand, 1, Facing.Up)
		if (p.impLevelHeaded)
			g.deck.dealFromTop(p.hand, 1, Facing.Up)
		if (p.levelHeaded || p.impLevelHeaded || p.hesitant)
			g.deck.dealFromTop(p.hand, 1, Facing.Up)
		if (p.quick)
			while (p.hand.every(c => c.rank <= 5)) {
				g.deck.dealFromTop(p.hand, 1, Facing.Up)
			}
	}
	drawInterlude() {
		let g = Game.instance
		let p = this
		g.deck.moveToDiscardPool(p.hand)
		g.deck.dealFromTop(p.hand, 1, Facing.Up)
	}

	discardHand() {
		let g = Game.instance
		let p = this
		g.deck.moveToDiscardPool(p.hand, 0)
	}

	hasJoker(): boolean {
		return this.hand.some(c => c.isJoker() === true);
	}

	removeCard(card: Card) {
		const index = this.hand.indexOf(card)
		if (index > -1) {
			this.hand.splice(index, 1)
		}
	}

	removeRender() {
		const divToRemove = document.querySelector(`fieldset[data-pid="${this.id}"]`)
		if (divToRemove) {
			divToRemove.remove()
		}
	}

	render(container: HTMLDivElement, x: number, y: number) {
		const doc = container.ownerDocument
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const legend = doc.createElement('legend') as HTMLLegendElement;
		legend.textContent = `${this.name}`
		fieldset.appendChild(legend)
		fieldset.classList.add("flex-container")
		fieldset.title = this.name
		fieldset.setAttribute('data-pid', this.id)

		const playerdiv = doc.createElement('div') as HTMLDivElement
		playerdiv.classList.add("flex-item-1")
		const carddiv = doc.createElement('div') as HTMLDivElement
		carddiv.classList.add("flex-item-2")
		carddiv.classList.add(...Card.relcard)
		fieldset.appendChild(playerdiv)
		fieldset.appendChild(carddiv)
		container.appendChild(fieldset)

		const drawcard = ButtonFactory.getButton("drawcard", "Draw a Card", "card-pickup", "") //this.id)
		drawcard.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			p.drawCard()
			Game.instance.render()
		})
		playerdiv.appendChild(drawcard)

		const drawhand = ButtonFactory.getButton("drawhand", "Draw Hand", "poker-hand", "") //this.id)
		drawhand.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			p.drawInitiative()
			Game.instance.render()
		})
		playerdiv.appendChild(drawhand)

		const choose = ButtonFactory.getButton("choose", "Choose Card", "card-pick", "") //this.id)
		if (this.chooseCard) choose.classList.add("btn-success")
		choose.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.chooseCard = !p.chooseCard
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(choose)

		const discardhand = ButtonFactory.getButton("discardhand", "Discard Hand", "hand-discard", "") //this.id)
		discardhand.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			Game.instance.deck.moveToDiscardPool(p.hand, 0)
			Game.instance.render()
		})
		playerdiv.appendChild(discardhand)

		const outcombat = ButtonFactory.getButton("outcombat", "Out of Combat", "truce", "") //this.id)
		if (this.outOfCombat) outcombat.classList.add("btn-success")
		outcombat.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.outOfCombat = !p.outOfCombat
			if (p.outOfCombat) {
				p.discardHand()
			}
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(outcombat)

		const onhold = ButtonFactory.getButton("onhold", "On Hold", "halt", "") //this.id)
		if (this.onHold) onhold.classList.add("btn-success")
		onhold.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.onHold = !p.onHold
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(onhold)

		// const rp = ButtonFactory.getButton("rp", "Remove Player", "trash-can", "") //this.id)
		// rp.classList.add("btn-danger")
		// rp.addEventListener('click', function () {
		// 	let p = Player.getPlayer(this)
		// 	p.removeRender()
		// 	Game.instance.removePlayer(p)
		// 	Game.instance.removePlayerMetadata(p)
		// 	Game.instance.render()
		// })
		// playerdiv.appendChild(rp)

		const hesitant = ButtonFactory.getButton("hesitant", "Hesitant Hindrance", "uncertainty", "") //this.id)
		if (this.hesitant) hesitant.classList.add("btn-success")
		hesitant.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.hesitant = !p.hesitant
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(hesitant)

		const quick = ButtonFactory.getButton("quick", "Quick Edge", "sprint", "") //this.id)
		if (this.quick) quick.classList.add("btn-success")
		quick.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.quick = !p.quick
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(quick)

		// const tacttype = (this.mastertactician) ? "aces" : "ace"
		// const tactician = ButtonFactory.getButton("tactician", "Tactician", tacttype, "") //this.id)
		// if (this.tactician || this.mastertactician) tactician.classList.add("btn-success")
		// tactician.addEventListener('click', function () {
		// 	let p = Player.getPlayer(this)
		// 	if (p.mastertactician) {
		// 		p.mastertactician = false
		// 		p.tactician = false
		// 	} else if (p.tactician && !p.mastertactician) {
		// 		p.mastertactician = true
		// 		p.tactician = true
		// 	} else {
		// 		p.tactician = true
		// 		p.mastertactician = false
		// 	}
		// 	Game.instance.render()
		// })
		// playerdiv.appendChild(tactician)

		const lvlheadtype = (this.impLevelHeaded) ? "scales-exclaim" : "scales"
		const levelhead = ButtonFactory.getButton("levelhead", "Level Headed Edge", lvlheadtype, "") //this.id)
		if (this.levelHeaded || this.impLevelHeaded) levelhead.classList.add("btn-success")
		levelhead.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			if (p.impLevelHeaded) {
				p.impLevelHeaded = false
				p.levelHeaded = false
			} else if (p.levelHeaded && !p.impLevelHeaded) {
				p.impLevelHeaded = true
				p.levelHeaded = true
			} else {
				p.levelHeaded = true
				p.impLevelHeaded = false
			}
			Game.instance.render()
		})
		playerdiv.appendChild(levelhead)

		for (const c of this.hand) {
			c.render(carddiv, x, y)
			x = x + Deck.rem2px(Card.cardSpread())
		}
	}

	drawCard() {
		Game.instance.deck.dealFromTop(this.hand, 1, Facing.Up)
	}

	static getPlayer(but: HTMLButtonElement): Player {
		let element=but as HTMLElement
		let pid = element.getAttribute('data-pid')
		while (!pid && element){
			element=element.parentElement as HTMLElement
			pid=element.getAttribute('data-pid')
		}
		let p = Game.instance.deck.getPlayer(pid)
		return p
	}
}