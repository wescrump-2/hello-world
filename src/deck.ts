import OBR from "@owlbear-rodeo/sdk";
import { PlayerChar } from "./player";
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
export class PlayerCard {
	static choosenList: PlayerCard[] = []
	static addChoice(oid: string, choice: number): PlayerCard {
		const pc = new PlayerCard(oid, choice)
		PlayerCard.choosenList.push(pc)
		return pc
	}
	static removeChoice(oid: string, choice: number) {
		let rem = null
		const indexToRemove = PlayerCard.choosenList.findIndex(pc => pc.ownerId === oid && pc.choosenCard === choice)
		if (indexToRemove !== -1) {
			rem = PlayerCard.choosenList[indexToRemove]
			PlayerCard.choosenList.splice(indexToRemove, 1);
		}
		return rem
	}
	static toggleChoice(ownid: string, card: number) {
		if (PlayerCard.choosenList.findIndex(pc => pc.choosenCard === card) != -1) {
			PlayerCard.removeChoice(ownid, card)
		} else {
			PlayerCard.addChoice(ownid, card)
		}
	}
	static removeCards(cards: number[]) {
		for (let card of cards) {
			let indexToRemove = PlayerCard.choosenList.findIndex(pc => pc.choosenCard === card)
			if (indexToRemove !== -1) {
				PlayerCard.choosenList[indexToRemove]
				PlayerCard.choosenList.splice(indexToRemove, 1);
			}
		}
	}

	static getChoices(oid: string): PlayerCard[] {
		let pc = PlayerCard.choosenList.filter((o) => o.ownerId === oid)
		return pc
	}

	ownerId: string
	choosenCard: number
	constructor(oid: string, choice: number) {
		this.ownerId = oid
		this.choosenCard = choice
	}

}

export class Deck {
	private static instance: Deck;
	isGM: boolean = false;
	private constructor() { }

	// Graphic assets
	svgbuttons!: HTMLObjectElement;
	svgcontainer!: HTMLDivElement;
	jokerNotified: number = 0;
	playerList: PlayerChar[] =[];

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
	get players(): PlayerChar[] { return this.playerList; }
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
		this.returnCardsToDeck(this.cardpool);
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

	getPlayerByOwnerId(ownerId: string | null): PlayerChar | null {
		const p = this.players.find(p => p.playerId === ownerId)
		if (p) return p
		else return null
	}

	getPlayerById(pid: string | null): PlayerChar | null {
		const p = this.players.find(p => p.id === pid)
		if (p) return p
		else return null
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
	getTimeBasedRandomNumber(): number {
		const now = new Date().getTime();
		const seed = now % 1000;
		const random = (seed / 1000);
		const result = Math.floor(random * 8) + 2;
		return result;
	}

	shuffle() {
		this.initializeDeck();
		for (let s = 0; s < this.getTimeBasedRandomNumber(); s++) {
			for (let i = this.drawdeck.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[this.drawdeck[i], this.drawdeck[j]] = [this.drawdeck[j], this.drawdeck[i]];
			}
		}
	}

	cut(index: number) {
		this.drawdeck = [...this.drawdeck.slice(index), ...this.drawdeck.slice(0, index)];
	}

	getDeckwithCard(card: number): number[] {
		let result: number[] = []
		if (this.discardpile.includes(card)) result = this.discardpile
		if (this.cardpool.includes(card)) result = this.cardpool
		if (this.drawdeck.includes(card)) result = this.drawdeck
		for (let p of this.players) {
			if (p.hand.includes(card)) {
				result = p.hand
			}
		}
		return result
	}

	getPlayerWithCard(card: number): PlayerChar | null {
		for (let p of this.players) {
			if (p.hand.includes(card)) {
				return p
			}
		}
		return null
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

	moveCardToPool(to: number[], from: number[], card: number, dir: Facing = Facing.None) {
		const indx = from.findIndex((c) => c === card)
		if (indx != -1) {
			try {
				let card = Card.byId(from[indx]);
				if (dir !== Facing.None) card.dir = dir;
				if (!to.includes(card.sequence)) {
					from.splice(indx, 1);
					to.push(card.sequence);
				} else {
					console.error(`Duplicate card found: [${card.sequence}] ${card.toString()}`);
				}
			} catch (error) {
				console.error('Error moving cards:', error);
			}
		} else {
			//console.log('From does not have card, no move.');
		}
	}

	moveToPool(to: number[], from: number[], numCards: number = 0, top: boolean = true, dir: Facing = Facing.None) {
		const limit = (numCards === 0) ? from.length : Math.min(numCards, from.length);
		if (limit > 0) {
			try {
				for (let i = 0; i < limit; i++) {
					const cid = top ? from.shift()! : from.pop()!;
					let card = Card.byId(cid);
					if (dir !== Facing.None) card.dir = dir;
					if (!to.includes(cid)) {
						to.push(cid);
					} else {
						console.error(`Duplicate card found: [${cid}] ${card.toString()}`);
					}
				}
			} catch (error) {
				console.error('Error moving cards:', error);
			}
		}
	}

	checkfororphans(): number[] {
		const allCards = [...this.drawdeck, ...this.drawnCards];
		return Array.from({ length: this.deckcount }, (_, i) => i + 1).filter(c => !allCards.includes(c));
	}

	extractPlayerCards(p: PlayerChar) {
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

	addPlayer(name: string, id: string, playerId: string): PlayerChar {
		const p = new PlayerChar(name, id, playerId);
		this.players.push(p);
		return p;
	}

	removePlayer(player: PlayerChar) {
		const index = this.players.findIndex(p => p.id === player.id);
		if (index !== -1) {
			try {
				const p = this.players[index]
				let pf = document.querySelector<HTMLFieldSetElement>(`fieldset[data-pid="${p.id}]"`)
				if (pf) {
					pf.parentElement?.removeChild(pf)
				}
				this.moveToDiscardPool(p.hand);
				this.players.splice(index, 1);
			} finally {
				player.removeOBR();
			}
		}
	}

	renderDeck() {
		this.renderDraw(this.svgcontainer);
		//if (this.isGM) {
		this.renderDiscardPile(this.svgcontainer);
		this.renderCardPool(this.svgcontainer);
		//}
		this.renderPlayers(this.svgcontainer);
		this.setCurrentPlayer(this.players[0]?.id || "");
		const drawnJokers = this.jokersDrawn();
		if (drawnJokers > this.jokerNotified) {
			this.showNotification('Joker drawn, shuffle and issue Bennies.', "INFO");
			this.jokerNotified = drawnJokers;
		}
	}

	isCardSelected(card: number): boolean {
		for (let pc of PlayerCard.choosenList) {
			if (card === pc.choosenCard) return true
		}
		return false
	}

	// Helper function to clear and render cards
	private clearAndRenderCards(container: HTMLDivElement, cards: number[], facing: Facing, cardIncrement: string) {
		while (container.firstChild) {
			container.removeChild(container.firstChild);
		}
		let x = 0
		let inc = Util.offset(cardIncrement, cards.length)
		for (const c of cards) {
			const card = Card.byId(c)
			const csvg = card.render(container, x, 0, facing);
			if (this.isCardSelected(card.sequence)) csvg.classList.add("choosen");

			if (this.isGM) {
				csvg.addEventListener('click', async () => {
					const ownid = await OBR.player.getId();
					//const player = this.getPlayerByOwnerId(pid)
					PlayerCard.toggleChoice(ownid, card.sequence)
					//pc.choosenCard = player.choosencard === card.sequence ? -1 : card.sequence;
					//player.updateOBR()
					this.updateOBR()
				});
			}
			x += inc;
		}
	}

	// Render the draw deck
	renderDraw(container: HTMLDivElement) {
		const doc = container.ownerDocument;
		let id = 'Draw'
		let title = 'Draw Deck'
		let cardsid = 'drawdeckcards'
		let legid = `leg${id}`
		let fieldset = doc.getElementById(id) as HTMLFieldSetElement
		if (!fieldset) {
			fieldset = doc.createElement('fieldset') as HTMLFieldSetElement
			const legend = doc.createElement('legend')
			legend.id = legid
			fieldset.title = title
			fieldset.appendChild(legend)

			fieldset.classList.add("flex-container")
			fieldset.id = id
			const butdiv = doc.createElement('div') as HTMLDivElement
			butdiv.classList.add('flex-item-3', Card.relcard[0])
			const cardDiv = doc.createElement('div') as HTMLDivElement
			cardDiv.id = cardsid
			cardDiv.classList.add('flex-item-2', ...Card.concard)
			fieldset.appendChild(butdiv)
			fieldset.appendChild(cardDiv)
			this.svgcontainer.appendChild(fieldset)

			//buttons
			const di = Util.getButton(butdiv, 'di', 'Deal Action Cards', 'card-draw', '')
			di.addEventListener('click', () => {
				this.drawInitiative()
				this.updateOBR()
			})
			butdiv.appendChild(di)

			const dint = Util.getButton(butdiv, 'dibt', 'Deal Interlude cards', 'suits', '')
			dint.addEventListener('click', () => {
				this.drawInterlude()
				this.updateOBR()
			})
			butdiv.appendChild(dint)

			const joke = Util.getButton(butdiv, 'joke', 'Use Four Jokers', 'joker', '')
			joke.addEventListener('click', () => {
				this.toggleJokers()
				this.updateOBR()
			})
			butdiv.appendChild(joke)

			const cb = Util.getButton(butdiv, 'cb', 'Change back of deck', 'card-exchange', '')
			cb.addEventListener('click', () => {
				this.changeBack()
				this.updateOBR()
			})
			butdiv.appendChild(cb)
		}
		const joke = doc.getElementById('joke') as HTMLButtonElement
		Util.setState(joke, this.use4jokers)

		const legend = fieldset.querySelector(`#${legid}`) as HTMLLegendElement;
		legend.textContent = `Draw Deck [${this.drawdeck.length}]`;

		let butdiv = fieldset.children[1] as HTMLDivElement
		butdiv.style.display = Util.display(this.isGM)
		let carddiv = fieldset.children[2] as HTMLDivElement
		this.clearAndRenderCards(carddiv, this.drawdeck, Facing.Down, '--card-stacked-down-inc');
	}

	// Render the discard pile
	renderDiscardPile(container: HTMLDivElement) {
		const doc = container.ownerDocument;
		let id = 'Discard'
		let title = 'Discard Pile'
		let cardsid = 'discardpilecards'
		let legid = `leg${id}`
		let fieldset = doc.getElementById(id) as HTMLFieldSetElement
		if (!fieldset) {
			fieldset = doc.createElement('fieldset') as HTMLFieldSetElement
			const legend = doc.createElement('legend')
			legend.id = legid
			fieldset.title = title
			fieldset.appendChild(legend)

			fieldset.classList.add("flex-container")
			fieldset.id = id
			const butdiv = doc.createElement('div') as HTMLDivElement
			butdiv.classList.add('flex-item-3', Card.relcard[0])
			const cardDiv = doc.createElement('div') as HTMLDivElement
			cardDiv.id = cardsid
			cardDiv.classList.add('flex-item-2', ...Card.concard)
			fieldset.appendChild(butdiv)
			fieldset.appendChild(cardDiv)
			this.svgcontainer.appendChild(fieldset)

			//buttons
			const shf = Util.getButton(butdiv, 'shf', 'Shuffle', 'stack', '')
			shf.addEventListener('click', () => {
				this.newGame()
				this.updateOBR()
			})
			butdiv.appendChild(shf)

			const dah = Util.getButton(butdiv, 'dah', 'Discard All Hands', 'card-burn', '')
			dah.addEventListener('click', () => {
				this.discardAllHands()
				this.updateOBR()
			})
			butdiv.appendChild(dah)
		}
		const legend = fieldset.querySelector(`#${legid}`) as HTMLLegendElement;
		legend.textContent = `Discard Pile [${this.discardpile.length}]`;

		let butdiv = fieldset.children[1] as HTMLDivElement
		butdiv.style.display = Util.display(this.isGM)
		let carddiv = fieldset.children[2] as HTMLDivElement
		this.clearAndRenderCards(carddiv, this.discardpile, Facing.Up, '--card-spread-inc');
	}

	// Render the card pool
	renderCardPool(container: HTMLDivElement) {
		const doc = container.ownerDocument;
		let id = 'Pool'
		let title = 'Card Pool'
		let cardsid = 'cardpoolcards'
		let legid = `leg${id}`
		let fieldset = doc.getElementById(id) as HTMLFieldSetElement
		if (!fieldset) {
			fieldset = doc.createElement('fieldset') as HTMLFieldSetElement
			const legend = doc.createElement('legend')
			legend.id = legid
			fieldset.title = title
			fieldset.appendChild(legend)
			fieldset.classList.add("flex-container")
			fieldset.id = id
			const butdiv = doc.createElement('div') as HTMLDivElement
			butdiv.classList.add('flex-item-3', Card.relcard[0])
			const cardDiv = doc.createElement('div') as HTMLDivElement
			cardDiv.id = cardsid
			cardDiv.classList.add('flex-item-2', ...Card.concard)
			fieldset.appendChild(butdiv)
			fieldset.appendChild(cardDiv)
			this.svgcontainer.appendChild(fieldset)

			const cp = Util.getButton(butdiv, 'cp', 'Deal a card to pool', 'card-play', '')
			cp.addEventListener('click', () => {
				this.dealFromTop(this.cardpool, 1, Facing.Up);
				this.updateOBR();
			})
			butdiv.appendChild(cp)

			const dcp = Util.getButton(butdiv, 'dcp', 'Discard Card Pool', 'card-burn', '')
			dcp.addEventListener('click', () => {
				this.moveToDiscardPool(this.cardpool, 0);
				this.updateOBR();
			})
			butdiv.appendChild(dcp)
		}
		const legend = fieldset.querySelector(`#${legid}`) as HTMLLegendElement;
		legend.textContent = `Card Pool [${this.cardpool.length}]`;
		let butdiv = fieldset.children[1] as HTMLDivElement
		butdiv.style.display = Util.display(this.isGM)
		let carddiv = fieldset.children[2] as HTMLDivElement
		this.clearAndRenderCards(carddiv, this.cardpool, Facing.Up, '--card-spread-inc');
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
			p.render(div, x, y);
			const pfs = div.querySelector(`fieldset[data-pid="${p.id}"]`)
			if (pfs) {
				div.removeChild(pfs)
				div.appendChild(pfs)
			}
		});
		//remove elements for players that are removed.
		for (let pdiv of div.querySelectorAll(`fieldset[data-pid]`)) {
			const ppdiv = pdiv as HTMLFieldSetElement
			if (!this.players.find(p=>p.id===ppdiv.dataset.pid)) {
				div.removeChild(ppdiv)
			}
		}
	}

	// Set the current player
	setCurrentPlayer(pid: string) {
		this.currentPlayer = 0;
		document.querySelectorAll('fieldset[data-pid]').forEach(s => {
			const fs: HTMLFieldSetElement = s as HTMLFieldSetElement
			fs.classList.toggle('nextplayer', fs.dataset.pid === pid)
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
			await this.updateOBR();
		}
	}

	// Update OBR with current state
	async updateOBR() {
		let missing = this.checkfororphans();
		if (missing.length > 0) {
			console.error(`Missing cards: ${missing.join(', ')}`);
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
