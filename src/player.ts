import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { ButtonFactory } from "./button";
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

	constructor(name: string) {
		this.meta = {
			hand: [],
			id: Util.shortUUID(),
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
			deck.moveToDiscardPool(this.hand);
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
		this.choosencard = -1;
		deck.moveToDiscardPool(this.hand);
		deck.dealFromTop(this.hand, 1, Facing.Up);
	}

	discardHand() {
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
			const pid = element.getAttribute('data-pid');
			if (pid) {
				return Deck.getInstance().getPlayer(pid)!
			}
			element = element.parentElement as HTMLElement;
		}
		throw new Error('Player ID not found in element attributes');
	}

	removeRender() {
		document.querySelector(`fieldset[data-pid="${this.id}"]`)?.remove();
	}


	render(container: HTMLDivElement, x: number, y: number) {
		const doc = container.ownerDocument;
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const legend = doc.createElement('legend') as HTMLLegendElement;

		// Setup fieldset
		legend.textContent = this.name;
		fieldset.appendChild(legend);
		fieldset.classList.add("flex-container");
		fieldset.title = this.name;
		fieldset.setAttribute('data-pid', this.id);

		// Create player and card divs
		const playerdiv = doc.createElement('div') as HTMLDivElement;
		playerdiv.classList.add("flex-item-1", Card.relcard[0]);
		const carddiv = doc.createElement('div') as HTMLDivElement;
		carddiv.classList.add("flex-item-2", ...Card.concard);

		fieldset.appendChild(playerdiv);
		fieldset.appendChild(carddiv);
		container.appendChild(fieldset);

		// Helper function to create buttons
		// const createButton = (id: string, title: string, imageKey: string, onClick: (p: Player, event?: Event) => void) => {
		// 	const button = ButtonFactory.getButton(id, title, imageKey, "");
		// 	button.addEventListener('click', function (event) {
		// 		const p = Player.getPlayer(this);
		// 		onClick(p, event);
		// 		p.updateOBR();
		// 		const deck = Deck.getInstance();
		// 		deck.updateOBR();
		// 		deck.renderDeck();
		// 	});
		// 	playerdiv.appendChild(button);
		// 	return button;
		// };

		// Draw Card Button
		this.createButton(playerdiv, "drawcard", "Draw a Card", "card-pickup", (p) => p.drawCard());

		// GM-only actions
		const deck = Deck.getInstance();
		if (deck.isGM) {
			this.createButton(playerdiv, "drawhand", "Draw Hand", "poker-hand", (p) => p.drawInitiative());
			this.createButton(playerdiv, "discardhand", "Discard Hand", "hand-discard", (p) => deck.moveToDiscardPool(p.hand, 0));
			this.createButton(playerdiv, "outcombat", "Out of Combat", "truce", (p: Player, event: Event | undefined) => {
				p.outOfCombat = !p.outOfCombat;
				if (p.outOfCombat) p.discardHand();
				ButtonFactory.toggle(event!, "");
			}, this.outOfCombat);
			const removePlayer = this.createButton(playerdiv, "rp", "Remove Player", "trash-can", (p) => {
				p.removeRender();
				deck.removePlayer(p);
				deck.updateOBR()
				deck.renderDeck()
			});
			removePlayer.classList.add("btn-danger");
		}

		// Player state toggles
		this.createButton(playerdiv, "onhold", "On Hold", "halt", (p, event) => {
			p.onHold = !p.onHold;
			ButtonFactory.toggle(event!, "");
		}, this.onHold);

		this.createButton(playerdiv, "hesitant", "Hesitant Hindrance", "uncertainty", (p, event) => {
			p.toggleHesitant();
			ButtonFactory.toggle(event!, "");
		}, this.hesitant);

		this.createButton(playerdiv, "quick", "Quick Edge", "sprint", (p, event) => {
			p.toggleQuick();
			ButtonFactory.toggle(event!, "");
		}, this.quick);


		const lvlHeadedType = this.impLevelHeaded ? "scales-exclaim" : "scales";
		this.createButton(playerdiv, "levelhead", "Level Headed Edge", lvlHeadedType, (p) => {
			p.toggleLevelHeaded();
		}, this.levelHeaded || this.impLevelHeaded);

		// Render cards
		let inc = Util.rem2px(Card.cardSpread());
		if (this.hand.length > 12) inc = Math.trunc(inc / 4);
		else if (this.hand.length > 6) inc = Math.trunc(inc / 2);

		this.hand.forEach(cardSeq => {
			const card = Card.byId(cardSeq);
			const csvg = card.render(carddiv, x, y, Facing.Up);
			if (card.sequence === this.choosencard) csvg.classList.add("choosen");

			csvg.addEventListener('click', () => {
				this.choosencard = this.choosencard === card.sequence ? -1 : card.sequence;
				this.updateOBR();
				deck.updateOBR();
				deck.renderDeck();
			});

			x += inc;
		});
	}

	// Helper function for button creation, used inside the render method
	createButton(div: HTMLDivElement, id: string, title: string, imageKey: string, onClick: (p: Player, event?: Event) => void, toggle?: boolean) {
		const button = ButtonFactory.getButton(id, title, imageKey, "");
		if (toggle) button.classList.add("btn-success");
		button.addEventListener('click', function (event) {
			const p = Player.getPlayer(this);
			onClick(p, event);
			p.updateOBR();
			const deck = Deck.getInstance();
			deck.updateOBR();
			deck.renderDeck();
		});
		div.appendChild(button);
		return button;
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
			);
		} catch (error) {
			console.error("Failed to update metadata in OBR:", error);
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
			);
		} catch (error) {
			console.error("Failed to remove metadata from character:", error);
		}
	}
}



// import OBR, { isImage } from "@owlbear-rodeo/sdk"
// import { ButtonFactory } from "./button"
// import { Card, Facing } from "./cards"
// import { Deck } from "./deck"
// import { Util } from "./util"
// export enum LevelHeaded {
// 	None = 0,
// 	LevelHeaded = 1,
// 	ImpLevelHeaded = 2
// }
// export interface PlayerMeta {
// 	hand: number[]
// 	id: string
// 	name: string
// 	owner: string
// 	onHold: boolean
// 	outOfCombat: boolean
// 	levelHeaded: boolean
// 	impLevelHeaded: boolean
// 	tactician: boolean
// 	mastertactician: boolean
// 	quick: boolean
// 	canchoose: boolean
// 	hesitant: boolean
// 	choosencard: number
// }

// export class Player {
// 	private meta: PlayerMeta = {
// 		hand: [],
// 		id: "",
// 		name: "",
// 		owner: "",
// 		onHold: false,
// 		outOfCombat: false,
// 		levelHeaded: false,
// 		impLevelHeaded: false,
// 		tactician: false,
// 		mastertactician: false,
// 		quick: false,
// 		canchoose: false,
// 		hesitant: false,
// 		choosencard: -1,
// 	}

// 	//hand: Card[] //fixme
// 	get hand(): number[] { return this.meta.hand }
// 	set hand(newhand: number[]) { this.meta.hand = newhand }
// 	get id(): string { return this.meta.id }
// 	set id(newId: string) { this.meta.id = newId }
// 	get name(): string { return this.meta.name }
// 	set name(newName: string) { this.meta.name = newName }
// 	get owner(): string { return this.meta.owner }
// 	set owner(newowner: string) { this.meta.owner = newowner }
// 	get onHold(): boolean { return this.meta.onHold }
// 	set onHold(newonHold: boolean) { this.meta.onHold = newonHold }
// 	get outOfCombat(): boolean { return this.meta.outOfCombat }
// 	set outOfCombat(newoutOfCombat: boolean) { this.meta.outOfCombat = newoutOfCombat }
// 	get levelHeaded(): boolean { return this.meta.levelHeaded }
// 	set levelHeaded(newlevelHeaded: boolean) { this.meta.levelHeaded = newlevelHeaded }
// 	get impLevelHeaded(): boolean { return this.meta.impLevelHeaded }
// 	set impLevelHeaded(newimpLevelHeaded: boolean) { this.meta.impLevelHeaded = newimpLevelHeaded }
// 	get tactician(): boolean { return this.meta.tactician }
// 	set tactician(newtactician: boolean) { this.meta.tactician = newtactician }
// 	get mastertactician(): boolean { return this.meta.mastertactician }
// 	set mastertactician(newmastertactician: boolean) { this.meta.mastertactician = newmastertactician }
// 	get quick(): boolean { return this.meta.quick }
// 	set quick(newquick: boolean) { this.meta.quick = newquick }
// 	get canchoose(): boolean { return this.meta.canchoose }
// 	set canchoose(newcanchoose: boolean) { this.meta.canchoose = newcanchoose }
// 	get hesitant(): boolean { return this.meta.hesitant }
// 	set hesitant(newhesitant: boolean) { this.meta.hesitant = newhesitant }
// 	get choosencard(): number { return this.meta.choosencard }
// 	set choosencard(newchoosencard: number) { this.meta.choosencard = newchoosencard }
// 	get getMeta(): PlayerMeta { return this.meta }
// 	set setMeta(newMeta: PlayerMeta) { this.meta = newMeta }

// 	constructor(name: string) {
// 		this.meta.name = name
// 		this.meta.hand = []
// 		this.meta.id = Util.shortUUID()
// 		//console.log(`name:${this.name}  id:[${this.id}]`)
// 	}

// 	toggleLevelHeaded() {
// 		if (!this.levelHeaded && this.impLevelHeaded) {
// 			this.levelHeaded = false
// 			this.impLevelHeaded = false
// 		} else if (!this.levelHeaded && !this.impLevelHeaded) {
// 			this.levelHeaded = true
// 			this.impLevelHeaded = false
// 			this.hesitant = false
// 		} else if (this.levelHeaded && !this.impLevelHeaded) {
// 			this.levelHeaded = false
// 			this.impLevelHeaded = true
// 			this.hesitant = false
// 		} else if (this.levelHeaded && this.impLevelHeaded) {
// 			this.levelHeaded = false
// 			this.impLevelHeaded = false
// 		}
// 	}

// 	toggleTactician() {
// 		if (!this.tactician && this.mastertactician) {
// 			this.tactician = false
// 			this.mastertactician = false
// 		} else if (!this.tactician && !this.mastertactician) {
// 			this.tactician = true
// 			this.mastertactician = false
// 		} else if (this.tactician && !this.mastertactician) {
// 			this.tactician = false
// 			this.impLevelHeaded = true
// 		} else if (this.tactician && this.mastertactician) {
// 			this.tactician = false
// 			this.mastertactician = false
// 		}
// 	}


// 	toggleQuick() {
// 		this.quick = !this.quick
// 		if (this.quick) {
// 			this.hesitant = false
// 		}
// 	}

// 	toggleHesitant() {
// 		this.hesitant = !this.hesitant
// 		if (this.hesitant) {
// 			this.quick = false
// 			this.levelHeaded = false
// 			this.impLevelHeaded = false
// 		}
// 	}

// 	bestCard(): number {
// 		if (this.hand.length === 0) return -1
// 		const high = this.highCard()
// 		if (this.hand.includes(this.choosencard)) {
// 			if (!this.hesitant || this.choosencard != high) {
// 				return this.choosencard
// 			}
// 		}
// 		if (this.hesitant) {
// 			return this.lowCard()
// 		} else {
// 			return high
// 		}
// 	}

// 	highCard(): number {
// 		if (this.hand.length > 0) {
// 			const high = this.hand.reduce((max, current) =>
// 				max > current ? max : current)
// 			return high
// 		}
// 		return 1
// 	}

// 	lowCard(): number {
// 		if (this.hand.length > 0) {
// 			if (this.hasJoker()) {
// 				const joker = this.hand.reduce((j, current) =>
// 					Card.isJoker(j) ? j : current)
// 				return joker
// 			}
// 			const low = this.hand.reduce((min, current) =>
// 				min < current ? min : current)
// 			return low
// 		}
// 		return -1
// 	}

// 	drawCard() {
// 		Deck.getInstance().dealFromTop(this.hand, 1, Facing.Up)
// 	}

// 	drawInitiative() {
// 		let deck = Deck.getInstance()
// 		let p = this
// 		p.choosencard = -1
// 		if (p.hesitant) {
// 			p.quick = false
// 			p.levelHeaded = false
// 			p.impLevelHeaded = false
// 		}
// 		if (p.onHold)
// 			return
// 		deck.moveToDiscardPool(p.hand)
// 		if (p.outOfCombat)
// 			return
// 		deck.dealFromTop(p.hand, 1, Facing.Up)
// 		if (p.impLevelHeaded)
// 			deck.dealFromTop(p.hand, 1, Facing.Up)
// 		if (p.levelHeaded || p.impLevelHeaded || p.hesitant)
// 			deck.dealFromTop(p.hand, 1, Facing.Up)
// 		if (p.quick)
// 			while (deck.drawdeck.length > 0 && p.hand.every(c => Card.byId(c).rank <= 5)) {
// 				deck.dealFromTop(p.hand, 1, Facing.Up)
// 			}
// 	}

// 	drawInterlude() {
// 		let deck = Deck.getInstance()
// 		let p = this
// 		p.choosencard = -1
// 		deck.moveToDiscardPool(p.hand)
// 		deck.dealFromTop(p.hand, 1, Facing.Up)
// 	}

// 	discardHand() {
// 		let deck = Deck.getInstance()
// 		let p = this
// 		deck.moveToDiscardPool(p.hand, 0)
// 	}

// 	hasJoker(): boolean {
// 		return this.hand.some(c => c > 52);
// 	}

// 	countJoker(): number {
// 		return this.hand.filter(c => c > 52).length
// 	}

// 	static getPlayer(but: HTMLButtonElement): Player {
// 		let element = but as HTMLElement
// 		let pid = element.getAttribute('data-pid')
// 		while (!pid && element) {
// 			element = element.parentElement as HTMLElement
// 			pid = element.getAttribute('data-pid')
// 		}
// 		let p = Deck.getInstance().getPlayer(pid)
// 		return p
// 	}

// 	removeRender() {
// 		const divToRemove = document.querySelector(`fieldset[data-pid="${this.id}"]`)
// 		if (divToRemove) {
// 			divToRemove.remove()
// 		}
// 	}

// 	render(container: HTMLDivElement, x: number, y: number) {
// 		const doc = container.ownerDocument
// 		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
// 		const legend = doc.createElement('legend') as HTMLLegendElement;
// 		legend.textContent = `${this.name}`
// 		fieldset.appendChild(legend)
// 		fieldset.classList.add("flex-container")
// 		fieldset.title = this.name
// 		fieldset.setAttribute('data-pid', this.id)

// 		const playerdiv = doc.createElement('div') as HTMLDivElement
// 		playerdiv.classList.add("flex-item-1")
// 		playerdiv.classList.add(Card.relcard[0])
// 		const carddiv = doc.createElement('div') as HTMLDivElement
// 		carddiv.classList.add("flex-item-2")
// 		carddiv.classList.add(...Card.concard)
// 		fieldset.appendChild(playerdiv)
// 		fieldset.appendChild(carddiv)
// 		container.appendChild(fieldset)

// 		const drawcard = ButtonFactory.getButton("drawcard", "Draw a Card", "card-pickup", "") //this.id)
// 		drawcard.addEventListener('click', function () {
// 			let p = Player.getPlayer(this)
// 			p.drawCard()
// 			p.updateOBR()
// 			const deck = Deck.getInstance()
// 			deck.updateOBR()
// 			deck.renderDeck()
// 		})
// 		playerdiv.appendChild(drawcard)

// 		if (Deck.getInstance().isGM) {
// 			const drawhand = ButtonFactory.getButton("drawhand", "Draw Hand", "poker-hand", "") //this.id)
// 			drawhand.addEventListener('click', function () {
// 				let p = Player.getPlayer(this)
// 				p.drawInitiative()
// 				p.updateOBR()
// 				const deck = Deck.getInstance()
// 				deck.updateOBR()
// 				deck.renderDeck()
// 			})
// 			playerdiv.appendChild(drawhand)
// 		}

// 		// if (Deck.getInstance().isGM) {
// 		// 	const choose = ButtonFactory.getButton("choose", "Choose Card", "card-pick", "") //this.id)
// 		// 	if (this.canchoose) choose.classList.add("btn-success")
// 		// 	choose.addEventListener('click', function (event) {
// 		// 		let p = Player.getPlayer(this)
// 		// 		p.canchoose = !p.canchoose
// 		// 		ButtonFactory.toggle(event)
// 		// 		p.updateOBR()
// 		// 		const deck = Deck.getInstance()
// 		// 		deck.updateOBR()
// 		// 		deck.renderDeck()
// 		// 	})
// 		// 	playerdiv.appendChild(choose)
// 		// }

// 		if (Deck.getInstance().isGM) {
// 			const discardhand = ButtonFactory.getButton("discardhand", "Discard Hand", "hand-discard", "") //this.id)
// 			discardhand.addEventListener('click', function () {
// 				let p = Player.getPlayer(this)
// 				const deck = Deck.getInstance()
// 				deck.moveToDiscardPool(p.hand, 0)
// 				p.updateOBR()
// 				deck.updateOBR()
// 				deck.renderDeck()
// 			})
// 			playerdiv.appendChild(discardhand)
// 		}

// 		if (Deck.getInstance().isGM) {
// 			const rp = ButtonFactory.getButton("rp", "Remove Player", "trash-can", this.id)
// 			rp.classList.add("btn-danger")
// 			rp.addEventListener('click', function () {
// 				let p = Player.getPlayer(this)
// 				p.removeRender()
// 				Deck.getInstance().removePlayer(p)
// 				const deck = Deck.getInstance()
// 				deck.updateOBR()
// 				deck.renderDeck()
// 			})
// 			playerdiv.appendChild(rp)
// 		}

// 		const outcombat = ButtonFactory.getButton("outcombat", "Out of Combat", "truce", "") //this.id)
// 		if (this.outOfCombat) outcombat.classList.add("btn-success")
// 		outcombat.addEventListener('click', function (event) {
// 			let p = Player.getPlayer(this)
// 			p.outOfCombat = !p.outOfCombat
// 			p.updateOBR()
// 			if (p.outOfCombat) {
// 				p.discardHand()
// 				Deck.getInstance().updateOBR()
// 			}
// 			ButtonFactory.toggle(event)
// 			const deck = Deck.getInstance()
// 			deck.updateOBR()
// 			deck.renderDeck()
// 		})
// 		playerdiv.appendChild(outcombat)

// 		const onhold = ButtonFactory.getButton("onhold", "On Hold", "halt", "") //this.id)
// 		if (this.onHold) onhold.classList.add("btn-success")
// 		onhold.addEventListener('click', function (event) {
// 			let p = Player.getPlayer(this)
// 			p.onHold = !p.onHold
// 			ButtonFactory.toggle(event)
// 			p.updateOBR()
// 			const deck = Deck.getInstance()
// 			deck.updateOBR()
// 			deck.renderDeck()
// 		})
// 		playerdiv.appendChild(onhold)

// 		const hesitant = ButtonFactory.getButton("hesitant", "Hesitant Hindrance", "uncertainty", "") //this.id)
// 		if (this.hesitant) hesitant.classList.add("btn-success")
// 		hesitant.addEventListener('click', function (event) {
// 			let p = Player.getPlayer(this)
// 			p.toggleHesitant()
// 			ButtonFactory.toggle(event)
// 			p.updateOBR()
// 			const deck = Deck.getInstance()
// 			deck.updateOBR()
// 			deck.renderDeck()
// 		})
// 		playerdiv.appendChild(hesitant)

// 		const quick = ButtonFactory.getButton("quick", "Quick Edge", "sprint", "") //this.id)
// 		if (this.quick) quick.classList.add("btn-success")
// 		quick.addEventListener('click', function (event) {
// 			let p = Player.getPlayer(this)
// 			p.toggleQuick()
// 			ButtonFactory.toggle(event)
// 			p.updateOBR()
// 			const deck = Deck.getInstance()
// 			deck.updateOBR()
// 			deck.renderDeck()
// 		})
// 		playerdiv.appendChild(quick)

// 		// const tacttype = (this.mastertactician) ? "aces" : "ace"
// 		// const tactician = ButtonFactory.getButton("tactician", "Tactician", tacttype, "")  
// 		// if (this.tactician || this.mastertactician) tactician.classList.add("btn-success")
// 		// tactician.addEventListener('click', function () {
// 		// 	let p = Player.getPlayer(this)
// 		// 	p.toggleTactician()
// 		// 	p.updateOBR()
// 		// 	const deck = Deck.getInstance()
// 		// 	deck.updateOBR()
// 		// 	deck.renderDeck()
// 		// })
// 		// playerdiv.appendChild(tactician)

// 		const lvlheadtype = (this.impLevelHeaded) ? "scales-exclaim" : "scales"
// 		const levelhead = ButtonFactory.getButton("levelhead", "Level Headed Edge", lvlheadtype, "")
// 		if (this.levelHeaded || this.impLevelHeaded) levelhead.classList.add("btn-success")
// 		levelhead.addEventListener('click', function () {
// 			let p = Player.getPlayer(this)
// 			p.toggleLevelHeaded()
// 			p.updateOBR()
// 			const deck = Deck.getInstance()
// 			deck.updateOBR()
// 			deck.renderDeck()
// 		})
// 		playerdiv.appendChild(levelhead)

// 		let inc = Util.rem2px(Card.cardSpread())
// 		if (this.hand.length > 12) {
// 			inc = Math.trunc(inc / 4)
// 		} else if (this.hand.length > 6) {
// 			inc = Math.trunc(inc / 2)
// 		}

// 		for (const c of this.hand) {
// 			const card = Card.byId(c)
// 			const csvg = card.render(carddiv, x, y, Facing.Up)
// 			const picked = (card.sequence === this.choosencard)
// 			if (picked) {
// 				csvg.classList.add("choosen")
// 			}
// 			csvg.addEventListener('click', () => {
// 				const deck = Deck.getInstance()
// 				const p = this
// 				if (card.sequence === p.choosencard) {
// 					p.choosencard = -1
// 				} else {
// 					p.choosencard = card.sequence
// 				}
// 				p.updateOBR()
// 				deck.updateOBR()
// 				deck.renderDeck()
// 			})

// 			x = x + inc
// 		}
// 	}

// 	async updateOBR() {
// 		try {
// 			await OBR.scene.items.updateItems(
// 				(item) =>
// 					item.layer === "CHARACTER" &&
// 					isImage(item) &&
// 					item.metadata[Util.PlayerMkey] != undefined,
// 				(characters) => {
// 					for (let character of characters) {
// 						let pmd = character.metadata[Util.PlayerMkey] as PlayerMeta
// 						if (pmd.id === this.id) {
// 							character.metadata[Util.PlayerMkey] = this.getMeta
// 						}
// 					}
// 				}
// 			);
// 		} catch (error) {
// 			console.error("Failed to remove metadata from character:", error);
// 		}
// 	}

// 	async removeOBR() {
// 		try {
// 			// Update the item with the given characterId
// 			await OBR.scene.items.updateItems(
// 				(item) =>
// 					item.layer === "CHARACTER" &&
// 					isImage(item) &&
// 					item.metadata[Util.PlayerMkey] != undefined,
// 				(characters) => {
// 					for (let character of characters) {
// 						let pmd = character.metadata[Util.PlayerMkey] as PlayerMeta
// 						if (pmd.id === this.id) {
// 							delete character.metadata[Util.PlayerMkey]
// 						}
// 					}
// 				}
// 			);
// 		} catch (error) {
// 			console.error("Failed to remove metadata from character:", error);
// 		}
// 	}
// }