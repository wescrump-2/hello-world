import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { Card, Facing } from "./cards";
import { Deck } from "./deck";
import { Util } from "./util";

export enum LevelHeaded {
	None = 0,
	LevelHeaded = 1,
	ImpLevelHeaded = 2
}

export interface PlayerMeta {
	hand: number[];
	id: string;
	playerId: string;
	name: string;
	owner: string;
	onHold: boolean;
	outOfCombat: boolean;
	levelHeaded: boolean;
	impLevelHeaded: boolean;
	tactician: boolean;
	mastertactician: boolean;
	quick: boolean;
	canchoose: boolean;
	hesitant: boolean;
}

export class PlayerChar {
	private meta: PlayerMeta;

	constructor(name: string, id: string, pid: string) {
		this.meta = {
			hand: [],
			id: id,
			playerId: pid,
			name: name,
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
		};
	}

	// Getters and Setters
	get hand(): number[] { return this.meta.hand; }
	set hand(newHand: number[]) { this.meta.hand = newHand; }
	get id(): string { return this.meta.id; }
	get playerId(): string { return this.meta.playerId; }
	get name(): string { return this.meta.name; }
	set name(newName: string) { this.meta.name = newName; }
	get owner(): string { return this.meta.owner; }
	set owner(newOwner: string) { this.meta.owner = newOwner; }
	get onHold(): boolean { return this.meta.onHold; }
	set onHold(newOnHold: boolean) { this.meta.onHold = newOnHold; }
	get outOfCombat(): boolean { return this.meta.outOfCombat; }
	set outOfCombat(newOutOfCombat: boolean) { this.meta.outOfCombat = newOutOfCombat; }
	get levelHeaded(): boolean { return this.meta.levelHeaded; }
	set levelHeaded(newLevelHeaded: boolean) { this.meta.levelHeaded = newLevelHeaded; }
	get impLevelHeaded(): boolean { return this.meta.impLevelHeaded; }
	set impLevelHeaded(newImpLevelHeaded: boolean) { this.meta.impLevelHeaded = newImpLevelHeaded; }
	get tactician(): boolean { return this.meta.tactician; }
	set tactician(newTactician: boolean) { this.meta.tactician = newTactician; }
	get mastertactician(): boolean { return this.meta.mastertactician; }
	set mastertactician(newMasterTactician: boolean) { this.meta.mastertactician = newMasterTactician; }
	get quick(): boolean { return this.meta.quick; }
	set quick(newQuick: boolean) { this.meta.quick = newQuick; }
	get canchoose(): boolean { return this.meta.canchoose; }
	set canchoose(newCanChoose: boolean) { this.meta.canchoose = newCanChoose; }
	get hesitant(): boolean { return this.meta.hesitant; }
	set hesitant(newHesitant: boolean) { this.meta.hesitant = newHesitant; }
	get getMeta(): PlayerMeta { return { ...this.meta }; }
	set setMeta(newMeta: PlayerMeta) { this.meta = newMeta; }

	// Methods
	toggleLevelHeaded() {
		if (this.impLevelHeaded) {
			this.levelHeaded = this.impLevelHeaded = false;
		} else if (!this.levelHeaded) {
			this.levelHeaded = true;
			this.hesitant = false;
		} else {
			this.levelHeaded = false;
			this.impLevelHeaded = true;
			this.hesitant = false;
		}
	}

	toggleTactician() {
		if (this.mastertactician) {
			this.tactician = this.mastertactician = false;
		} else if (!this.tactician) {
			this.tactician = true;
			this.mastertactician = false;
		} else {
			this.tactician = false;
			this.mastertactician = true;
		}
	}

	toggleQuick() {
		this.quick = !this.quick;
		if (this.quick) this.hesitant = false;
	}

	toggleHesitant() {
		this.hesitant = !this.hesitant;
		if (this.hesitant) {
			this.quick = this.levelHeaded = this.impLevelHeaded = false;
		}
	}

	bestCard(): number {
		if (this.hand.length === 0) return -1;
		
		if (this.hesitant) {
			return this.lowCard()
		}
		const high = this.highCard()
		let best = -1 //no card is -1
		let found = false
		for (let pc of Deck.getInstance().chosenList.filter(p => this.hand.includes(p.chosenCard))) {
			if (pc.chosenCard > best) {
				best = pc.chosenCard
				found = true
			}
		}
		if (!found) {
			best = high;
		}
		return best
	}

	highCard(): number {
		return this.hand.length ? Math.max(...this.hand) : 1;
	}

	lowCard(): number {
		if (this.hand.length === 0) return -1;
		return this.hasJoker() ? this.hand.find(Card.isJoker) ?? Math.min(...this.hand) : Math.min(...this.hand);
	}

	drawCard() {
		Deck.getInstance().dealFromTop(this.hand, 1, Facing.Up);
	}

	drawInitiative() {
		const deck = Deck.getInstance();

		if (this.hesitant) {
			this.quick = this.levelHeaded = this.impLevelHeaded = false;
		}
		if (!this.onHold) {
			//remove any selected cards
			deck.removeChoiceCards(this.hand)
			this.discardHand();
			if (!this.outOfCombat) {
				deck.dealFromTop(this.hand, 1, Facing.Up);
				if (this.impLevelHeaded) deck.dealFromTop(this.hand, 1, Facing.Up);
				if (this.levelHeaded || this.impLevelHeaded || this.hesitant) deck.dealFromTop(this.hand, 1, Facing.Up);
				if (this.quick) {
					while (deck.drawdeck.length > 0 && this.hand.every(c => Card.byId(c).rank <= 5)) {
						deck.dealFromTop(this.hand, 1, Facing.Up);
					}
				}
			}
		}
	}

	drawInterlude() {
		const deck = Deck.getInstance();
		this.discardHand();
		deck.dealFromTop(this.hand, 1, Facing.Up);
	}

	discardHand() {
		const deck = Deck.getInstance();
		deck.removeChoiceCards(this.hand)
		deck.moveToDiscardPool(this.hand, 0);
	}

	hasJoker(): boolean {
		return this.hand.some(c => c > 52);
	}

	countJoker(): number {
		return this.hand.filter(c => c > 52).length;
	}

	passCardToPlayer(card: number) {
		const deck = Deck.getInstance()
		const from = deck.getDeckwithCard(card)
		if (from && !this.hand.includes(card)) {
			deck.moveCardToPool(this.hand, from, card)
		}
	}

	static getPlayer(element: HTMLElement): PlayerChar | null {
		//let element = but as HTMLElement;
		while (element) {
			const pid = element.dataset.pid;
			if (pid) {
				let p = Deck.getInstance().getPlayerById(pid)
				if (p) {
					return p
				}
			}
			element = element.parentElement as HTMLElement;
		}
		//console.error('Player ID not found in element attributes')
		return null
	}

	getPlayerById(pid: string): PlayerChar | null {
		return Deck.getInstance().getPlayerById(pid)
	}

	async render(container: HTMLDivElement, x: number, y: number) {
		const obrPlayerId = await OBR.player.getId()
		const doc = container.ownerDocument;
		const deck = Deck.getInstance();
		let fieldset = doc.querySelector(`fieldset[data-pid="${this.id}"]`) as HTMLFieldSetElement
		if (!fieldset) {
			fieldset = doc.createElement('fieldset') as HTMLFieldSetElement
			const legend = doc.createElement('legend')
			legend.textContent = this.name;
			fieldset.appendChild(legend)
			fieldset.classList.add("flex-container")
			fieldset.title = this.name;
			fieldset.dataset.pid = this.id;
			let pdiv = doc.createElement('div') as HTMLDivElement
			pdiv.classList.add("flex-item-1", Card.relcard[0]);
			pdiv.dataset.slot = "b"
			fieldset.appendChild(pdiv)
			let cdiv = doc.createElement('div') as HTMLDivElement;
			cdiv.classList.add("flex-item-2", ...Card.concard);
			cdiv.dataset.slot = "c"
			fieldset.appendChild(cdiv)
			container.appendChild(fieldset)
		}
		let playerdiv = fieldset.children[1] as HTMLDivElement
		let carddiv = fieldset.children[2] as HTMLDivElement
		// GM-only actions
		const isOwner = this.playerId === obrPlayerId
		const isGMorOwner = deck.isGM || isOwner
		// Draw Card Button
		let drawcard = playerdiv.querySelector('#drawcard') as HTMLButtonElement
		if (!drawcard) {
			drawcard = Util.getButton(playerdiv, "drawcard", "Draw a Card", "card-pickup", "") //this.id)
			drawcard.addEventListener('click', function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					p.drawCard()
					deck.updateOBR()
				}
			})
			playerdiv.appendChild(drawcard)
		}
		drawcard.style.display = Util.display(isGMorOwner)

		let drawhand = playerdiv.querySelector('#drawhand') as HTMLButtonElement
		if (!drawhand) {
			drawhand = Util.getButton(playerdiv, "drawhand", "Draw Hand", "poker-hand", "") //this.id)
			drawhand.addEventListener('click', function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					p.drawInitiative()
					deck.updateOBR()
				}
			})
			playerdiv.appendChild(drawhand)
		}
		drawhand.style.display = Util.display(deck.isGM)

		let discardhand = playerdiv.querySelector('#discardhand') as HTMLButtonElement
		if (!discardhand) {
			discardhand = Util.getButton(playerdiv, "discardhand", "Discard Hand", "hand-discard", "")
			discardhand.addEventListener('click', function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					if (p.hand.length === 0) {
						return
					}
					p.discardHand()
					deck.updateOBR()
				}
			})
			playerdiv.appendChild(discardhand)
		}
		discardhand.style.display = Util.display(isGMorOwner)

		let outcombat = playerdiv.querySelector('#outcombat') as HTMLButtonElement
		if (!outcombat) {
			outcombat = Util.getButton(playerdiv, "outcombat", "Out of Combat", "truce", "") //this.id)
			outcombat.addEventListener('click', function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					p.outOfCombat = !p.outOfCombat
					Util.setState(this, p.outOfCombat)
					if (p.outOfCombat) {
						p.discardHand()
					}
					deck.updateOBR()
				}
			})
			playerdiv.appendChild(outcombat)
		}
		Util.setState(outcombat, this.outOfCombat)
		outcombat.style.display = Util.display(isGMorOwner)


		let rembut = playerdiv.querySelector('#removeplayer') as HTMLButtonElement
		if (!rembut) {
			rembut = Util.getButton(playerdiv, "removeplayer", "Remove Player", "trash-can", this.id)
			rembut.addEventListener('click', async function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					deck.removePlayer(p)
					//p.removeOBR()
					await deck.updateOBR().then(() => {
						deck.renderDeck()
					})
				}
			})
			playerdiv.appendChild(rembut)
		}
		rembut.style.display = Util.display(isGMorOwner)

		let onhold = playerdiv.querySelector('#onhold') as HTMLButtonElement
		if (!onhold) {
			onhold = Util.getButton(playerdiv, "onhold", "On Hold", "halt", "") //this.id)
			onhold.addEventListener('click', function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					p.onHold = !p.onHold
					Util.setState(this, p.onHold)
					deck.updateOBR()
				}
			})
			playerdiv.appendChild(onhold)
		}
		Util.setState(onhold, this.onHold)
		onhold.style.display = Util.display(isGMorOwner)

		let hesitant = playerdiv.querySelector('#hesitant') as HTMLButtonElement
		if (!hesitant) {
			hesitant = Util.getButton(playerdiv, "hesitant", "Hesitant Hindrance", "uncertainty", "")
			hesitant.addEventListener('click', function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					p.toggleHesitant()
					Util.setState(this, p.hesitant)
					const hes = this.parentElement?.querySelector('#quick') as HTMLButtonElement
					Util.setState(hes, p.quick)
					const lh = this.parentElement?.querySelector('#levelhead') as HTMLButtonElement
					Util.setState3way(lh, p.levelHeaded, 'scales', p.impLevelHeaded, 'scales-exclaim')
					deck.updateOBR()
				}
			})
			playerdiv.appendChild(hesitant)
		}
		Util.setState(hesitant, this.hesitant)
		hesitant.style.display = Util.display(isGMorOwner)

		let quick = playerdiv.querySelector('#quick') as HTMLButtonElement
		if (!quick) {
			quick = Util.getButton(playerdiv, "quick", "Quick Edge", "sprint", "") //this.id)
			quick.addEventListener('click', function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					p.toggleQuick()
					Util.setState(this, p.quick)
					const hes = this.parentElement?.querySelector('#hesitant') as HTMLButtonElement
					Util.setState(hes, p.hesitant)
					deck.updateOBR()
				}
			})
			playerdiv.appendChild(quick)
		}
		Util.setState(quick, this.quick)
		quick.style.display = Util.display(isGMorOwner)

		// const tacttype = (this.mastertactician) ? "aces" : "ace"
		// let tactician = playerdiv.querySelector('#tactician') as HTMLButtonElement
		// if (!tactician) {
		// 	tactician = Util.getButton(playerdiv, "tactician", "Tactician", tacttype, "")
		// 	tactician.addEventListener('click', function () {
		// 		let p = PlayerChar.getPlayer(this)
		// 		if (p) {
		// 			p.toggleTactician()
		// 			Util.setState3way(tactician, p.levelHeaded, 'ace', p.impLevelHeaded, 'aces')
		// 			p.updateOBR()
		// 			const deck = Deck.getInstance()
		// 			deck.updateOBR()
		// 		}
		// 	})
		// 	playerdiv.appendChild(tactician)
		// }
		// Util.setState3way(tactician, this.tactician, "ace", this.mastertactician, "aces")
		// tactician.style.display = Util.display(isGMorOwner)

		const lvlheadtype = (this.impLevelHeaded) ? "scales-exclaim" : "scales"
		let levelhead = playerdiv.querySelector('#levelhead') as HTMLButtonElement
		if (!levelhead) {
			levelhead = Util.getButton(playerdiv, "levelhead", "Level Headed Edge", lvlheadtype, "")
			levelhead.addEventListener('click', function () {
				let p = PlayerChar.getPlayer(this)
				const deck = Deck.getInstance()
				if (p) {
					p.toggleLevelHeaded()
					Util.setState3way(this, p.levelHeaded, 'scales', p.impLevelHeaded, 'scales-exclaim')
					const hes = this.parentElement?.querySelector('#hesitant') as HTMLButtonElement
					Util.setState(hes, p.hesitant)
					deck.updateOBR()
				}
			})
			playerdiv.appendChild(levelhead)
		}
		Util.setState3way(levelhead, this.levelHeaded, "scales", this.impLevelHeaded, "scales-exclaim")
		levelhead.style.display = Util.display(isGMorOwner)

		let info = playerdiv.querySelector('#info') as HTMLButtonElement
		if (!info) {
			info = Util.getButton(playerdiv, "info", "Interludes", "suits", "")
			info.addEventListener('click', function (event) {
				const p = PlayerChar.getPlayer(this);
				if (p) {
					const suit = Card.byId(p.bestCard()).suit.toString().replace("Red", "").replace("Black", "")
					OBR.popover.open({
						id: `${Util.ID}/interlude`,
						url: `/interludes.html#${suit}`,
						height: 400,
						width: 600,
					})
				}
				event.preventDefault()
			})
			playerdiv.appendChild(info)
		}
		info.style.display = Util.display(isOwner)


		let pass = playerdiv.querySelector('#pass') as HTMLButtonElement
		if (!pass) {
			pass = Util.getButton(playerdiv, "pass", "Pass your selected card to here", "card-play", this.id)
			pass.addEventListener('click', async function (event) {
				const deck = Deck.getInstance()
				const but = event.currentTarget as HTMLButtonElement
				const to = deck.getPlayerById(but.dataset.pid + '')
				if (to != null) {
					const chosen = deck.getPlayerChoices(obrPlayerId)
					for (let pc of chosen) {
						to.passCardToPlayer(pc.chosenCard)
						deck.removeChoiceCards([pc.chosenCard])
						await deck.updateOBR().then(() => {
							deck.renderDeck()
						})
					}
				}
				event.preventDefault()
			})
			playerdiv.appendChild(pass)
		}
		pass.style.display = Util.display(true)

		// remove cards
		while (carddiv.firstChild) {
			carddiv.removeChild(carddiv.firstChild)
		}
		// add cards
		let inc = Util.offset('--card-spread-inc', this.hand.length)
		this.hand.forEach(cardSeq => {
			const card = Card.byId(cardSeq);
			const csvg = card.render(carddiv, x, y, Facing.Up);
			if (deck.chosenList.find(c => c.chosenCard === card.sequence)) csvg.classList.add("chosen");
			if (isGMorOwner) {
				csvg.addEventListener('click', async () => {
					const ownid = await OBR.player.getId();
					deck.togglePlayerChoice(ownid, card.sequence)
					await deck.updateOBR().then(() => {
						deck.renderDeck()
					})
				});
			}
			x += inc;
		});
	}

	async updateOBR() {
		try {
			await OBR.scene.items.updateItems(
				item => item.layer === "CHARACTER" && isImage(item) && item.metadata[Util.PlayerMkey] !== undefined,
				characters => characters.forEach(char => {
					if ((char.metadata[Util.PlayerMkey] as PlayerMeta)?.id === this.id) {
						char.metadata[Util.PlayerMkey] = this.getMeta;
					}
				})
			).then(() => {
				//console.log(`updated character item ${this.id}`) 
			});
		} catch (error) {
			console.error("Failed to update character item in OBR:", error);
		}
	}

	async removeOBR() {
		try {
			await OBR.scene.items.updateItems(
				item => item.layer === "CHARACTER" && isImage(item) && item.metadata[Util.PlayerMkey] !== undefined,
				characters => characters.forEach(char => {
					if ((char.metadata[Util.PlayerMkey] as PlayerMeta)?.id === this.id) {
						delete char.metadata[Util.PlayerMkey];
						//console.log(`deleted character item ${this.id}`)
					}
				})
			)
		} catch (error) {
			console.error("Failed to remove character item from scene:", error);
		}
	}
}