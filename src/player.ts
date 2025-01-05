import OBR, { isImage } from "@owlbear-rodeo/sdk"
import { ButtonFactory } from "./button"
import { Card, Facing } from "./cards"
import { Deck } from "./deck"
import { Util } from "./util"
export enum LevelHeaded {
	None = 0,
	LevelHeaded = 1,
	ImpLevelHeaded = 2
}
export interface PlayerMeta {
	hand: number[]
	id: string
	name: string
	owner: string
	onHold: boolean
	outOfCombat: boolean
	levelHeaded: boolean
	impLevelHeaded: boolean
	tactician: boolean
	mastertactician: boolean
	quick: boolean
	canchoose: boolean
	hesitant: boolean
	choosencard: number
}

export class Player {
	private meta: PlayerMeta = {
		hand: [],
		id: "",
		name: "",
		owner: "",
		onHold: false,
		outOfCombat: false,
		levelHeaded: false,
		impLevelHeaded: false,
		tactician: false,
		mastertactician: false,
		quick: false,
		canchoose: false,
		hesitant: false,
		choosencard: -1,
	}

	//hand: Card[] //fixme
	get hand(): number[] { return this.meta.hand }
	set hand(newhand: number[]) { this.meta.hand = newhand }
	get id(): string { return this.meta.id }
	set id(newId: string) { this.meta.id = newId }
	get name(): string { return this.meta.name }
	set name(newName: string) { this.meta.name = newName }
	get owner(): string { return this.meta.owner }
	set owner(newowner: string) { this.meta.owner = newowner }
	get onHold(): boolean { return this.meta.onHold }
	set onHold(newonHold: boolean) { this.meta.onHold = newonHold }
	get outOfCombat(): boolean { return this.meta.outOfCombat }
	set outOfCombat(newoutOfCombat: boolean) { this.meta.outOfCombat = newoutOfCombat }
	get levelHeaded(): boolean { return this.meta.levelHeaded }
	set levelHeaded(newlevelHeaded: boolean) { this.meta.levelHeaded = newlevelHeaded }
	get impLevelHeaded(): boolean { return this.meta.impLevelHeaded }
	set impLevelHeaded(newimpLevelHeaded: boolean) { this.meta.impLevelHeaded = newimpLevelHeaded }
	get tactician(): boolean { return this.meta.tactician }
	set tactician(newtactician: boolean) { this.meta.tactician = newtactician }
	get mastertactician(): boolean { return this.meta.mastertactician }
	set mastertactician(newmastertactician: boolean) { this.meta.mastertactician = newmastertactician }
	get quick(): boolean { return this.meta.quick }
	set quick(newquick: boolean) { this.meta.quick = newquick }
	get canchoose(): boolean { return this.meta.canchoose }
	set canchoose(newcanchoose: boolean) { this.meta.canchoose = newcanchoose }
	get hesitant(): boolean { return this.meta.hesitant }
	set hesitant(newhesitant: boolean) { this.meta.hesitant = newhesitant }
	get choosencard(): number { return this.meta.choosencard }
	set choosencard(newchoosencard: number) { this.meta.choosencard = newchoosencard }
	get getMeta(): PlayerMeta { return this.meta }
	set setMeta(newMeta: PlayerMeta) { this.meta = newMeta }

	constructor(name: string) {
		this.meta.name = name
		this.meta.hand = []
		this.meta.id = Util.shortUUID()
		//console.log(`name:${this.name}  id:[${this.id}]`)
	}

	toggleLevelHeaded() {
		if (!this.levelHeaded && this.impLevelHeaded) {
			this.levelHeaded = false
			this.impLevelHeaded = false
		} else if (!this.levelHeaded && !this.impLevelHeaded) {
			this.levelHeaded = true
			this.impLevelHeaded = false
			this.hesitant = false
		} else if (this.levelHeaded && !this.impLevelHeaded) {
			this.levelHeaded = false
			this.impLevelHeaded = true
			this.hesitant = false
		} else if (this.levelHeaded && this.impLevelHeaded) {
			this.levelHeaded = false
			this.impLevelHeaded = false
		}
	}

	toggleTactician() {
		if (!this.tactician && this.mastertactician) {
			this.tactician = false
			this.mastertactician = false
		} else if (!this.tactician && !this.mastertactician) {
			this.tactician = true
			this.mastertactician = false
		} else if (this.tactician && !this.mastertactician) {
			this.tactician = false
			this.impLevelHeaded = true
		} else if (this.tactician && this.mastertactician) {
			this.tactician = false
			this.mastertactician = false
		}
	}


	toggleQuick() {
		this.quick = !this.quick
		if (this.quick) {
			this.hesitant = false
		}
	}

	toggleHesitant() {
		this.hesitant = !this.hesitant
		if (this.hesitant) {
			this.quick = false
			this.levelHeaded = false
			this.impLevelHeaded = false
		}
	}

	bestCard(): number {
		if (this.hand.length===0) return -1
		const high = this.highCard()
		if (this.hand.includes(this.choosencard)){
			if (!this.hesitant || this.choosencard!=high){
			  return this.choosencard				
			}
		}
		if (this.hesitant) {
			return this.lowCard()
		} else {
			return high
		}
	}

	highCard(): number {
		if (this.hand.length > 0) {
			const high = this.hand.reduce((max, current) =>
				max > current ? max : current)
			return high
		}
		return 1
	}

	lowCard(): number {
		if (this.hand.length > 0) {
			if (this.hasJoker()) {
				const joker = this.hand.reduce((j, current) =>
					Card.isJoker(j) ? j : current)
				return joker
			}
			const low = this.hand.reduce((min, current) =>
				min < current ? min : current)
			return low
		}
		return -1
	}

	drawCard() {
		Deck.getInstance().dealFromTop(this.hand, 1, Facing.Up)
	}

	drawInitiative() {
		let deck = Deck.getInstance()
		let p = this
		p.choosencard=-1
		if (p.hesitant) {
			p.quick = false
			p.levelHeaded = false
			p.impLevelHeaded = false
		}
		if (p.onHold)
			return
		deck.moveToDiscardPool(p.hand)
		if (p.outOfCombat)
			return
		deck.dealFromTop(p.hand, 1, Facing.Up)
		if (p.impLevelHeaded)
			deck.dealFromTop(p.hand, 1, Facing.Up)
		if (p.levelHeaded || p.impLevelHeaded || p.hesitant)
			deck.dealFromTop(p.hand, 1, Facing.Up)
		if (p.quick)
			while (deck.drawdeck.length>0 && p.hand.every(c => Card.byId(c).rank <= 5)) {
				deck.dealFromTop(p.hand, 1, Facing.Up)
			}
	}

	drawInterlude() {
		let deck = Deck.getInstance()
		let p = this
		p.choosencard=-1
		deck.moveToDiscardPool(p.hand)
		deck.dealFromTop(p.hand, 1, Facing.Up)
	}

	discardHand() {
		let deck = Deck.getInstance()
		let p = this
		deck.moveToDiscardPool(p.hand, 0)
	}

	hasJoker(): boolean {
		return this.hand.some(c => c > 52);
	}

	countJoker(): number {
		return this.hand.filter(c => c > 52).length
	}

	static getPlayer(but: HTMLButtonElement): Player {
		let element = but as HTMLElement
		let pid = element.getAttribute('data-pid')
		while (!pid && element) {
			element = element.parentElement as HTMLElement
			pid = element.getAttribute('data-pid')
		}
		let p = Deck.getInstance().getPlayer(pid)
		return p
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
		playerdiv.classList.add(Card.relcard[0])
		const carddiv = doc.createElement('div') as HTMLDivElement
		carddiv.classList.add("flex-item-2")
		carddiv.classList.add(...Card.concard)
		fieldset.appendChild(playerdiv)
		fieldset.appendChild(carddiv)
		container.appendChild(fieldset)

		const drawcard = ButtonFactory.getButton("drawcard", "Draw a Card", "card-pickup", "") //this.id)
		drawcard.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			p.drawCard()
			p.updateOBR()
			const deck = Deck.getInstance()
			deck.updateOBR()
			deck.renderDeck()
		})
		playerdiv.appendChild(drawcard)

		if (Deck.getInstance().isGM) {
			const drawhand = ButtonFactory.getButton("drawhand", "Draw Hand", "poker-hand", "") //this.id)
			drawhand.addEventListener('click', function () {
				let p = Player.getPlayer(this)
				p.drawInitiative()
				p.updateOBR()
				const deck = Deck.getInstance()
				deck.updateOBR()
				deck.renderDeck()
			})
			playerdiv.appendChild(drawhand)
		}

		// if (Deck.getInstance().isGM) {
		// 	const choose = ButtonFactory.getButton("choose", "Choose Card", "card-pick", "") //this.id)
		// 	if (this.canchoose) choose.classList.add("btn-success")
		// 	choose.addEventListener('click', function (event) {
		// 		let p = Player.getPlayer(this)
		// 		p.canchoose = !p.canchoose
		// 		ButtonFactory.toggle(event)
		// 		p.updateOBR()
		// 		const deck = Deck.getInstance()
		// 		deck.updateOBR()
		// 		deck.renderDeck()
		// 	})
		// 	playerdiv.appendChild(choose)
		// }

		if (Deck.getInstance().isGM) {
			const discardhand = ButtonFactory.getButton("discardhand", "Discard Hand", "hand-discard", "") //this.id)
			discardhand.addEventListener('click', function () {
				let p = Player.getPlayer(this)
				const deck = Deck.getInstance()
				deck.moveToDiscardPool(p.hand, 0)
				p.updateOBR()
				deck.updateOBR()
				deck.renderDeck()
			})
			playerdiv.appendChild(discardhand)
		}

		if (Deck.getInstance().isGM) {
			const rp = ButtonFactory.getButton("rp", "Remove Player", "trash-can", this.id)
			rp.classList.add("btn-danger")
			rp.addEventListener('click', function () {
				let p = Player.getPlayer(this)
				p.removeRender()
				Deck.getInstance().removePlayer(p)
				const deck = Deck.getInstance()
				deck.updateOBR()
				deck.renderDeck()
			})
			playerdiv.appendChild(rp)
		}

		const outcombat = ButtonFactory.getButton("outcombat", "Out of Combat", "truce", "") //this.id)
		if (this.outOfCombat) outcombat.classList.add("btn-success")
		outcombat.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.outOfCombat = !p.outOfCombat
			p.updateOBR()
			if (p.outOfCombat) {
				p.discardHand()
				Deck.getInstance().updateOBR()
			}
			ButtonFactory.toggle(event)
			const deck = Deck.getInstance()
			deck.updateOBR()
			deck.renderDeck()
		})
		playerdiv.appendChild(outcombat)

		const onhold = ButtonFactory.getButton("onhold", "On Hold", "halt", "") //this.id)
		if (this.onHold) onhold.classList.add("btn-success")
		onhold.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.onHold = !p.onHold
			ButtonFactory.toggle(event)
			p.updateOBR()
			const deck = Deck.getInstance()
			deck.updateOBR()
			deck.renderDeck()
		})
		playerdiv.appendChild(onhold)

		const hesitant = ButtonFactory.getButton("hesitant", "Hesitant Hindrance", "uncertainty", "") //this.id)
		if (this.hesitant) hesitant.classList.add("btn-success")
		hesitant.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.toggleHesitant()
			ButtonFactory.toggle(event)
			p.updateOBR()
			const deck = Deck.getInstance()
			deck.updateOBR()
			deck.renderDeck()
		})
		playerdiv.appendChild(hesitant)

		const quick = ButtonFactory.getButton("quick", "Quick Edge", "sprint", "") //this.id)
		if (this.quick) quick.classList.add("btn-success")
		quick.addEventListener('click', function (event) {
			let p = Player.getPlayer(this)
			p.toggleQuick()
			ButtonFactory.toggle(event)
			p.updateOBR()
			const deck = Deck.getInstance()
			deck.updateOBR()
			deck.renderDeck()
		})
		playerdiv.appendChild(quick)

		// const tacttype = (this.mastertactician) ? "aces" : "ace"
		// const tactician = ButtonFactory.getButton("tactician", "Tactician", tacttype, "")  
		// if (this.tactician || this.mastertactician) tactician.classList.add("btn-success")
		// tactician.addEventListener('click', function () {
		// 	let p = Player.getPlayer(this)
		// 	p.toggleTactician()
		// 	p.updateOBR()
		// 	const deck = Deck.getInstance()
		// 	deck.updateOBR()
		// 	deck.renderDeck()
		// })
		// playerdiv.appendChild(tactician)

		const lvlheadtype = (this.impLevelHeaded) ? "scales-exclaim" : "scales"
		const levelhead = ButtonFactory.getButton("levelhead", "Level Headed Edge", lvlheadtype, "")
		if (this.levelHeaded || this.impLevelHeaded) levelhead.classList.add("btn-success")
		levelhead.addEventListener('click', function () {
			let p = Player.getPlayer(this)
			p.toggleLevelHeaded()
			p.updateOBR()
			const deck = Deck.getInstance()
			deck.updateOBR()
			deck.renderDeck()
		})
		playerdiv.appendChild(levelhead)

		let inc = Util.rem2px(Card.cardSpread())
		if (this.hand.length > 12) {
			inc = Math.trunc(inc / 4)
		} else if (this.hand.length > 6) {
			inc = Math.trunc(inc / 2)
		}

		for (const c of this.hand) {
			const card = Card.byId(c)
			const csvg = card.render(carddiv, x, y, Facing.Up)
			const picked = (card.sequence === this.choosencard)
			if (picked) {
				csvg.classList.add("choosen")
			} else {
				csvg.addEventListener('click', () => {
					const deck = Deck.getInstance()
					const p = this
					p.choosencard = card.sequence
					p.updateOBR()
					deck.updateOBR()
					deck.renderDeck()
				})
			}
			x = x + inc
		}
	}

	async updateOBR() {
		try {
			await OBR.scene.items.updateItems(
				(item) =>
					item.layer === "CHARACTER" &&
					isImage(item) &&
					item.metadata[Util.PlayerMkey] != undefined,
				(characters) => {
					for (let character of characters) {
						let pmd = character.metadata[Util.PlayerMkey] as PlayerMeta
						if (pmd.id === this.id) {
							character.metadata[Util.PlayerMkey] = this.getMeta
						}
					}
				}
			);
		} catch (error) {
			console.error("Failed to remove metadata from character:", error);
		}
	}

	async removeOBR() {
		try {
			// Update the item with the given characterId
			await OBR.scene.items.updateItems(
				(item) =>
					item.layer === "CHARACTER" &&
					isImage(item) &&
					item.metadata[Util.PlayerMkey] != undefined,
				(characters) => {
					for (let character of characters) {
						let pmd = character.metadata[Util.PlayerMkey] as PlayerMeta
						if (pmd.id === this.id) {
							delete character.metadata[Util.PlayerMkey]
						}
					}
				}
			);
		} catch (error) {
			console.error("Failed to remove metadata from character:", error);
		}
	}
}