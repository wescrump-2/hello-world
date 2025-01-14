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
	choosencard: number;
}

export class Player {
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
			choosencard: -1,
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
	get choosencard(): number { return this.meta.choosencard; }
	set choosencard(newChooseCard: number) { this.meta.choosencard = newChooseCard; }
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
			this.impLevelHeaded = false;  // Assuming this is intentional from your logic
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
		const high = this.highCard();
		if (this.hand.includes(this.choosencard) && (!this.hesitant || this.choosencard !== high)) {
			return this.choosencard;
		}
		return this.hesitant ? this.lowCard() : high;
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
		this.choosencard = -1;
		if (this.hesitant) {
			this.quick = this.levelHeaded = this.impLevelHeaded = false;
		}
		if (!this.onHold) {
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
		this.choosencard = -1;
		Deck.getInstance().moveToDiscardPool(this.hand, 0);
	}

	hasJoker(): boolean {
		return this.hand.some(c => c > 52);
	}

	countJoker(): number {
		return this.hand.filter(c => c > 52).length;
	}

	static getPlayer(but: HTMLButtonElement): Player {
		let element = but as HTMLElement;
		while (element) {
			const pid = element.dataset.pid;
			if (pid) {
				return Deck.getInstance().getPlayer(pid)!
			}
			element = element.parentElement as HTMLElement;
		}
		throw new Error('Player ID not found in element attributes');
	}

	//removeRender() {
		// var fs;
		// while (fs = document.querySelector<HTMLFieldSetElement>(`fieldset[data-pid="${this.id}"]`) as HTMLFieldSetElement) {
		// 	fs?.remove();
		// 	console.trace(`removing:${this.id}`);
		// }
	//}


	async render(container: HTMLDivElement, x: number, y: number) {
		const obrPlayerId = await OBR.player.getId().then(data => data);
		const doc = container.ownerDocument;
		let fieldset = doc.querySelector(`fieldset[data-pid="${this.id}"]`) as HTMLFieldSetElement
		if (!fieldset) {
			fieldset = doc.createElement('fieldset') as HTMLFieldSetElement
			const legend = doc.createElement('legend')
			legend.textContent = this.name;
			fieldset.appendChild(legend)
			fieldset.classList.add("flex-container")
			fieldset.title = this.name;
			fieldset.dataset.pid = this.id;
			const pdiv = doc.createElement('div') as HTMLDivElement
			pdiv.classList.add("flex-item-1", Card.relcard[0]);
			pdiv.dataset.slot = "b"
			fieldset.appendChild(pdiv)
			const cdiv = doc.createElement('div') as HTMLDivElement;
			cdiv.classList.add("flex-item-2", ...Card.concard);
			cdiv.dataset.slot = "c"
			fieldset.appendChild(cdiv)
			container.appendChild(fieldset)
		}
		const playerdiv = fieldset.querySelector('div[data-slot="b"]') as HTMLDivElement
		const carddiv = fieldset.querySelector('div[data-slot="c"]') as HTMLDivElement

		const deck = Deck.getInstance();
		// GM-only actions
		const isGM = deck.isGM;
		const isPlayer = isGM || this.playerId === obrPlayerId
		// Draw Card Button
		if (isPlayer) {
			// this.createButton(playerdiv, "drawcard", "Draw a Card", "card-pickup", (p) => p.drawCard());
			let drawcard = playerdiv.querySelector('#drawcard') as HTMLButtonElement
			if (!drawcard) {
				drawcard = Util.getButton("drawcard", "Draw a Card", "card-pickup", "") //this.id)
				drawcard.addEventListener('click', function () {
					let p = Player.getPlayer(this)
					const deck = Deck.getInstance()
					p.drawCard()
					p.updateOBR()
					deck.updateOBR()
					//deck.renderDeck() 
				})
				playerdiv.appendChild(drawcard)
			}
		}

		if (isGM) {
			// this.createButton(playerdiv, "drawhand", "Draw Action cards", "poker-hand", (p) => p.drawInitiative());
			let drawhand = playerdiv.querySelector('#drawhand') as HTMLButtonElement
			if (!drawhand) {
				drawhand = Util.getButton("drawhand", "Draw Hand", "poker-hand", "") //this.id)
				drawhand.addEventListener('click', function () {
					let p = Player.getPlayer(this)
					const deck = Deck.getInstance()
					p.drawInitiative()
					p.updateOBR()
					deck.updateOBR()
					//deck.renderDeck()
				})
				playerdiv.appendChild(drawhand)
			}
		}

		if (isPlayer) {
			// this.createButton(playerdiv, "discardhand", "Discard Hand", "hand-discard", (p) => deck.moveToDiscardPool(p.hand, 0));
			let discardhand = playerdiv.querySelector('#discardhand') as HTMLButtonElement
			if (!discardhand) {
				const discardhand = Util.getButton("discardhand", "Discard Hand", "hand-discard", "") //this.id)
				discardhand.addEventListener('click', function () {
					let p = Player.getPlayer(this)
					if (p.hand.length === 0)
						return
					const deck = Deck.getInstance()
					p.discardHand()
					p.updateOBR()
					deck.updateOBR()
					//deck.renderDeck()
				})
				playerdiv.appendChild(discardhand)
			}
		}

		if (isPlayer) {
			// this.createButton(playerdiv, "outcombat", "Out of Combat", "truce", (p: Player, event: Event | undefined) => {
			// 	p.outOfCombat = !p.outOfCombat;
			// 	if (p.outOfCombat) p.discardHand();
			// 	ButtonFactory.toggle(event!, "");
			// }, this.outOfCombat);
			let outcombat = playerdiv.querySelector('#outcombat') as HTMLButtonElement
			if (!outcombat) {
				outcombat = Util.getButton("outcombat", "Out of Combat", "truce", "") //this.id)
				outcombat.addEventListener('click', function (event) {
					let p = Player.getPlayer(this)
					const deck = Deck.getInstance()
					p.outOfCombat = !p.outOfCombat
					Util.setState(event,p.outOfCombat)
					if (p.outOfCombat) {
						p.discardHand()
						//deck.updateOBR()
					}
					p.updateOBR()
					deck.updateOBR()
					//deck.renderDeck()
				})
				playerdiv.appendChild(outcombat)
			}
			if (this.outOfCombat) outcombat.classList.add(Util.SUCCESS_CLASS)
		}

		if (isPlayer) {
			// this.createButtonrp(playerdiv, "rp", "Remove Player", "trash-can", (p) => {
			// 	p.removeRender();
			// 	deck.removePlayer(p);
			// 	deck.updateOBR();
			// 	deck.renderDeck();
			// });
			//removePlayer.classList.add("btn-danger");

			let removeplayer = playerdiv.querySelector('#removeplayer') as HTMLButtonElement
			if (!removeplayer) {
				removeplayer = Util.getButton("removeplayer", "Remove Player", "trash-can", this.id)

				removeplayer.addEventListener('click', function () {
					let p = Player.getPlayer(this)
					const deck = Deck.getInstance()
					//p.removeRender()
					deck.removePlayer(p)
					deck.updateOBR()
					//deck.renderDeck()
				})
				playerdiv.appendChild(removeplayer)
			}
			removeplayer.classList.add("btn-danger")
		}
		if (isPlayer) {
			// Player state toggles
			// this.createButton(playerdiv, "onhold", "On Hold", "halt", (p, event) => {
			// 	p.onHold = !p.onHold;
			// 	ButtonFactory.toggle(event!, "");
			// }, this.onHold);
			let onhold = playerdiv.querySelector('#onhold') as HTMLButtonElement
			if (!onhold) {
				onhold = Util.getButton("onhold", "On Hold", "halt", "") //this.id)

				onhold.addEventListener('click', function (event) {
					let p = Player.getPlayer(this)
					const deck = Deck.getInstance()
					p.onHold = !p.onHold
					Util.setState(event,p.onHold)
					p.updateOBR()
					deck.updateOBR()
					//deck.renderDeck()
				})
				playerdiv.appendChild(onhold)
			}
			if (this.onHold) onhold.classList.add(Util.SUCCESS_CLASS)
		}
		if (isPlayer) {
			// this.createButton(playerdiv, "hesitant", "Hesitant Hindrance", "uncertainty", (p, event) => {
			// 	p.toggleHesitant();
			// 	ButtonFactory.toggle(event!, "");
			// }, this.hesitant);
			let hesitant = playerdiv.querySelector('#hesitant') as HTMLButtonElement
			if (!hesitant) {
				hesitant = Util.getButton("hesitant", "Hesitant Hindrance", "uncertainty", "") //this.id)

				hesitant.addEventListener('click', function (event) {
					let p = Player.getPlayer(this)
					const deck = Deck.getInstance()
					p.toggleHesitant()
					Util.setState(event,p.hesitant)
					Util.setState(event,p.quick)
					p.updateOBR()
					deck.updateOBR()
					//deck.renderDeck()
				})
				playerdiv.appendChild(hesitant)
			}
			if (this.hesitant) hesitant.classList.add(Util.SUCCESS_CLASS)
		}
		if (isPlayer) {
			// this.createButton(playerdiv, "quick", "Quick Edge", "sprint", (p, event) => {
			// 	p.toggleQuick();
			// 	ButtonFactory.toggle(event!, "");
			// }, this.quick);
			let quick = playerdiv.querySelector('#quick') as HTMLButtonElement
			if (!quick) {
				quick = Util.getButton("quick", "Quick Edge", "sprint", "") //this.id)

				quick.addEventListener('click', function (event) {
					let p = Player.getPlayer(this)
					const deck = Deck.getInstance()
					p.toggleQuick()
					Util.setState(event,p.quick)
					Util.setState(event,p.hesitant)
					p.updateOBR()
					deck.updateOBR()
					//deck.renderDeck()
				})
				playerdiv.appendChild(quick)
			}
			if (this.quick) quick.classList.add(Util.SUCCESS_CLASS)
		}

		// if (isPlayer) {
		// 	const tacttype = (this.mastertactician) ? "aces" : "ace"
		// 	let tactician = playerdiv.querySelector('#tactician') as HTMLButtonElement
		// 	if (!tactician) {
		// 		tactician = Util.getButton("tactician", "Tactician", tacttype, "")
		// 		tactician.addEventListener('click', function (event) {
		// 			let p = Player.getPlayer(this)
		// 			p.toggleTactician()
		// 			Util.setState3way(event,p.levelHeaded,'ace',p.impLevelHeaded,'aces')
					
		// 			p.updateOBR()
		// 			const deck = Deck.getInstance()
		// 			deck.updateOBR()
		// 			//deck.renderDeck()
		// 		})
		// 		playerdiv.appendChild(tactician)
		// 	}
		// 	Util.setImage(tacttype, tactician)
		// 	if (this.tactician || this.mastertactician) tactician.classList.add(Util.SUCCESS_CLASS)
		// }

		if (isPlayer) {
			// const lvlHeadedType = this.impLevelHeaded ? "scales-exclaim" : "scales";
			// this.createButton(playerdiv, "levelhead", "Level Headed Edge", lvlHeadedType, (p) => {
			// 	p.toggleLevelHeaded();
			// }, this.levelHeaded || this.impLevelHeaded);

			const lvlheadtype = (this.impLevelHeaded) ? "scales-exclaim" : "scales"
			let levelhead = playerdiv.querySelector('#levelhead') as HTMLButtonElement
			if (!levelhead) {
				levelhead = Util.getButton("levelhead", "Level Headed Edge", lvlheadtype, "")
				levelhead.addEventListener('click', function (event) {
					let p = Player.getPlayer(this)
					const deck = Deck.getInstance()
					p.toggleLevelHeaded()
					Util.setState3way(event,p.levelHeaded,'scales',p.impLevelHeaded,'scales-exclaim')
					p.updateOBR()
					deck.updateOBR()
					//deck.renderDeck()
				})
				playerdiv.appendChild(levelhead)
			}
			Util.setImage(lvlheadtype, levelhead)
			if (this.levelHeaded || this.impLevelHeaded) {
				levelhead.classList.add(Util.SUCCESS_CLASS)
			}
		}

		if (isPlayer) {
			let info = playerdiv.querySelector('#info') as HTMLButtonElement
			if (!info) {
				info = Util.getButton("info", "Interludes", "suits", "")
				info.addEventListener('click', function (event) {
					const p = Player.getPlayer(this);
					const suit = Card.byId(p.bestCard()).suit.toString().replace("Red", "").replace("Black", "")
					OBR.popover.open({
						id: `${Util.ID}/interlude`,
						url: `/interludes.html#${suit}`,
						height: 400,
						width: 600,
					})
					event.preventDefault()
				})
				playerdiv.appendChild(info)
			}
		}
		// remove cards
		while (carddiv.firstChild) {
			carddiv.removeChild(carddiv.firstChild)
		}
		// add cards
		let inc = Util.offset('--card-spread-inc', this.hand.length)
		this.hand.forEach(cardSeq => {
			const card = Card.byId(cardSeq);
			const csvg = card.render(carddiv, x, y, Facing.Up);
			if (card.sequence === this.choosencard) csvg.classList.add("choosen");
			csvg.addEventListener('click', () => {
				this.choosencard = this.choosencard === card.sequence ? -1 : card.sequence;
				this.updateOBR();
				deck.updateOBR();
				//deck.renderDeck();
			});
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
			).then(() => { console.log(`updated character item ${this.id}`) });
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
					}
				})
			).then(() => { console.log(`deleted character item ${this.id}`) });
		} catch (error) {
			console.error("Failed to remove character item from scene:", error);
		}
	}
}
