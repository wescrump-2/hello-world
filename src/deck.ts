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
		if (numCards > this.drawdeck.length) {
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
			} catch (error) {
				console.error('Error moving cards:', error);
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

	addPlayer(name: string, id: string): Player {
		const p = new Player(name, id);
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
			this.showNotification('Joker drawn, shuffle and issue Bennies.', "INFO");
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
					{ id: "joke", label: "Use Four Jokers", icon: "joker", setting: this.use4jokers, toggle: true, action: () => this.toggleJokers() },
					{ id: "sb", label: "Change Backs", icon: "card-exchange", action: () => this.changeBack() }
				]);
			}
		}

		const legend = deckCardDiv.parentElement?.querySelector('legend') as HTMLLegendElement;
		legend.textContent = `Draw Deck [${this.drawdeck.length}]`;

		this.clearAndRenderCards(deckCardDiv, this.drawdeck, Facing.Down, '--card-stacked-down-inc');
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
	private addGMButtons(container: HTMLFieldSetElement, buttons: { id: string; label: string; icon: string; setting?: boolean; toggle?: boolean; action: () => void }[]) {
		const div = container.querySelector('div') as HTMLDivElement;
		buttons.forEach(({ id, label, icon, setting, toggle, action }) => {
			const button = ButtonFactory.getButton(id, label, icon, "");
			if (toggle) {
				if (setting) 
					button.classList.add(ButtonFactory.SUCCESS_CLASS);
				else
				    button.classList.remove(ButtonFactory.SUCCESS_CLASS)
			}
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

		this.clearAndRenderCards(discardCardDiv, this.discardpile, Facing.Up, '--card-spread-inc');
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
						this.dealFromTop(this.cardpool, 1, Facing.Up);
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

		this.clearAndRenderCards(specialCardDiv, this.cardpool, Facing.Up, '--card-spread-inc');
	}

	// Helper function to clear and render cards
	private clearAndRenderCards(container: HTMLDivElement, cards: number[], facing: Facing, cardIncrement: string) {
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}
		let x = 0
		// let ff = 2
		// let inc = Util.rem2px(Card.cardSpread(cardIncrement))
		// if ( '--card-spread-inc' === cardIncrement) {
		// 	if (cards.length > 7) inc /= ff
		// 	if (cards.length > 13) inc /= ff
		// 	if (cards.length > 26) inc /= ff
		// 	if (cards.length > 39) inc /= ff
		// }
		// inc=Math.max(8,Math.ceil(inc))
		let inc = Util.offset(cardIncrement, cards.length)
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
			this.renderDeck();
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
