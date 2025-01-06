import OBR from "@owlbear-rodeo/sdk";
import { Player } from "./player";
import { ButtonFactory } from "./button";
import { Card, Facing } from "./cards";
import { Util } from "./util";

export interface DeckMeta {
	drawdeck: number[];
	discardpile: number[];
	cardpool: number[];
	currentRound: number;
	currentPlayer: number;
	back: number;
	use4jokers: boolean;
	scale: number;
}

export class Deck {
	private static instance: Deck;
	isGM: boolean = false;
	private constructor() { }

	// Graphic assets
	svgbuttons!: HTMLObjectElement;
	svgcontainer!: HTMLDivElement;
	jokerNotified: number = 0;
	players: Player[] = [];

	// Game state
	private meta: DeckMeta = {
		back: 0,
		cardpool: [],
		currentPlayer: -1,
		currentRound: 0,
		discardpile: [],
		drawdeck: [],
		scale: 1,
		use4jokers: false,
	};

	// Getters and Setters
	get getMeta(): DeckMeta { return { ...this.meta }; }
	set setMeta(newMeta: DeckMeta) { this.meta = { ...newMeta }; }

	get back(): number { return this.meta.back; }
	set back(n: number) { this.meta.back = n; }
	get cardpool(): number[] { return this.meta.cardpool; }
	set cardpool(cp: number[]) { this.meta.cardpool = cp; }
	get currentPlayer(): number { return this.meta.currentPlayer; }
	set currentPlayer(cp: number) { this.meta.currentPlayer = cp; }
	get currentRound(): number { return this.meta.currentRound; }
	set currentRound(cr: number) { this.meta.currentRound = cr; }
	get discardpile(): number[] { return this.meta.discardpile; }
	set discardpile(dp: number[]) { this.meta.discardpile = dp; }
	get drawdeck(): number[] { return this.meta.drawdeck; }
	set drawdeck(dd: number[]) { this.meta.drawdeck = dd; }
	get scale(): number { return this.meta.scale; }
	set scale(s: number) { this.meta.scale = s; }
	get use4jokers(): boolean { return this.meta.use4jokers; }
	set use4jokers(uj: boolean) { this.meta.use4jokers = uj; }
	get deckcount(): number { return this.use4jokers ? 56 : 54; }
	get backsvg(): SVGElement { return Card.backs[this.back]; }

	getImageSvg(c: Card): string {
		return c.dir === Facing.Up ? c.face.innerHTML : this.backsvg.innerHTML;
	}

	changeBack() {
		this.back = (++this.back >= Card.backs.length) ? 0 : this.back
	}

	public static getInstance(): Deck {
		if (!Deck.instance) {
			Deck.instance = new Deck();
			Deck.instance.svgbuttons = document.getElementById('buttons-svg') as HTMLObjectElement;
			Deck.instance.svgcontainer = document.getElementById('svgContainer') as HTMLDivElement;
			Deck.instance.shuffle();
		}
		return Deck.instance;
	}

	newGame() {
		this.newRound();
		this.moveToDiscardPool(this.cardpool);
		this.returnCardsToDeck(this.discardpile);
		this.shuffle();
	}

	drawInitiative() {
		this.players.forEach(p => p.drawInitiative());
	}

	drawInterlude() {
		this.players.forEach(p => p.drawInterlude());
	}

	discardAllHands() {
		this.players.forEach(p => p.discardHand());
	}

	getPlayer(pid: string | null): Player | undefined {
		return this.players.find(p => p.id === pid);
	}

	newRound() {
		this.players.forEach(p => this.moveToDiscardPool(p.hand));
	}

	toggleJokers() {
		this.use4jokers = !this.use4jokers;
		this.newGame();
		this.shuffle();
	}

	initializeDeck() {
		this.jokerNotified = 0;
		this.drawdeck = Array.from({ length: this.deckcount }, (_, i) => i + 1);
		this.discardpile = [];
		this.cardpool = [];
	}

	get drawnCards(): number[] {
		return [
			...this.players.flatMap(p => p.hand.slice()),
			...this.discardpile,
			...this.cardpool
		];
	}

	shuffle() {
		this.initializeDeck();
		for (let i = this.drawdeck.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[this.drawdeck[i], this.drawdeck[j]] = [this.drawdeck[j], this.drawdeck[i]];
		}
	}

	cut(index: number) {
		this.drawdeck = [...this.drawdeck.slice(index), ...this.drawdeck.slice(0, index)];
	}

	dealFromTop(hand: number[], numCards: number, dir: Facing) {
		if (numCards>this.drawdeck.length) {
			this.showNotification('Deck depleted, shuffle all cards and redeal.', "ERROR");
		}
		this.moveToPool(hand, this.drawdeck, numCards, true, dir);
	}

	returnCardsToDeck(from: number[], numCards: number = 0) {
		this.moveToPool(this.drawdeck, from, numCards, true, Facing.Down);
	}

	moveToDiscardPool(from: number[], numCards: number = 0) {
		this.moveToPool(this.discardpile, from, numCards, true, Facing.Up);
	}

	moveToSpecialPool(from: number[], numCards: number = 0) {
		this.moveToPool(this.cardpool, from, numCards, true, Facing.Up);
	}

	moveToPool(to: number[], from: number[], numCards: number = 0, top: boolean = true, dir: Facing = Facing.None) {
		const limit = Math.min(numCards || from.length, from.length);
		if (limit > 0) {
			try {
				for (let i = 0; i < limit; i++) {
					const cid = top ? from.shift()! : from.pop()!;
					let card = Card.byId(cid);
					if (dir !== Facing.None) card.dir = dir;
					if (!to.includes(cid)) {
						to.push(cid);
					} else {
						console.log(`Duplicate card found: [${cid}] ${card.toString()}`);
					}
				}
			} catch (e) {
				console.error('Error moving cards:', e);
			}
		} else {
			console.log('From array is empty, no move.');
		}
	}

	checkfororphans(): number[] {
		const allCards = [...this.drawdeck, ...this.drawnCards];
		return Array.from({ length: this.deckcount }, (_, i) => i + 1).filter(c => !allCards.includes(c));
	}

	extractPlayerCards(p: Player) {
		const playerCardsSet = new Set(p.hand);
		this.drawdeck = this.drawdeck.filter(c => !playerCardsSet.has(c));
		this.discardpile = this.discardpile.filter(c => !playerCardsSet.has(c));
		this.cardpool = this.cardpool.filter(c => !playerCardsSet.has(c));
	}

	jokersDrawn(): number {
		return this.players.filter(p => p.hasJoker()).length
			+ this.discardpile.filter(Card.isJoker).length
			+ this.cardpool.filter(Card.isJoker).length;
	}

	addPlayer(name: string): Player {
		const p = new Player(name);
		this.players.push(p);
		return p;
	}

	removePlayer(player: Player) {
		const index = this.players.findIndex(p => p.id === player.id);
		if (index !== -1) {
			this.moveToDiscardPool(this.players[index].hand);
			this.players.splice(index, 1);
			player.removeOBR();
		}
	}

	renderDeck() {
		this.renderDraw(this.svgcontainer);
		if (this.isGM) {
			this.renderDiscardPile(this.svgcontainer);
			this.renderCardPool(this.svgcontainer);
		}
		this.renderPlayers(this.svgcontainer);
		this.setCurrentPlayer(this.players[0]?.id || "");
		const drawnJokers = this.jokersDrawn();
		if (drawnJokers > this.jokerNotified) {
			this.showNotification('Joker drawn, shuffle and issue Bennies.',"INFO");
			this.jokerNotified = drawnJokers;
		}
	}

	// Render the draw deck
	renderDraw(container: HTMLDivElement) {
		const doc = container.ownerDocument;
		let deckCardDiv = doc.getElementById('drawdeckcards') as HTMLDivElement;

		if (!deckCardDiv) {
			deckCardDiv = this.createDeckContainer(doc, 'Draw', 'drawdeckcards', 'Draw Deck');
			if (this.isGM) {
				this.addGMButtons(deckCardDiv.parentElement as HTMLFieldSetElement, [
					{ id: "di", label: "Deal Initiative", icon: "card-draw", action: () => this.drawInitiative() },
					{ id: "dint", label: "Deal Interlude", icon: "suits", action: () => this.drawInterlude() },
					{ id: "joke", label: "Use Four Jokers", icon: "joker", toggle: true, action: () => this.toggleJokers() },
					{ id: "sb", label: "Change Backs", icon: "card-exchange", action: () => this.changeBack() }
				]);
			}
		}

		const legend = deckCardDiv.parentElement?.querySelector('legend') as HTMLLegendElement;
		legend.textContent = `Draw Deck [${this.drawdeck.length}]`;

		this.clearAndRenderCards(deckCardDiv, this.drawdeck, Facing.Down, Card.cardStackedDown());
	}

	// Helper function to create deck container
	private createDeckContainer(doc: Document, id: string, cardDivId: string, title: string): HTMLDivElement {
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const legend = doc.createElement('legend') as HTMLLegendElement;
		legend.textContent = title;
		fieldset.appendChild(legend);
		fieldset.classList.add('flex-container');
		fieldset.id = id;
		const div = doc.createElement('div') as HTMLDivElement;
		div.classList.add('flex-item-3', Card.relcard[0]);
		const cardDiv = doc.createElement('div') as HTMLDivElement;
		cardDiv.id = cardDivId;
		cardDiv.classList.add('flex-item-2', ...Card.concard);
		fieldset.appendChild(div);
		fieldset.appendChild(cardDiv);
		this.svgcontainer.appendChild(fieldset);
		return cardDiv;
	}

	// Helper function to add GM buttons
	private addGMButtons(container: HTMLFieldSetElement, buttons: { id: string; label: string; icon: string; toggle?: boolean; action: () => void }[]) {
		const div = container.querySelector('div') as HTMLDivElement;
		buttons.forEach(({ id, label, icon, toggle, action }) => {
			const button = ButtonFactory.getButton(id, label, icon, "");
			if (toggle) button.classList.add("btn-success");
			button.addEventListener('click', (event) => {
				action();
				this.updateOBR();
				this.renderDeck();
				if (toggle) ButtonFactory.toggle(event);
			});
			div.appendChild(button);
		});
	}

	// Render the discard pile
	renderDiscardPile(container: HTMLDivElement) {
		const doc = container.ownerDocument;
		let discardCardDiv = doc.getElementById("discardpilecards") as HTMLDivElement;

		if (!discardCardDiv) {
			discardCardDiv = this.createDeckContainer(doc, 'Discard', 'discardpilecards', 'Discard Pile');
			this.addGMButtons(discardCardDiv.parentElement as HTMLFieldSetElement, [
				{ id: "dp", label: "Discard All Hands", icon: "card-burn", action: () => this.discardAllHands() },
				{
					id: "shf", label: "Shuffle", icon: "stack", action: () => {
						this.newGame();
						this.updateOBR();
						this.renderDeck();
					}
				}
			]);
		}

		const legend = discardCardDiv.parentElement?.querySelector('legend') as HTMLLegendElement;
		legend.textContent = `Discard Pile [${this.discardpile.length}]`;

		this.clearAndRenderCards(discardCardDiv, this.discardpile, Facing.Up, Card.cardStacked());
	}

	// Render the card pool
	renderCardPool(container: HTMLDivElement) {
		const doc = container.ownerDocument;
		let specialCardDiv = doc.getElementById("cardpoolcards") as HTMLDivElement;

		if (!specialCardDiv) {
			specialCardDiv = this.createDeckContainer(doc, 'Pool', 'cardpoolcards', 'Card Pool');
			this.addGMButtons(specialCardDiv.parentElement as HTMLFieldSetElement, [
				{
					id: "cp", label: "Draw a Card", icon: "card-pickup", action: () => {
						this.moveToSpecialPool(this.drawdeck, 1);
						this.updateOBR();
						this.renderDeck();
					}
				},
				{
					id: "dcp", label: "Discard Card Pool", icon: "card-burn", action: () => {
						this.moveToDiscardPool(this.cardpool, 0);
						this.updateOBR();
						this.renderDeck();
					}
				}
			]);
		}

		const legend = specialCardDiv.parentElement?.querySelector('legend') as HTMLLegendElement;
		legend.textContent = `Card Pool [${this.cardpool.length}]`;

		this.clearAndRenderCards(specialCardDiv, this.cardpool, Facing.Up, Card.cardStacked());
	}

	// Helper function to clear and render cards
	private clearAndRenderCards(container: HTMLDivElement, cards: number[], facing: Facing, cardIncrement: string) {
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}
		let x = 0;
		const inc = Util.rem2px(cardIncrement);
		for (const c of cards) {
			Card.byId(c).render(container, x, 0, facing);
			x += inc;
		}
	}

	// Render the players
	renderPlayers(div: HTMLDivElement) {
		let y = 0, x = 0;
		this.players.sort((a, b) => {
			const aBest = a.bestCard() ?? 0;
			const bBest = b.bestCard() ?? 0;
			return bBest - aBest;
		});
		this.players.forEach(p => {
			p.removeRender();
			p.render(div, x, y);
		});
	}

	// Set the current player
	setCurrentPlayer(pid: string) {
		this.currentPlayer = 0; // Placeholder for actual implementation
		document.querySelectorAll('fieldset[data-pid]').forEach(fs => {
			fs.classList.toggle("nextplayer", fs.getAttribute('data-pid') === pid);
		});
	}

	// Show a notification
	showNotification(message: string, level: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING" = "DEFAULT") {
		try {
			OBR.notification.show(message, level);
		} catch (error) {
			console.error('Failed to show notification:', error);
		}
	}

	// Update state from metadata
	async updateState(dmd: DeckMeta) {
		if (dmd) {
			this.setMeta = dmd;
		} else {
			console.log("No metadata found for this extension in the room.");
			this.newGame();
			await this.updateOBR(); // Await here for consistency
		}
	}

	// Update OBR with current state
	async updateOBR() {
		let missing = this.checkfororphans();
		if (missing.length > 0) {
			console.log(`Missing cards: ${missing.join(', ')}`);
			this.moveToDiscardPool(missing, 0);
		}
		const dmd = this.getMeta;
		try {
			await OBR.room.setMetadata({ [Util.DeckMkey]: dmd });
			await Promise.all(this.players.map(p => p.updateOBR()));
		} catch (error) {
			console.error('Failed to update OBR:', error);
		}
	}
}




// import OBR from "@owlbear-rodeo/sdk"
// import { Player } from "./player"
// import { ButtonFactory } from "./button"
// import { Card, Facing } from "./cards"
// import { Util } from "./util"

// export interface DeckMeta {
// 	drawdeck: number[]
// 	discardpile: number[]
// 	cardpool: number[]
// 	currentRound: number
// 	currentPlayer: number
// 	back: number
// 	use4jokers: boolean
// 	scale: number
// }

// export class Deck {
// 	private static instance: Deck
// 	isGM: boolean = false
// 	private constructor() { }
// 	// graphic assets
// 	svgbuttons!: HTMLObjectElement
// 	svgcontainer!: HTMLDivElement
// 	jokerNotified: number = 0
// 	players: Player[] = []

// 	//game state
// 	private meta: DeckMeta = {
// 		back: 0,
// 		cardpool: [],
// 		currentPlayer: -1,
// 		currentRound: 0,
// 		discardpile: [],
// 		drawdeck: [],
// 		scale: 1,
// 		use4jokers: false,
// 	}

// 	get getMeta(): DeckMeta { return this.meta }
// 	set setMeta(newMeta: DeckMeta) { this.meta = newMeta }

// 	get back(): number { return this.meta.back }
// 	set back(n: number) { this.meta.back = n }
// 	get cardpool(): number[] { return this.meta.cardpool }
// 	set cardpool(cp: number[]) { this.meta.cardpool = cp }
// 	get currentPlayer(): number { return this.meta.currentPlayer }
// 	set currentPlayer(cp: number) { this.meta.currentPlayer = cp }
// 	get currentRound(): number { return this.meta.currentRound }
// 	set currentRound(cr: number) { this.meta.currentRound = cr }
// 	get discardpile(): number[] { return this.meta.discardpile }
// 	set discardpile(dp: number[]) { this.meta.discardpile = dp }
// 	get drawdeck(): number[] { return this.meta.drawdeck }
// 	set drawdeck(dd: number[]) { this.meta.drawdeck = dd }
// 	get scale(): number { return this.meta.scale }
// 	set scale(s: number) { this.meta.scale = s }
// 	get use4jokers(): boolean { return this.meta.use4jokers }
// 	set use4jokers(uj: boolean) { this.meta.use4jokers = uj }
// 	get deckcount(): number { return (this.use4jokers) ? 56 : 54 }
// 	get backsvg(): SVGElement {
// 		return Card.backs[this.back]
// 	}

// 	getImageSvg(c: Card): string {
// 		let img = c.face.innerHTML
// 		if (c.dir != Facing.Up) {
// 			img = this.backsvg.innerHTML
// 		}
// 		return img
// 	}
// 	public static getInstance(): Deck {
// 		if (!Deck.instance) {
// 			Deck.instance = new Deck();
// 			Deck.instance.svgbuttons = document.getElementById('buttons-svg') as HTMLObjectElement
// 			Deck.instance.svgcontainer = document.getElementById('svgContainer') as HTMLDivElement
// 			Deck.instance.shuffle()
// 		}
// 		return Deck.instance;
// 	}

// 	newGame() {
// 		this.newRound()
// 		this.moveToDiscardPool(this.cardpool)
// 		this.returnCardsToDeck(this.discardpile)
// 		this.shuffle()
// 	}

// 	drawInitiative() {
// 		for (const p of this.players) {
// 			p.drawInitiative()
// 		}
// 	}

// 	drawInterlude() {
// 		for (const p of this.players) {
// 			p.drawInterlude()
// 		}
// 	}

// 	discardAllHands() {
// 		for (const p of this.players) {
// 			p.discardHand()
// 		}
// 	}

// 	getPlayer(pid: string | null): Player {
// 		return this.players.find(item => item.id === pid) as Player
// 	}

// 	newRound() {
// 		for (const p of this.players) {
// 			this.moveToDiscardPool(p.hand)
// 		}
// 	}

// 	toggleJokers() {
// 		this.use4jokers = !this.use4jokers
// 		this.newGame()
// 		this.shuffle()
// 	}

// 	initializeDeck() {
// 		const size = this.deckcount
// 		this.jokerNotified = 0
// 		this.drawdeck = []
// 		this.discardpile = []
// 		this.cardpool = []
// 		for (let i = 1; i <= size; i++) {
// 			this.drawdeck.push(i);  //new Card(i)
// 		}
// 	}

// 	get drawnCards(): number[] {
// 		let ph: number[] = []
// 		for (const p of this.players) {
// 			ph = ph.concat(p.hand.slice(0))
// 		}
// 		ph = ph.concat( this.discardpile.slice(0),  this.cardpool.slice(0))
// 		return ph
// 	}

// 	shuffle() {
// 		this.initializeDeck()
// 		for (let i = this.drawdeck.length - 1; i > 0; i--) {
// 			const j = Math.floor(Math.random() * (i + 1));
// 			[this.drawdeck[i], this.drawdeck[j]] = [this.drawdeck[j], this.drawdeck[i]];
// 		}
// 	}

// 	cut(index: number) {
// 		const top = this.drawdeck.slice(0, index);
// 		const bottom = this.drawdeck.slice(index);
// 		this.drawdeck = bottom.concat(top);
// 	}

// 	dealFromTop(hand: number[], numCards: number, dir: Facing) {
// 		this.moveToPool(hand, this.drawdeck, numCards, true, dir)
// 	}

// 	returnCardsToDeck(from: number[], numCards: number = 0) {
// 		this.moveToPool(this.drawdeck, from, numCards, true, Facing.Down)
// 	}

// 	moveToDiscardPool(from: number[], numCards: number = 0) {
// 		this.moveToPool(this.discardpile, from, numCards, true, Facing.Up)
// 	}

// 	moveToSpecialPool(from: number[], numCards: number = 0) {
// 		this.moveToPool(this.cardpool, from, numCards, true, Facing.Up)
// 	}

// 	moveToPool(to: number[], from: number[], numCards: number = 0, top: boolean, dir: Facing) {
// 		let limit = numCards < 1 ? from.length:numCards
// 		limit= Math.min(limit, from.length)
// 		if (limit > 0) {
// 			try {
// 				for (let i = 0; i < limit; i++) {
// 					let cid = 0
// 					if (from.length > 0) {
// 						if (top) {
// 							cid = from.shift()!
// 						} else {
// 							cid = from.pop()!
// 						}
// 						let card = Card.byId(cid)
// 						if (dir != Facing.None) {
// 							card.dir = dir
// 						}
// 						if (cid != 0 && !to.includes(cid)) {
// 							to.push(cid)
// 						} else {
// 							console.log(`found duplicate card [${cid}]${card.toString}`)
// 						}
// 					}
// 				}
// 			} catch (e) {
// 				console.log(`error moving cards`)
// 			}
// 		} else {
// 			console.log(`from array is empty, no move.`)
// 		}
// 	}

// 	checkfororphans(): number[] {
// 		const cip: number[] = this.drawdeck.slice(0).concat(this.drawnCards)
// 		let missing: number[] = []
// 		for (let c = 1; c <= this.deckcount; c++) {
// 			if (!cip.includes(c)) {
// 				missing.push(c)
// 			}
// 		}
// 		return missing
// 	}

// 	extractPlayerCards(p: Player) {
// 		const removeSet = new Set(p.hand)
// 		this.drawdeck = this.drawdeck.filter(item => !removeSet.has(item))
// 		this.discardpile = this.discardpile.filter(item => !removeSet.has(item))
// 		this.cardpool = this.cardpool.filter(item => !removeSet.has(item))
// 	}

// 	jokersDrawn(): number {
// 		return this.players.filter(p => p.hasJoker()).length + this.discardpile.filter(c => Card.isJoker(c)).length + this.cardpool.filter(c => Card.isJoker(c)).length
// 	}

// 	addPlayer(name: string): Player {
// 		const p = new Player(name)
// 		this.players.push(p);
// 		return p
// 	}

// 	removePlayer(player: Player) {
// 		const index = this.players.findIndex(p => p.id === player.id);
// 		if (index !== -1) {
// 			const p = this.players[index]
// 			this.moveToDiscardPool(p.hand)
// 			this.players.splice(index, 1)
// 			p.removeOBR()
// 		}
// 	}

// 	renderDeck() {
// 		this.renderDraw(this.svgcontainer)
// 		if (this.isGM) {
// 			this.renderDiscardPile(this.svgcontainer)
// 			this.renderCardPool(this.svgcontainer)
// 		}
// 		this.renderPlayers(this.svgcontainer)
// 		this.setCurrentPlayer(this.players[0]?.id) //fixme
// 		const drawn = this.jokersDrawn()
// 		if (drawn > this.jokerNotified) {
// 			this.showNotification('Joker Drawn Reshuffle and issue Bennies.', "WARNING")
// 			this.jokerNotified = drawn
// 		}
// 		//this.updateOBR()
// 	}

// 	renderDraw(container: HTMLDivElement) {
// 		const doc = container.ownerDocument
// 		let deckcarddiv = doc.getElementById('drawdeckcards') as HTMLDivElement
// 		if (!deckcarddiv) {
// 			const deckfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
// 			const deckleg = doc.createElement('legend') as HTMLLegendElement
// 			deckfieldset.appendChild(deckleg)
// 			deckfieldset.classList.add('flex-container')
// 			deckfieldset.id = "Draw"
// 			const deckdiv = doc.createElement('div') as HTMLDivElement
// 			deckdiv.classList.add('flex-item-3')
// 			deckdiv.classList.add(Card.relcard[0])
// 			deckcarddiv = doc.createElement('div') as HTMLDivElement
// 			deckcarddiv.classList.add('flex-item-2')
// 			deckcarddiv.classList.add(...Card.concard)
// 			deckcarddiv.id = "drawdeckcards"
// 			deckfieldset.appendChild(deckdiv)
// 			deckfieldset.appendChild(deckcarddiv)
// 			container.appendChild(deckfieldset)

// 			if (this.isGM) {
// 				const di = ButtonFactory.getButton("di", "Deal Initiative", "card-draw", "")
// 				di.addEventListener('click', () => {
// 					this.drawInitiative()
// 					this.updateOBR()
// 					this.renderDeck()
// 				})
// 				deckdiv.appendChild(di)

// 				const dint = ButtonFactory.getButton("dint", "Deal Interlude", "suits", "")
// 				dint.addEventListener('click', () => {
// 					this.drawInterlude()
// 					this.updateOBR()
// 					this.renderDeck()
// 				})
// 				deckdiv.appendChild(dint)

// 				const joke = ButtonFactory.getButton("joke", "Use Four Jokers", "joker", "")
// 				if (this.use4jokers) joke.classList.add("btn-success")
// 				joke.addEventListener('click', function (event) {
// 					const deck = Deck.getInstance()
// 					deck.toggleJokers()
// 					ButtonFactory.toggle(event)
// 					deck.updateOBR()
// 					deck.renderDeck()
// 				})
// 				deckdiv.appendChild(joke)

// 				const sb = ButtonFactory.getButton("sb", "Change Backs", "card-exchange", "")
// 				sb.addEventListener('click', () => {
// 					const deck = Deck.getInstance()
// 					deck.changeBack()
// 					deck.updateOBR()
// 					deck.renderDeck()
// 				})
// 				deckdiv.appendChild(sb)
// 			}
// 		}

// 		let deckleg = deckcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
// 		deckleg.textContent = `Draw Deck [${this.drawdeck.length}]`

// 		while (deckcarddiv.firstChild) {
// 			deckcarddiv.removeChild(deckcarddiv.firstChild);
// 		}

// 		let x = 0
// 		let inc = Util.rem2px(Card.cardStackedDown())
// 		for (const c of this.drawdeck) {
// 			let card = Card.byId(c)
// 			card.render(deckcarddiv, x, 0, Facing.Down)
// 			x = x + inc
// 		}
// 	}
// 	changeBack() {
// 		this.back = (++this.back >= Card.backs.length) ? 0 : this.back
// 	}

// 	renderDiscardPile(container: HTMLDivElement) {
// 		const doc = container.ownerDocument
// 		let discardcarddiv = doc.getElementById("discardpilecards") as HTMLDivElement
// 		if (!discardcarddiv) {
// 			const discardfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
// 			const discardleg = doc.createElement('legend') as HTMLLegendElement
// 			discardfieldset.appendChild(discardleg)
// 			discardfieldset.classList.add("flex-container")
// 			discardfieldset.id = "Discard"
// 			discardfieldset.title = "Discard Pile"
// 			const discarddiv = doc.createElement('div') as HTMLDivElement
// 			discarddiv.classList.add("flex-item-3")
// 			discarddiv.classList.add(Card.relcard[0])
// 			discardcarddiv = doc.createElement('div') as HTMLDivElement
// 			discardcarddiv.id = "discardpilecards"
// 			discardcarddiv.classList.add("flex-item-2")
// 			discardcarddiv.classList.add(...Card.concard)
// 			discardfieldset.appendChild(discarddiv)
// 			discardfieldset.appendChild(discardcarddiv)
// 			container.appendChild(discardfieldset)

// 			const dp = ButtonFactory.getButton("dp", "Discard All Hands", "card-burn", "")
// 			dp.addEventListener('click', () => {
// 				this.discardAllHands()
// 				this.updateOBR()
// 				this.renderDeck()
// 			})
// 			discarddiv.appendChild(dp)
// 			const shf = ButtonFactory.getButton("shf", "Shuffle", "stack", "")
// 			shf.addEventListener('click', () => {
// 				this.newGame()
// 				this.updateOBR()
// 				this.renderDeck()
// 			})
// 			discarddiv.appendChild(shf)
// 		}

// 		let discardleg = discardcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
// 		discardleg.textContent = `Discard Pile [${this.discardpile.length}]`

// 		while (discardcarddiv.firstChild) {
// 			discardcarddiv.removeChild(discardcarddiv.firstChild);
// 		}

// 		let x = 0
// 		let inc = Util.rem2px(Card.cardStacked())
// 		for (const c of this.discardpile) {
// 			let card = Card.byId(c)
// 			card.render(discardcarddiv, x, 0, Facing.Up)
// 			x = x + inc
// 		}
// 	}

// 	renderCardPool(container: HTMLDivElement) {
// 		const doc = container.ownerDocument
// 		let specialcarddiv = doc.getElementById("cardpoolcards") as HTMLDivElement
// 		if (!specialcarddiv) {
// 			const specialfieldset = doc.createElement('fieldset') as HTMLFieldSetElement
// 			const specialleg = doc.createElement('legend') as HTMLLegendElement
// 			specialfieldset.appendChild(specialleg)
// 			specialfieldset.classList.add("flex-container")
// 			specialfieldset.id = "Pool"
// 			specialfieldset.title = "Card Pool"
// 			const specialdiv = doc.createElement('div') as HTMLDivElement
// 			specialdiv.classList.add("flex-item-3")
// 			specialdiv.classList.add(Card.relcard[0])
// 			specialcarddiv = doc.createElement('div') as HTMLDivElement
// 			specialcarddiv.id = "cardpoolcards"
// 			specialcarddiv.classList.add("flex-item-2")
// 			specialcarddiv.classList.add(...Card.concard)
// 			specialfieldset.appendChild(specialdiv)
// 			specialfieldset.appendChild(specialcarddiv)
// 			container.appendChild(specialfieldset)
// 			const cp = ButtonFactory.getButton("cp", "Draw a Card", "card-pickup", "")
// 			cp.addEventListener('click', () => {
// 				this.moveToSpecialPool(this.drawdeck, 1)
// 				this.updateOBR()
// 				this.renderDeck()
// 			})
// 			specialdiv.appendChild(cp)

// 			const dcp = ButtonFactory.getButton("dcp", "Discard Card Pool", "card-burn", "")
// 			dcp.addEventListener('click', () => {
// 				this.moveToDiscardPool(this.cardpool, 0)
// 				this.updateOBR()
// 				this.renderDeck()
// 			})
// 			specialdiv.appendChild(dcp)
// 		}

// 		let specialleg = specialcarddiv.parentElement?.querySelector('legend') as HTMLLegendElement
// 		specialleg.textContent = `Card Pool [${this.cardpool.length}]`

// 		while (specialcarddiv.firstChild) {
// 			specialcarddiv.removeChild(specialcarddiv.firstChild);
// 		}

// 		let x = 0
// 		let inc = Util.rem2px(Card.cardStacked())
// 		for (const c of this.cardpool) {
// 			let card = Card.byId(c)
// 			card.render(specialcarddiv, x, 0, Facing.Up)
// 			x = x + inc
// 		}
// 	}

// 	renderPlayers(div: HTMLDivElement) {
// 		let y = 0
// 		let x = 0
// 		this.players.sort((a, b) => {
// 			const aa = (a.bestCard() === undefined) ? 0 : a.bestCard() ?? 0
// 			const bb = (b.bestCard() === undefined) ? 0 : b.bestCard() ?? 0
// 			return bb - aa
// 		})
// 		for (const p of this.players) {
// 			p.removeRender()
// 			p.render(div, x, y)
// 		}
// 	}

// 	setCurrentPlayer(pid: string) {
// 		this.currentPlayer = 0 //pid
// 		for (let fs of document.querySelectorAll('fieldset[data-pid]')) {
// 			if (fs.getAttribute('data-pid') === pid) {
// 				fs.classList.add("nextplayer")
// 			} else {
// 				fs.classList.remove("nextplayer")
// 			}
// 		}
// 	}

// 	showNotification(message: string, level: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING" = "DEFAULT") {
// 		try {
// 			OBR.notification.show(message, level)
// 		} catch (error) {
// 			console.error('Failed to show notification:', error)
// 		}
// 	}

// 	async updateState(dmd: DeckMeta) {
// 		if (dmd) {
// 			this.setMeta = dmd
// 		} else {
// 			console.log("No metadata found for this extension in the room.");
// 			this.newGame()
// 			this.updateOBR()
// 		}
// 	}

// 	updateOBR() {
// 		//this should never happen, but with moving state back and forth from obr, just to be safe
// 		let missing=this.checkfororphans()
// 		if (missing.length>0) {
// 			//send any missing cards to the discard pool
// 			console.log(`Missing cards: ${missing.toString}`)
// 			this.moveToDiscardPool(missing,0)
// 		}			
// 		const dmd = this.getMeta
// 		OBR.room.setMetadata({
// 			[Util.DeckMkey]: dmd
// 		})
// 		for (let p of this.players) {
// 			p.updateOBR()
// 		}
// 	}
// }
