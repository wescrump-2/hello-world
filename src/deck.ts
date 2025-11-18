import OBR from "@owlbear-rodeo/sdk";
import { PlayerChar, CURRENT_PLAYER_ID } from "./player";
import { Card, Facing } from "./cards";
import { debounceRender, Util } from "./util";

export interface DeckMeta {
	drawdeck: number[];
	discardpile: number[];
	cardpool: number[];
	chosenList: PlayerCard[];  // Legacy; now internal Map, but kept for serialization
	currentRound: number;
	currentPlayer: number;
	back: number;
	use4jokers: boolean;
	scale: number;
}

export class PlayerCard {
	ownerId: string;
	chosenCard: number;
	constructor(oid: string, choice: number) {
		this.ownerId = oid;
		this.chosenCard = choice;
	}
}

export class Deck {
	private static instance: Deck;
	public needsFullRender = true;  // Dirty flag for optimization
	public isGM: boolean = false;
	public activePlayerPids: Set<string> = new Set();

	// get activePlayerPids(): Set<string> { return this.activePids; }
	//updateActivePlayerPids(pids: Set<string>) { this.activePids = pids; }

	// Graphic assets
	private svgcontainer!: HTMLDivElement;
	private jokerNotified: number = 0;
	private players: Map<string, PlayerChar> = new Map();  // ID → Player for O(1) lookup
	private chosenCards: Map<string, Set<number>> = new Map();  // ownerId → Set of chosen card IDs

	// Game state
	private meta: DeckMeta = {
		back: 0,
		cardpool: [],
		currentPlayer: -1,
		currentRound: 0,
		discardpile: [],
		drawdeck: [],
		chosenList: [],  // For OBR serialization
		scale: 1,
		use4jokers: false,
	};

	private constructor() { }

	// Getters and Setters (immutable where possible)
	get getMeta(): DeckMeta { return { ...this.meta, chosenList: this.serializeChosenList() }; }
	set setMeta(newMeta: DeckMeta) {
		Object.assign(this.meta, newMeta);
		this.needsFullRender = true;
		if (!this.chosenList) this.chosenList = [];
	}
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

	get playersArray(): PlayerChar[] { return Array.from(this.players.values()); }
	get chosenList(): PlayerCard[] { return this.serializeChosenList(); }
	set chosenList(cl: PlayerCard[]) {
		this.chosenCards.clear();
		cl.forEach(pc => this.addPlayerChoice(pc.ownerId, pc.chosenCard));
	}

	private serializeChosenList(): PlayerCard[] {
		const list: PlayerCard[] = [];
		this.chosenCards.forEach((cards, ownerId) => {
			cards.forEach(card => list.push(new PlayerCard(ownerId, card)));
		});
		return list.sort((a, b) => a.chosenCard - b.chosenCard);
	}

	getImageSvg(c: Card): string {
		return c.dir === Facing.Up ? c.face.innerHTML : this.backsvg.innerHTML;
	}

	changeBack() {
		this.back = (++this.back >= Card.backs.length) ? 0 : this.back;
		this.needsFullRender = true;
	}

	public static getInstance(): Deck {
		if (!Deck.instance) {
			Deck.instance = new Deck();
			Deck.instance.svgcontainer = document.getElementById('svgContainer') as HTMLDivElement;
			Deck.instance.shuffle();
			Deck.instance.initCardSelectionDelegation();
		}
		return Deck.instance;
	}

	addPlayerChoice(oid: string, choice: number): PlayerCard {
		if (!this.chosenCards.has(oid)) this.chosenCards.set(oid, new Set());
		this.chosenCards.get(oid)!.add(choice);
		return new PlayerCard(oid, choice);
	}

	removePlayerChoice(oid: string, choice: number): PlayerCard | null {
		const set = this.chosenCards.get(oid);
		if (set?.has(choice)) {
			set.delete(choice);
			if (set.size === 0) this.chosenCards.delete(oid);
			return new PlayerCard(oid, choice);
		}
		return null;
	}

	togglePlayerChoice(ownid: string, card: number) {
		const set = this.chosenCards.get(ownid) || new Set();
		if (set.has(card)) {
			set.delete(card);
			if (set.size === 0) this.chosenCards.delete(ownid);
		} else {
			set.add(card);
			this.chosenCards.set(ownid, set);
		}
		this.needsFullRender = true;
		debounceRender(() => this.renderDeck());
	}

	removeChoiceCards(cards: number[]) {
		cards.forEach(card => {
			this.chosenCards.forEach(set => set.delete(card));
			this.chosenCards.forEach((set, oid) => {
				if (set.size === 0) this.chosenCards.delete(oid);
			});
		});
	}

	getPlayerChoices(oid: string): PlayerCard[] {
		const set = this.chosenCards.get(oid);
		return set ? Array.from(set).map(c => new PlayerCard(oid, c)) : [];
	}

	isCardSelected(card: number): boolean {
		return Array.from(this.chosenCards.values()).some(set => set.has(card));
	}

	newGame() {
		this.newRound();
		this.returnCardsToDeck(this.cardpool);
		this.returnCardsToDeck(this.discardpile);
		this.shuffle();
		this.needsFullRender = true;
	}

	drawInitiative() {
		this.playersArray.forEach(p => p.drawInitiative());
		this.needsFullRender = true;
	}

	drawInterlude() {
		this.playersArray.forEach(p => p.drawInterlude());
		this.needsFullRender = true;
	}

	discardAllHands() {
		this.playersArray.forEach(p => p.discardHand());
		this.needsFullRender = true;
	}

	getPlayerByOwnerId(ownerId: string | null): PlayerChar | null {
		return ownerId ? this.players.get(ownerId) ?? null : null;
	}

	getPlayerById(pid: string | null): PlayerChar | null {
		return pid ? this.players.get(pid) ?? null : null;
	}

	newRound() {
		this.playersArray.forEach(p => {
			this.moveToDiscardPool(p.hand);
			p.hand = [];
		});
		this.needsFullRender = true;
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
			...this.playersArray.flatMap(p => p.hand.slice()),
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
		if (this.discardpile.includes(card)) return this.discardpile;
		if (this.cardpool.includes(card)) return this.cardpool;
		if (this.drawdeck.includes(card)) return this.drawdeck;
		for (const p of this.playersArray) {
			if (p.hand.includes(card)) return p.hand;
		}
		return [];
	}

	getPlayerWithCard(card: number): PlayerChar | null {
		for (const p of this.playersArray) {
			if (p.hand.includes(card)) return p;
		}
		return null;
	}

	dealFromTop(hand: number[], numCards: number, dir: Facing) {
		if (numCards > this.drawdeck.length) {
			this.showNotification('Deck depleted, shuffle all cards and redeal.', "ERROR");
			return;
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
		const indx = from.findIndex((c) => c === card);
		if (indx !== -1) {
			try {
				const movedCard = Card.byId(from[indx]);
				if (dir !== Facing.None) movedCard.dir = dir;
				from.splice(indx, 1);
				if (!to.includes(movedCard.sequence)) {
					to.push(movedCard.sequence);
				} else {
					console.error(`Duplicate card found: [${movedCard.sequence}] ${movedCard.toString()}`);
				}
			} catch (error) {
				console.error('Error moving cards:', error);
			}
		}
	}

	removeCard(set: number[], card: number): void {
		const index = set.indexOf(card);
		if (index > -1) set.splice(index, 1);
	}

	removeCardAll(card: number) {
		// Remove from ALL locations - ensures no duplicates linger
		this.removeCard(this.drawdeck, card);
		this.removeCard(this.discardpile, card);
		this.removeCard(this.cardpool, card);
		this.playersArray.forEach(p => this.removeCard(p.hand, card));
		this.removeChoiceCards([card]);
	}

	moveToPool(to: number[], from: number[], numCards: number = 0, top: boolean = true, dir: Facing = Facing.None) {
		const limit = numCards === 0 ? from.length : Math.min(numCards, from.length);
		if (limit > 0) {
			try {
				const tempSet = new Set<number>();  // Track moved cards
				for (let i = 0; i < limit; i++) {
					const cid = top ? from.shift()! : from.pop()!;
					if (cid && !tempSet.has(cid)) {
						tempSet.add(cid);
						this.removeCardAll(cid);
						const cardObj = Card.byId(cid);
						if (dir !== Facing.None) cardObj.dir = dir;
						if (!to.includes(cid)) {  // Extra guard
							to.push(cid);
						} else {
							console.warn(`Duplicate prevented in 'to': ${cid}`);
						}
					} else if (cid) {
						console.warn(`Skipped duplicate CID in single move: ${cid}`);
					}
				}
			} catch (error) {
				console.error('Error moving cards:', error);
			}
		}
	}
	public getMaxChosenInHand(hand: number[]): number {
		let maxChosen = -1;
		this.chosenCards.forEach((chosenSet) => {
			const intersection = hand.filter(c => chosenSet.has(c));
			if (intersection.length > 0) {
				const localMax = Math.max(...intersection);
				if (localMax > maxChosen) {
					maxChosen = localMax;
				}
			}
		});
		return maxChosen;
	}

	checkfororphans(): number[] {
		console.log('Orphans check — total drawnCards length:', this.drawnCards.length);

		const allCards = new Set([...this.drawdeck, ...this.drawnCards]);
		const missing = Array.from({ length: this.deckcount }, (_, i) => i + 1).filter(c => !allCards.has(c));

		const handCards = this.playersArray.flatMap(p => p.hand);
		const handMissing = handCards.filter(c => !allCards.has(c));  // ← ADD: Log if hands "missing"
		if (handMissing.length > 0) console.error('Hand cards treated as missing:', handMissing);

		return missing;
	}

	extractPlayerCards(p: PlayerChar) {
		const playerCardsSet = new Set(p.hand);
		this.drawdeck = this.drawdeck.filter(c => !playerCardsSet.has(c));
		this.discardpile = this.discardpile.filter(c => !playerCardsSet.has(c));
		this.cardpool = this.cardpool.filter(c => !playerCardsSet.has(c));
	}

	jokersDrawn(): number {
		return this.playersArray.filter(p => p.hasJoker()).length
			+ this.discardpile.filter(Card.isJoker).length
			+ this.cardpool.filter(Card.isJoker).length;
	}

	addPlayer(name: string, id: string, playerId: string): PlayerChar {
		const p = new PlayerChar(name, id, playerId);
		this.players.set(id, p);
		this.needsFullRender = true;
		return p;
	}

	removePlayer(player: PlayerChar) {
		const id = player.id;
		if (this.players.has(id)) {
			try {
				//const fieldset = document.querySelector<HTMLFieldSetElement>(`fieldset[data-pid="${id}"]`);
				//fieldset?.parentElement?.removeChild(fieldset);
				//if (fieldset) fieldset.remove();
				document.querySelector(`fieldset[data-pid="${id}"]`)?.remove();
				this.moveToDiscardPool(player.hand);
				player.hand = [];
				this.players.delete(id);
				this.chosenCards.delete(id);
				this.needsFullRender = true;
			} finally {
				player.removeOBR();
			}
			this.renderDeck();
		}
	}
	private updatePlayerOrderAndHighlight() {
		const div = this.svgcontainer;
		if (div.children.length === 0) return;

		// Sort logical array
		const sortedPlayers = this.playersArray.sort((a, b) => (b.bestCard() ?? 0) - (a.bestCard() ?? 0));
		const topPid = sortedPlayers[0]?.id || "";

		// Re-render/sort DOM fieldsets to match logical order (efficient: no full player re-render)
		sortedPlayers.forEach(p => {
			const pfs = div.querySelector(`fieldset[data-pid="${p.id}"]`);
			if (pfs) {
				div.removeChild(pfs);
				div.appendChild(pfs);  // Re-append in sorted order
			}
		});

		// Remove orphans (unchanged)
		for (const pdiv of Array.from(div.querySelectorAll(`fieldset[data-pid]`))) {
			const ppdiv = pdiv as HTMLFieldSetElement;
			if (!this.players.has(ppdiv.dataset.pid || '')) {
				div.removeChild(ppdiv);
			}
		}

		// Highlight top one
		document.querySelectorAll('fieldset[data-pid]').forEach(s => {
			const fs = s as HTMLFieldSetElement;
			fs.classList.toggle('nextplayer', fs.dataset.pid === topPid);
		});

		// Update meta if needed (use actual index; was hardcoded to 0)
		this.currentPlayer = sortedPlayers.findIndex(p => p.id === topPid);  // Typically 0, but dynamic
	}

	renderDeck() {
		////this.initCardSelectionDelegation();

		if (!this.needsFullRender && this.svgcontainer.children.length > 0) {
			this.updatePlayerOrderAndHighlight();
			this.checkJokerNotification();
			return;
		}

		this.needsFullRender = false;

		this.renderDraw(this.svgcontainer);
		if (this.isGM) {
			this.renderDiscardPile();
			this.renderCardPool();
		}
		this.renderPlayers(this.svgcontainer);
		this.updatePlayerOrderAndHighlight();
		this.checkJokerNotification();
	}

	// Common pile renderer
	private renderPile(id: string, title: string, cards: number[], facing: Facing, increment: string, buttonsConfig: Array<{ id: string; label: string; icon: string; handler: () => void }>) {
		const doc = this.svgcontainer.ownerDocument;
		let fieldset = doc.getElementById(id) as HTMLFieldSetElement;
		const legid = `leg${id}`;
		const cardsid = `${id.toLowerCase()}cards`;

		if (!fieldset) {
			fieldset = this.createPileFieldset(doc, id, title, legid, cardsid, buttonsConfig);
			this.svgcontainer.appendChild(fieldset);
		}

		const legend = fieldset.querySelector(`#${legid}`) as HTMLLegendElement;
		legend.textContent = `${title} [${cards.length}]`;
		legend.setAttribute('aria-label', `${title} with ${cards.length} cards`);

		const butdiv = fieldset.children[1] as HTMLDivElement;
		butdiv.style.display = Util.display(this.isGM);

		const carddiv = fieldset.children[2] as HTMLDivElement;
		this.clearAndRenderCards(carddiv, cards, facing, increment);
	}

	private createPileFieldset(doc: Document, id: string, title: string, legid: string, cardsid: string, buttonsConfig: Array<{ id: string; label: string; icon: string; handler: () => void }>) {
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const legend = doc.createElement('legend');
		legend.id = legid;
		fieldset.title = title;
		fieldset.appendChild(legend);

		fieldset.classList.add("flex-container");
		fieldset.id = id;

		const butdiv = doc.createElement('div') as HTMLDivElement;
		butdiv.classList.add('flex-item-3', Card.relcard[0]);

		// Attach buttons
		buttonsConfig.forEach(config => {
			const btn = Util.getButton(butdiv, config.id, config.label, config.icon, '');
			btn.setAttribute('aria-label', config.label);
			btn.addEventListener('click', () => {
				config.handler();
				this.updateOBR();
			});
			butdiv.appendChild(btn);
		});

		const cardDiv = doc.createElement('div') as HTMLDivElement;
		cardDiv.id = cardsid;
		cardDiv.classList.add('flex-item-2', ...Card.concard);
		fieldset.appendChild(butdiv);
		fieldset.appendChild(cardDiv);

		return fieldset;
	}

	renderDraw(container: HTMLDivElement) {
		this.renderPile(
			'Draw',
			'Draw Deck',
			this.drawdeck,
			Facing.Down,
			'--card-stacked-down-inc',
			[
				{ id: 'di', label: 'Deal Action Cards', icon: 'card-draw', handler: () => this.drawInitiative() },
				{ id: 'dibt', label: 'Deal Interlude cards', icon: 'suits', handler: () => this.drawInterlude() },
				{ id: 'joke', label: 'Use Four Jokers', icon: 'joker', handler: () => this.toggleJokers() },
				{ id: 'cb', label: 'Change back of deck', icon: 'card-exchange', handler: () => this.changeBack() }
			]
		);

		// Special: Toggle joker button state
		const jokeBtn = container.querySelector('#joke') as HTMLButtonElement;
		if (jokeBtn) Util.setState(jokeBtn, this.use4jokers);
	}

	renderDiscardPile() {
		this.renderPile(
			'Discard',
			'Discard Pile',
			this.discardpile,
			Facing.Up,
			'--card-spread-inc',
			[
				{ id: 'shf', label: 'Shuffle', icon: 'stack', handler: () => this.newGame() },
				{ id: 'dah', label: 'Discard All Hands', icon: 'card-burn', handler: () => this.discardAllHands() }
			]
		);
	}

	renderCardPool() {
		this.renderPile(
			'Pool',
			'Card Pool',
			this.cardpool,
			Facing.Up,
			'--card-spread-inc',
			[
				{ id: 'cp', label: 'Deal a card to pool', icon: 'card-play', handler: () => this.dealFromTop(this.cardpool, 1, Facing.Up) },
				{ id: 'dcp', label: 'Discard Card Pool', icon: 'card-burn', handler: () => this.moveToDiscardPool(this.cardpool, 0) }
			]
		);
	}

	renderPlayers(div: HTMLDivElement) {
		//let x = 0, y = 0;
		this.playersArray.forEach(p => {
			p.render(div);//, x, y++);  // Render without sorting (sort happens in updatePlayerOrderAndHighlight)
		});

	}

	setCurrentPlayer(pid: string) {
		this.currentPlayer = 0;
		document.querySelectorAll('fieldset[data-pid]').forEach(s => {
			const fs = s as HTMLFieldSetElement;
			fs.classList.toggle('nextplayer', fs.dataset.pid === pid);
		});
	}

	private checkJokerNotification() {
		const drawnJokers = this.jokersDrawn();
		if (drawnJokers > this.jokerNotified) {
			this.showNotification('Joker drawn, shuffle and issue Bennies.', "INFO");
			this.jokerNotified = drawnJokers;
		}
	}

	showNotification(message: string, level: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING" = "DEFAULT") {
		try {
			OBR.notification.show(message, level);
		} catch (error) {
			console.error('Failed to show notification:', error);
		}
	}

	async updateState(dmd?: DeckMeta) {
		if (dmd) {
			this.setMeta = dmd;
			if (this.chosenList.length === 0) {
				this.chosenList = [];
				//await this.updateOBR();
			}
		} else {
			console.log("No metadata found for this extension in the room.");
			this.newGame();
			await this.updateOBR();
		}
	}

	async updateOBR() {
		console.log('updateOBR called — hands count:', this.playersArray.reduce((sum, p) => sum + p.hand.length, 0));  // ← ADD: Log hands before orphans
		const missing = this.checkfororphans();
		if (missing.length > 0) {
			console.error(`Missing cards: ${missing.join(', ')}`);
			this.moveToDiscardPool(missing, 0);
		}
		const dmd = this.getMeta;
		try {
			await OBR.room.setMetadata({ [Util.DeckMkey]: dmd });
			await Promise.all(this.playersArray.map(p => p.updateOBR()));
		} catch (error) {
			console.error('Failed to update OBR:', error);
		}
	}

	// Private rendering helpers
	private clearAndRenderCards(container: HTMLDivElement, cards: number[], facing: Facing, cardIncrement: string) {
		container.innerHTML = '';  // Faster than while loop for modern browsers
		let x = 0;
		const inc = Util.offset(cardIncrement, cards.length);
		cards.forEach(c => {
			const card = Card.byId(c);
			const csvg = card.render(container, x, 0, facing);
			csvg.setAttribute('data-card-id', card.sequence.toString());
			csvg.classList.add('card');  // For click handling
			if (this.isCardSelected(card.sequence)) csvg.classList.add("chosen");
			x += inc;
		});
	}

	private initCardSelectionDelegation() {
		if (this.svgcontainer.dataset.cardDelegation === 'true') return;
		this.svgcontainer.dataset.cardDelegation = 'true';

		this.svgcontainer.addEventListener('click', async (e) => {
			let target: EventTarget | null = e.target;

			// Walk up from <path>, <rect>, etc. to the <g class="card">
			while (target && target !== this.svgcontainer) {
				if (target instanceof SVGElement && target.classList.contains('card')) {
					break;
				}
				target = (target as Element).parentElement;
			}

			if (!target || !(target instanceof SVGElement) || !target.classList.contains('card')) {
				return;
			}
			const cardIdStr = target.getAttribute('data-card-id');
			if (!cardIdStr) return;

			const cardId = parseInt(cardIdStr, 10);
			if (isNaN(cardId)) return;

			const inPlayerHand = !!target.closest('fieldset[data-pid]');
			const isGM = (await OBR.player.getRole()) === "GM";

			if (!inPlayerHand && !isGM) {
				return; // Only GM can select from shared piles
			}

			e.stopPropagation();

			try {
				const ownid = CURRENT_PLAYER_ID!;
				this.togglePlayerChoice(ownid, cardId);
				await this.updateOBR();
				debounceRender(() => this.renderDeck())
			} catch (err) {
				console.error('Card selection failed:', err);
			}
		});
	}
}