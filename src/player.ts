import { ButtonFactory } from "./button"
import { Card, Facing } from "./cards"
import { Deck } from "./deck"
import { Game } from "./game"

export class Player {
	hand: Card[] = []
	public id = Game.shortUUID()
	public onHold: boolean = false
	public outOfCombat: boolean = false
	public levelHeaded: boolean = false
	public impLevelHeaded: boolean = false
	public quick: boolean = false
	public chooseCard: boolean = false
	public hesitant: boolean = false

	constructor(public name: string) { }

	addCard(card: Card) {
		this.hand.push(card);
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
			while (p.hand.every(c => c.value <= 5)) {
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
	removeRender(but: HTMLElement) {
		const ppdiv = but.parentElement?.parentElement?.parentElement as HTMLElement
		const divToRemove = ppdiv.querySelector(`fieldset[data-pid="${this.id}"]`)
		if (divToRemove) {
			divToRemove.remove()
		}
	}

	render(container: HTMLDivElement, x: number, y: number) {
		const doc = container.ownerDocument
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const legend = doc.createElement('legend') as HTMLLegendElement;
		legend.textContent = `Player: ${this.name}`
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

		const ooc = ButtonFactory.getButton("ooc", "Out of Combat", "truce", this.id)
		if (this.outOfCombat) ooc.classList.add("btn-success")
		ooc.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.outOfCombat = !p.outOfCombat
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(ooc)

		const oh = ButtonFactory.getButton("oh", "On Hold", "halt", this.id)
		if (this.onHold) oh.classList.add("btn-success")
		oh.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.onHold = !p.onHold
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(oh)

		const pu = ButtonFactory.getButton("pu", "Draw a Card", "card-pickup", this.id)
		pu.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			Game.instance.deck.dealFromTop(p.hand, 1, Facing.Up)
			Game.instance.render()
		})
		playerdiv.appendChild(pu)

		const dh = ButtonFactory.getButton("dh", "Discard Hand", "card-discard", this.id)
		dh.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			Game.instance.deck.moveToDiscardPool(p.hand, 0)
			Game.instance.render()
		})
		playerdiv.appendChild(dh)

		const rp = ButtonFactory.getButton("rp", "Remove Player", "trash-can", this.id)
		rp.classList.add("btn-danger")
		rp.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			p.removeRender(this)
			Game.instance.removePlayer(p)
			Game.instance.render()
		})
		playerdiv.appendChild(rp)

		const hes = ButtonFactory.getButton("hes", "Hesitant Hindrance", "uncertainty", this.id)
		if (this.hesitant) hes.classList.add("btn-success")
		hes.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.hesitant = !p.hesitant
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(hes)

		const qk = ButtonFactory.getButton("qk", "Quick Edge", "sprint", this.id)
		if (this.quick) qk.classList.add("btn-success")
		qk.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.quick = !p.quick
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(qk)

		const lh = ButtonFactory.getButton("lh", "Level Headed Edge", "scales", this.id)
		if (this.levelHeaded) lh.classList.add("btn-success")
		lh.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.levelHeaded = !p.levelHeaded
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(lh)

		const ilh = ButtonFactory.getButton("ilh", "Improved Level Headed Edge", "scales-exclaim", this.id)
		if (this.impLevelHeaded) ilh.classList.add("btn-success")
		ilh.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.impLevelHeaded = !p.impLevelHeaded
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(ilh)

		const cc = ButtonFactory.getButton("cc", "Choose Card", "card-exchange", this.id)
		if (this.impLevelHeaded) cc.classList.add("btn-success")
		cc.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.chooseCard = !p.chooseCard
			ButtonFactory.toggle(event)
		})
		playerdiv.appendChild(cc)

		for (const c of this.hand) {
			c.render(carddiv, x, y)
			x = x + Deck.rem2px(Card.cardSpread())
		}
	}

	static getPlayer(but: HTMLButtonElement): Player {
		let pid = but.getAttribute('data-pid') as string
		let p = Game.instance.deck.players.find(item => item.id === pid) as Player
		return p
	}
}