import OBR, { isImage, Image } from "@owlbear-rodeo/sdk";
import { CURRENT_PLAYER_ID, PlayerChar, PlayerMeta } from "./player";
import { Card, Facing } from "./cards";
import { Debug, Util } from "./util";

export type PileId = 'draw' | 'discard' | 'pool' | 'remove' | { characterId: string }

export interface DeckMeta {

	back: number;
	use4jokers: boolean;
	scale: number;
	discardVisible: boolean;
	poolVisible: boolean;
	carddeck: PlayerCard[];
}

export class PlayerCard {
	cid: number = 0;
	pile: PileId = 'draw';
	order: number = 0;
	dealOrder: number = 0;
	selectedBy: string = '';
	constructor(cid: number) {
		this.cid = cid;
		this.order = cid;
	}
}

export class Deck {
	private static instance: Deck;
	public isGM: boolean = false;

	static isSamePile(a: PileId, b: PileId): boolean {
		if (a === b) return true;
		if (typeof a === 'object' && typeof b === 'object') {
			return a.characterId === b.characterId;
		}
		return a === b;
	}

	// Graphic assets
	public svgcontainer!: HTMLDivElement;
	public players: Map<string, PlayerChar> = new Map();
	get playersArray(): PlayerChar[] { return Array.from(this.players.values()); }
	get playerNames(): string[] { return Array.from(this.players.values()).map(p => p.name); }
	// Game state
	private meta: DeckMeta = {
		carddeck: Array.from({ length: 56 }, (_, i) => new PlayerCard(i + 1)),
		back: 0,
		scale: 1,
		use4jokers: false,
		discardVisible: false,
		poolVisible: false,
	};

	private constructor() { }

	get Meta(): DeckMeta { return { ...this.meta }; }
	applyMeta(newMeta: DeckMeta): boolean {
		const changed = JSON.stringify(this.meta) !== JSON.stringify(newMeta);
		Object.assign(this.meta, newMeta);
		return changed
	}
	get back(): number { return this.meta.back; }
	set back(n: number) { this.meta.back = n; }
	get carddeck(): PlayerCard[] { return this.meta.carddeck; }
	set carddeck(cd: PlayerCard[]) { this.meta.carddeck = cd; }
	get cardpool(): number[] {
		return this.meta.carddeck
			.filter(c => Deck.isSamePile(c.pile, 'pool'))
			.sort((a, b) => a.dealOrder - b.dealOrder)
			.map(c => c.cid);
	}

	get discardpile(): number[] {
		return this.meta.carddeck
			.filter(c => Deck.isSamePile(c.pile, 'discard'))
			.sort((a, b) => a.dealOrder - b.dealOrder)
			.map(c => c.cid);
	}

	get drawdeck(): number[] {
		return this.meta.carddeck
			.filter(c => Deck.isSamePile(c.pile, 'draw'))
			.sort((a, b) => a.order - b.order)
			.map(c => c.cid);
	}

	get scale(): number { return this.meta.scale; }
	set scale(s: number) { this.meta.scale = s; }
	get use4jokers(): boolean { return this.meta.use4jokers; }
	set use4jokers(uj: boolean) { this.meta.use4jokers = uj; }
	get discardVisible(): boolean { return this.meta.discardVisible; }
	set discardVisible(dv: boolean) { this.meta.discardVisible = dv; }
	get poolVisible(): boolean { return this.meta.poolVisible; }
	set poolVisible(pv: boolean) { this.meta.poolVisible = pv; }
	get deckcount(): number { return this.use4jokers ? 56 : 54; }
	get backsvg(): SVGElement { return Card.backs[this.back]; }

	private getNextDealOrder(pile: PileId): number {
		const cardsInPile = this.carddeck.filter(c => Deck.isSamePile(c.pile, pile));

		if (cardsInPile.length === 0) {
			return 1;
		}
		const maxInPile = Math.max(...cardsInPile.map(pc => pc.dealOrder || 0));
		return maxInPile + 1;
	}
	public setPile(pc: PlayerCard, newPile: PileId) {
		if (pc.pile !== newPile) {               // Only update if pile actually changes
			pc.pile = newPile;
			pc.dealOrder = this.getNextDealOrder(newPile);  // Newer cards get higher numbers
		}
		pc.selectedBy = '';
	}

	private saveTimeout: number | null = null;
	private saveQueue: Promise<void> = Promise.resolve();
	public triggerPlayerStateChange(): Promise<void> {
		// Cancel any pending timeout
		if (this.saveTimeout !== null) {
			clearTimeout(this.saveTimeout);
			this.saveTimeout = null;
		}

		// Schedule a new save after 300ms of inactivity
		this.saveTimeout = window.setTimeout(() => {
			this.saveQueue = this.saveQueue.then(() => this.performSave());
			this.saveTimeout = null;
		}, 300);

		// Return the eventual save promise
		return this.saveQueue;
	}

	private async performSave(): Promise<void> {
	  const compressed = Util.compress(this.Meta);
	  try {
	    // Ensure scene is ready before saving metadata
	    await Util.ensureSceneReady();
	    await OBR.scene.setMetadata({ [Util.DeckMkey]: compressed });
		} catch (err: any) {
			// This is the EXACT error OBR throws when >16KB
			if (err.message?.includes("metadata") && err.message?.includes("16")) {
				Debug.error("METADATA TOO LARGE (>16KB)! Clearing corrupted data and resetting deck.");

				try {
					// Step 1: Nuke the bad metadata
					await OBR.scene.setMetadata({ [Util.DeckMkey]: null });
					Debug.log("Corrupted metadata cleared");

					// Step 2: Reinitialize clean deck
					this.initializeDeck();
					this.shuffle();

					// Step 3: Save the clean version
					const freshCompressed = Util.compress(this.Meta);
					await OBR.scene.setMetadata({ [Util.DeckMkey]: freshCompressed });

					Debug.log("Fresh deck saved after cleanup", freshCompressed.length, "chars");

					// Step 4: Notify everyone
					await OBR.notification.show("Deck metadata was too large and has been reset!", "WARNING");

					// Force full re-render
					this.renderDeckAsync();
				} catch (cleanupErr) {
					Debug.error("Failed to recover from oversized metadata:", cleanupErr);
					await OBR.notification.show("CRITICAL: Failed to reset deck after size error!", "ERROR");
				}
			} else {
				// Any other error — re-throw
				Debug.error("Failed to save metadata:", err);
				throw err;
			}
		}

		// Save all player metadata to their tokens
		const playerMetas = this.playersArray.map(p => ({
			id: p.characterId,
			meta: p.Meta
		}));

		if (playerMetas.length > 0) {
			await OBR.scene.items.updateItems(
				(item): item is Image =>
					item.layer === "CHARACTER" &&
					isImage(item) &&
					!!item.metadata[Util.PlayerMkey],
				(chars) => {
					for (const char of chars) {
						const pm = char.metadata[Util.PlayerMkey] as PlayerMeta | undefined;
						if (pm?.characterId) {
							const updated = playerMetas.find(m => m.id === pm.characterId);
							if (updated) {
								char.metadata[Util.PlayerMkey] = updated.meta;
							}
						}
					}
				}
			);
		}
	}
	public cleanupOrphanCards() {
		let cleaned = 0;
		for (const card of this.carddeck) {
			if (typeof card.pile === 'object') {
				const characterId = card.pile.characterId;
				// Correct check: does this player still exist in the current players map?
				if (!this.players.has(characterId)) {
					Debug.warn(`Orphan card ${card.cid} from deleted player ${characterId} → moving to discard`);
					this.setPile(card, 'discard');
					cleaned++;
				}
			}
		}
		if (cleaned > 0) {
			this.triggerPlayerStateChange();
		}
	}

	getImageSvg(c: Card): string {
		return c.dir === Facing.Up ? c.face.innerHTML : this.backsvg.innerHTML;
	}

	changeBack() {
		this.back = (++this.back >= Card.backs.length) ? 0 : this.back;


		this.triggerPlayerStateChange();
	}

	public static getInstance(): Deck {
		if (!Deck.instance) {
			Deck.instance = new Deck();
			Deck.instance.svgcontainer = document.getElementById('svgContainer') as HTMLDivElement;
			Deck.instance.svgcontainer.classList.add('initiative-container');
			Deck.instance.initCardSelectionDelegation();
		}
		return Deck.instance;
	}

	async toggleCardSelection(ownId: string, cardCid: number) {
		const pc = this.carddeck.find(c => c.cid === cardCid) || this.carddeck[cardCid - 1];
		if (!pc) return;
		if (pc.selectedBy === ownId) {
			pc.selectedBy = '';          // deselect
		} else {
			pc.selectedBy = ownId;       // select this one
		}
		this.triggerPlayerStateChange();
	}

	isCardSelected(cardSeq: number): boolean {
		const pc = this.carddeck.find(c => c.cid === cardSeq);
		return pc?.selectedBy === CURRENT_PLAYER_ID;
	}

	drawInitiative() {
		Debug.log("drawInitiative");

		try {
			this.playersArray.forEach(p => p.drawInitiative());
		} finally {
			////this.suppressRender = false;

			this.triggerPlayerStateChange();
		}
	}

	drawInterlude() {
		Debug.log("drawInterlude");

		try {
			this.playersArray.forEach(p => p.drawInterlude());
		} finally {
			this.triggerPlayerStateChange();
		}
	}

	shuffleDeck() {
		Debug.log("shuffleDeck");
		this.shuffle()

		this.triggerPlayerStateChange();
	}

	discardAllHands() {
		Debug.log("discardAllHands");
		if (!this.isGM) return;
		if (this.playersArray.every(p => p.hand.length === 0)) return;

		let anyChange = false;

		try {
			for (const player of this.playersArray) {
				const handSize = player.hand.length;
				if (handSize > 0) {
					player.discardHand();
					anyChange = true;
				}
			}
		} finally {
			if (anyChange) {
				this.triggerPlayerStateChange();
			}
		}
	}

	drawCardPool() {
		Debug.log("drawCardPool");
		try {
			this.dealFromTop('pool', 1, Facing.Up)
		} finally {
			this.triggerPlayerStateChange();
		}
	}

	discardCardPool() {
		Debug.log("discardCardPool")
		try {
			this.moveToDiscardPool('pool', 0)
		} finally {
			////this.suppressRender = false;

			this.triggerPlayerStateChange();
		}
	}


	getPlayerById(pid: string | null): PlayerChar | null {
		return pid ? this.players.get(pid) ?? null : null;
	}

	toggleJokers() {
		this.use4jokers = !this.use4jokers;
		this.initializeDeck();
		this.shuffle();

		this.triggerPlayerStateChange();
		this.showNotification(
			this.use4jokers ? "Four Jokers enabled — deck now has 56 cards" : "Four Jokers disabled — deck now has 54 cards",
			"INFO"
		);
	}

	toggleDiscardPile() {
		this.discardVisible = !this.discardVisible;
		this.triggerPlayerStateChange();
		this.showNotification(
			this.discardVisible ? "Discard pile is now visible to players" : "Discard pile is now hidden from players",
			"INFO"
		);
	}

	toggleCardPool() {
		this.poolVisible = !this.poolVisible;
		this.triggerPlayerStateChange();
		this.showNotification(
			this.poolVisible ? "Card pool is now visible to players" : "Card pool is now hidden from players",
			"INFO"
		);
	}

	initializeDeck() {
		this.carddeck = Array.from({ length: 56 }, (_, i) => new PlayerCard(i + 1))
		this.carddeck.forEach(c => {
			if (!this.use4jokers && (c.cid === 55 || c.cid === 56)) {
				this.setPile(c, 'remove');
			} else {
				this.setPile(c, 'draw');
			}
		});
	}

	get drawnCards(): PlayerCard[] {
		return this.carddeck.filter(c => !Deck.isSamePile(c.pile, 'draw') && !Deck.isSamePile(c.pile, 'remove'));
	}

	shuffle() {
		if (!this.isGM && !Debug.enabled) return;
		this.playersArray.forEach(p => { this.moveToPool('draw', p.pileId) }); // return hands
		this.moveToPool('draw', 'pool'); //return card pool
		this.moveToPool('draw', 'discard'); //return discard
		const array = this.carddeck;
		for (let i = this.carddeck.length - 1; i > 0; i--) {
			const randomBytes = new Uint32Array(1);
			crypto.getRandomValues(randomBytes);
			const j = randomBytes[0] % (i + 1);
			[array[i].order, array[j].order, array[i].selectedBy] = [array[j].order, array[i].order, ''];
		}
	}

	private normalizePile(pile: PileId): PileId {
		if (typeof pile === 'string') return pile;

		if (pile && typeof pile === 'object' && typeof pile.characterId === 'string') {
			return this.players.has(pile.characterId) ? pile : 'discard';
		}

		return 'discard';
	}
	dealFromTop(to: PileId, numCards: number, dir: Facing) {
		to = this.normalizePile(to);
		const drawPile = this.carddeck
			.filter(c => Deck.isSamePile(c.pile, 'draw'))
			.sort((a, b) => b.order - a.order);   // top = lowest order

		if (numCards > drawPile.length) {
			this.showNotification('Deck depleted!', "ERROR");
			return;
		}

		for (let i = 0; i < numCards; i++) {
			const pc = drawPile[i];
			this.setPile(pc, to);
			if (Card.isJoker(pc.cid)) {
				this.showNotification('Joker drawn, shuffle and issue Bennies.', "INFO");
			}
			if (dir !== Facing.None) {
				Card.byId(pc.cid).dir = dir;
			}
		}
	}

	moveToDiscardPool(from: PileId, numCards: number = 0) {
		this.moveToPool('discard', from, numCards, true, Facing.Up);
	}

	moveToPool(to: PileId, from: PileId, numCards = 0, fromTop = true, dir = Facing.None) {
		to = this.normalizePile(to);
		const source = this.carddeck
			.filter(c => Deck.isSamePile(c.pile, from))
			.sort((a, b) => fromTop ? b.order - a.order : a.order - b.order);

		const limit = numCards === 0 ? source.length : Math.min(numCards, source.length);

		for (let i = 0; i < limit; i++) {
			const pc = source[i];
			this.setPile(pc, to);
			if (dir !== Facing.None) {
				Card.byId(pc.cid).dir = dir;
			}
		}
	}

	public getMaxChosenInHand(pile: PileId): number {
		let maxChosen = -1;
		this.carddeck.forEach(c => {
			// is in hand and selectedby anyone and cardid>maxchosen, then update maxchosen
			if (Deck.isSamePile(c.pile, pile) && c.selectedBy != '' && c.cid > maxChosen) maxChosen = c.cid
		})
		return maxChosen;
	}

	jokersDrawn(): number {
		return this.carddeck.filter(c => !Deck.isSamePile(c.pile, 'draw') && !Deck.isSamePile(c.pile, 'remove') && Card.isJoker(c.cid)).length;
	}

	addPlayer(name: string, charid: string, playerId: string): PlayerChar {
		const p = new PlayerChar(name, charid, playerId);
		this.players.set(charid, p);
		///his.needsFullRender = true;
		Debug.updateFromPlayers(Deck.getInstance().playerNames)
		return p;
	}

	removePlayer(player: PlayerChar) {
		if (this.players.has(player.characterId)) {
			try {
				document.querySelector(`fieldset[data-pid="${player.characterId}"]`)?.remove();
				this.moveToDiscardPool(player.pileId);
				this.players.delete(player.characterId);
			} finally {
				player.removeOBR();
			}

			this.cleanupOrphanCards();
			Debug.updateFromPlayers(this.playerNames)
			this.triggerPlayerStateChange();
		}
	}

	private updatePlayerOrderAndHighlight() {
		////if (this.suppressRender) return;

		if (this.playersArray.length === 0) {
			document.querySelectorAll('fieldset.nextplayer').forEach(el =>
				el.classList.remove('nextplayer')
			);
			return;
		}

		requestAnimationFrame(() => {
			// Sort players by adjusted best card: active, then on-hold, then zero-cards not out of combat, then out of combat
			const currentPlayers = this.playersArray;
			if (currentPlayers.length === 0) return;
			const sorted = [...currentPlayers].sort((a, b) => {
				const getAdjustedBestCard = (p: PlayerChar) => {
					const base = p.bestCard() ?? 0;
					if (p.outOfCombat) return base - 168; // Out of combat last
					if (p.hand.length === 0) return base - 112; // Zero cards before out of combat
					if (p.onHold) return base - 56; // On hold after active
					return base; // Active first
				};
				const scoreA = getAdjustedBestCard(a);
				const scoreB = getAdjustedBestCard(b);
				return scoreB - scoreA; // Descending order
			});
			const topPlayerId = sorted[0].characterId;

			// Update CSS order + highlight — NO DOM remove/insert!
			sorted.forEach((player, index) => {
				const fieldset = this.svgcontainer.querySelector(
					`fieldset[data-pid="${player.characterId}"]`
				) as HTMLElement;

				if (fieldset) {
					fieldset.style.order = index.toString();                    // CSS reordering
					fieldset.classList.toggle('nextplayer', player.characterId === topPlayerId);
				}
			});

			// Clean up any orphaned fieldsets (rare, but safe)
			this.svgcontainer.querySelectorAll('fieldset[data-pid]').forEach(fs => {
				const pid = (fs as HTMLElement).dataset.pid!;
				if (!this.players.has(pid)) {
					fs.remove();
				}
			});
		});
	}

	public async renderDeckAsync(): Promise<void> {
		Debug.log("%cRENDER DECK ASYNC — Starting", "color: cyan; font-weight: bold; font-size: 12px");

		// Wait for any in-progress save
		if (this.saveQueue) {
			await this.saveQueue.catch(() => { }); // ignore errors
		}
		this.renderDeck();

		Debug.log("%cRENDER DECK ASYNC — Finished", "color: cyan; font-weight: bold; font-size: 12px");
	}
	private renderDeck() {
		this.renderDraw();
		if (this.isGM || this.discardVisible) {
			this.renderDiscardPile(this.svgcontainer);
		} else {
			// Remove discard pile if not visible
			const discardFieldset = this.svgcontainer.querySelector('fieldset#Discard') as HTMLFieldSetElement;
			if (discardFieldset) {
				discardFieldset.remove();
			}
		}
		if (this.isGM || this.poolVisible) {
			this.renderCardPool(this.svgcontainer);
		} else {
			// Remove card pool if not visible
			const poolFieldset = this.svgcontainer.querySelector('fieldset#Pool') as HTMLFieldSetElement;
			if (poolFieldset) {
				poolFieldset.remove();
			}
		}
		this.renderPlayers();
		this.updatePlayerOrderAndHighlight();
	}

	private renderPile(id: string, title: string, order: number, cards: number[], facing: Facing, increment: string, buttonsConfig: Array<{ id: string; label: string; icon: string; handler: () => void }>) {
		const doc = this.svgcontainer.ownerDocument;
		let fieldset = this.svgcontainer.querySelector(`fieldset#${id}`) as HTMLFieldSetElement;
		const legid = `leg${id}`;
		const cardsid = `${id.toLowerCase()}cards`;

		if (!fieldset) {
			fieldset = this.createPileFieldset(doc, id, title, legid, cardsid, buttonsConfig);
			this.svgcontainer.appendChild(fieldset);
		}
		fieldset.style.order = order.toString();
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
		fieldset.style.order = "999";
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
				////this.updateOBR();
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

	renderDraw() {
		const container = this.svgcontainer;
		Debug.log(`%cRENDER → Draw Deck (${this.drawdeck.length} cards)`, "color: #4CAF50; font-weight: bold");

		this.renderPile(
			'Draw',
			'Draw Deck',
			-30,
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

	renderDiscardPile(_container: HTMLDivElement) {
		Debug.log(`%cRENDER → Discard Pile (${this.discardpile.length} cards)`, "color: #F44336; font-weight: bold");

		this.renderPile(
			'Discard',
			'Discard Pile',
			-20,
			this.discardpile,
			Facing.Up,
			'--card-spread-inc',
			[
				{ id: 'shf', label: 'Shuffle', icon: 'stack', handler: () => this.shuffleDeck() },
				{ id: 'dah', label: 'Discard All Hands', icon: 'card-burn', handler: () => this.discardAllHands() },
				{ id: 'sdp', label: 'Toggle Discard Visibility', icon: 'cog', handler: () => this.toggleDiscardPile() }
			]
		);

		// Highlight the visibility toggle button if discard is visible to players
		const sdpBtn = _container.querySelector('#sdp') as HTMLButtonElement;
		if (sdpBtn) Util.setState(sdpBtn, this.discardVisible);
	}

	renderCardPool(_container: HTMLDivElement) {
		Debug.log(`%cRENDER → Card Pool (${this.cardpool.length} cards)`, "color: #FF9800; font-weight: bold");

		this.renderPile(
			'Pool',
			'Card Pool',
			-10,
			this.cardpool,
			Facing.Up,
			'--card-spread-inc',
			[
				{ id: 'cp', label: 'Deal a card to pool', icon: 'card-play', handler: () => this.drawCardPool() },
				{ id: 'dcp', label: 'Discard Card Pool', icon: 'card-burn', handler: () => this.discardCardPool() },
				{ id: 'scp', label: 'Toggle Card Pool Visibility', icon: 'cog', handler: () => this.toggleCardPool() }
			]
		);

		// Highlight the visibility toggle button if card pool is visible to players
		const scpBtn = _container.querySelector('#scp') as HTMLButtonElement;
		if (scpBtn) Util.setState(scpBtn, this.poolVisible);
	}

	renderPlayers() {
		const div = this.svgcontainer;
		this.playersArray.forEach(p => {
			p.render(div);
		});

	}

	setCurrentPlayer(pid: string) {
		document.querySelectorAll('fieldset[data-pid]').forEach(s => {
			const fs = s as HTMLFieldSetElement;
			fs.classList.toggle('nextplayer', fs.dataset.pid === pid);
		});
	}

	async showNotification(message: string, level: "DEFAULT" | "ERROR" | "INFO" | "SUCCESS" | "WARNING" = "DEFAULT") {
		try {
			await OBR.notification.show(message, level);
		} catch (error) {
			Debug.error('Failed to show notification:', error);
		}
	}

	async updateState(dmd?: DeckMeta) {
		if (dmd) {
			this.applyMeta(dmd);
		} else {
			Debug.warn("No metadata found for this extension in the room.");
			if (!this.meta) this.initializeDeck()
			this.shuffleDeck();
		}
	}

	private clearAndRenderCards(container: HTMLDivElement, cards: number[], facing: Facing, cardIncrement: string) {
		container.replaceChildren();
		const inc = Util.offset(cardIncrement, cards.length);
		let x = 0;
		cards.forEach(c => {
			const card = Card.byId(c);
			card.render(container, x, 0, facing);
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
				if (target instanceof SVGElement && (target.classList.contains('card') || target.hasAttribute('data-card-id'))) {
					break;
				}
				target = (target as Element).parentElement;
			}

			if (!target || !(target instanceof SVGElement)) return;

			const cardIdStr = target.getAttribute('data-card-id');
			if (!cardIdStr) return;   // this now never happens

			const cardId = parseInt(cardIdStr, 10);
			if (isNaN(cardId)) return;

			const ownId = CURRENT_PLAYER_ID!;
			const deck = Deck.getInstance();

			const cardWrapper = target.closest('div[id^="card-svg-"]') || target.parentElement;
			const fieldset = cardWrapper?.closest('fieldset[data-pid]');
			const pileCharId = fieldset?.getAttribute('data-pid'); // undefined for Draw/Discard/Pool

			const isCommonPile = !pileCharId;
			let isOwnHand = false;
			if (pileCharId) {
				// Get the PlayerChar for this specific hand/character
				const handPlayer = deck.players.get(pileCharId);
				if (handPlayer && handPlayer.playerId === ownId) {
					isOwnHand = true;  // Yes! This hand belongs to me (even if I have multiple)
				}
			}

			if (!deck.isGM && !isCommonPile && !isOwnHand) {
				return;
			}

			e.stopPropagation();

			try {
				this.toggleCardSelection(ownId, cardId);
			} catch (err) {
				Debug.error('Card selection failed:', err);
			}
		});
	}
}