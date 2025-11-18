import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { Card, Facing } from "./cards";
import { Deck } from "./deck";
import { Util } from "./util";

export enum LevelHeaded {
	None = 0,
	LevelHeaded = 1,
	ImpLevelHeaded = 2
}

export enum TacticianLevel {
	None = 0,
	Tactician = 1,
	MasterTactician = 2
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

let CURRENT_PLAYER_ID: string | null = null;
let CURRENT_PLAYER_ID_PROMISE: Promise<string> | null = null;

export async function getCurrentPlayerId(): Promise<string> {
	if (CURRENT_PLAYER_ID !== null) {
		return CURRENT_PLAYER_ID;
	}
	if (CURRENT_PLAYER_ID_PROMISE !== null) {
		return CURRENT_PLAYER_ID_PROMISE;
	}
	CURRENT_PLAYER_ID_PROMISE = OBR.player.getId().then(id => {
		CURRENT_PLAYER_ID = id;
		CURRENT_PLAYER_ID_PROMISE = null;
		return id;
	});
	return CURRENT_PLAYER_ID_PROMISE;
}

export class PlayerChar {
	private meta: PlayerMeta;
	////
	private buttons = new Map<string, HTMLButtonElement>();
	//private boundHandlers = new Map<string, () => void>();
	private boundHandlers = new Map<string, (event?: MouseEvent) => void>();
	private controlsContainer?: HTMLDivElement;
	private cardContainer?: HTMLDivElement;

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
		if (this.hesitant) return this.lowCard();
		const high = this.highCard();
		const maxChosen = Deck.getInstance().getMaxChosenInHand(this.hand);  // O(1) lookup
		return maxChosen > -1 ? maxChosen : high;
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
		this.hand = [];
	}

	hasJoker(): boolean {
		return this.hand.some(c => c > 52);
	}

	// countJoker(): number {
	// 	return this.hand.filter(c => c > 52).length;
	// }

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


	////

	// Call this ONCE when the player is added (from Deck.addPlayer or rehydrate)
	private createControls(container: HTMLDivElement) {
		if (this.controlsContainer) return; // already created

		const doc = container.ownerDocument;
		let fieldset = doc.querySelector(`fieldset[data-pid="${this.id}"]`) as HTMLFieldSetElement;

		if (!fieldset) {
			fieldset = this.createFieldset(doc, container);
		}

		this.controlsContainer = fieldset.children[1] as HTMLDivElement;
		this.cardContainer = fieldset.children[2] as HTMLDivElement;

		this.setupAllButtons();
		this.updateButtonVisibility(); // initial state
	}

	// Creates the fieldset once
	private createFieldset(doc: Document, container: HTMLDivElement): HTMLFieldSetElement {
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		fieldset.dataset.pid = this.id;
		fieldset.classList.add("flex-container");

		const legend = doc.createElement('legend');
		legend.textContent = this.name;
		fieldset.appendChild(legend);

		const controlsDiv = doc.createElement('div');
		controlsDiv.classList.add("flex-item-1", Card.relcard[0]);

		const cardDiv = doc.createElement('div');
		cardDiv.classList.add("flex-item-2", ...Card.concard);

		fieldset.appendChild(controlsDiv);
		fieldset.appendChild(cardDiv);
		container.appendChild(fieldset);

		return fieldset;
	}

	private setupAllButtons() {
		const div = this.controlsContainer!;
		const deck = Deck.getInstance();

		const getBtn = (id: string, label: string, icon: string): HTMLButtonElement => {
			let btn = this.buttons.get(id);
			if (!btn) {
				btn = Util.getButton(div, id, label, icon, this.id);
				this.buttons.set(id, btn);
				div.appendChild(btn);
			}
			return btn;
		};

		// ─── Draw Card ───
		const drawcard = getBtn("drawcard", "Draw a Card", "card-pickup");
		if (!this.boundHandlers.has("drawcard")) {
			this.boundHandlers.set("drawcard", () => {
				this.drawCard();
				deck.updateOBR();
			});
			drawcard.addEventListener('click', this.boundHandlers.get("drawcard")!);
		}

		// ─── Draw Hand (GM only) ───
		const drawhand = getBtn("drawhand", "Draw Hand", "poker-hand");
		if (!this.boundHandlers.has("drawhand")) {
			this.boundHandlers.set("drawhand", () => {
				this.drawInitiative();
				deck.updateOBR();
			});
			drawhand.addEventListener('click', this.boundHandlers.get("drawhand")!);
		}

		// ─── Discard Hand ───
		const discardhand = getBtn("discardhand", "Discard Hand", "hand-discard");
		if (!this.boundHandlers.has("discardhand")) {
			this.boundHandlers.set("discardhand", () => {
				if (this.hand.length === 0) return;
				this.discardHand();
				deck.updateOBR();
			});
			discardhand.addEventListener('click', this.boundHandlers.get("discardhand")!);
		}

		// ─── Out of Combat ───
		const outcombat = getBtn("outcombat", "Out of Combat", "truce");
		if (!this.boundHandlers.has("outcombat")) {
			this.boundHandlers.set("outcombat", () => {
				this.outOfCombat = !this.outOfCombat;
				Util.setState(outcombat, this.outOfCombat);
				if (this.outOfCombat) this.discardHand();
				deck.updateOBR();
			});
			outcombat.addEventListener('click', this.boundHandlers.get("outcombat")!);
		}

		// ─── Remove Player (GM or owner) ───
		const removeplayer = getBtn("removeplayer", "Remove Player", "trash-can");
		if (!this.boundHandlers.has("removeplayer")) {
			this.boundHandlers.set("removeplayer", async () => {
				deck.removePlayer(this);
				await deck.updateOBR();
				deck.renderDeck();
			});
			removeplayer.addEventListener('click', this.boundHandlers.get("removeplayer")!);
		}

		// ─── On Hold ───
		const onhold = getBtn("onhold", "On Hold", "halt");
		if (!this.boundHandlers.has("onhold")) {
			this.boundHandlers.set("onhold", () => {
				this.onHold = !this.onHold;
				Util.setState(onhold, this.onHold);
				deck.updateOBR();
			});
			onhold.addEventListener('click', this.boundHandlers.get("onhold")!);
		}

		// ─── Hesitant Hindrance ───
		const hesitant = getBtn("hesitant", "Hesitant Hindrance", "uncertainty");
		if (!this.boundHandlers.has("hesitant")) {
			this.boundHandlers.set("hesitant", () => {
				this.toggleHesitant();
				this.updateButtonStates(); // sync related buttons
				deck.updateOBR();
			});
			hesitant.addEventListener('click', this.boundHandlers.get("hesitant")!);
		}

		// ─── Quick Edge ───
		const quick = getBtn("quick", "Quick Edge", "sprint");
		if (!this.boundHandlers.has("quick")) {
			this.boundHandlers.set("quick", () => {
				this.toggleQuick();
				this.updateButtonStates(); // sync hesitant button
				deck.updateOBR();
			});
			quick.addEventListener('click', this.boundHandlers.get("quick")!);
		}

		// ─── Level-Headed / Improved Level-Headed ───
		const levelhead = getBtn("levelhead", "Level Headed Edge", "scales");
		if (!this.boundHandlers.has("levelhead")) {
			this.boundHandlers.set("levelhead", () => {
				this.toggleLevelHeaded();
				Util.setState3way(levelhead,
					this.levelHeaded, "scales",
					this.impLevelHeaded, "scales-exclaim"
				);
				this.updateButtonStates(); // sync hesitant
				deck.updateOBR();
			});
			levelhead.addEventListener('click', this.boundHandlers.get("levelhead")!);
		}

		// ─── Interlude Info Popover ───
		const info = getBtn("info", "Interludes", "suits");
		if (!this.boundHandlers.has("info")) {
			this.boundHandlers.set("info", (event) => {
				const best = this.bestCard();
				if (best === -1) return;
				const suit = Card.byId(best).suit.toString().replace("Red", "").replace("Black", "");
				OBR.popover.open({
					id: `${Util.ID}/interlude`,
					url: `/interludes.html#${suit}`,
					height: 400,
					width: 600,
				});
				event?.preventDefault();
			});
			info.addEventListener('click', this.boundHandlers.get("info")!);
		}

		// ─── Pass Selected Card(s) to This Player ───
		const pass = getBtn("pass", "Pass your selected card to here", "card-play");
		if (!this.boundHandlers.has("pass")) {
			this.boundHandlers.set("pass", async (event) => {
				const ownId = CURRENT_PLAYER_ID!;
				const chosen = deck.getPlayerChoices(ownId);
				for (const pc of chosen) {
					this.passCardToPlayer(pc.chosenCard);
					deck.removePlayerChoice(ownId, pc.chosenCard);
				}
				if (chosen.length > 0) {
					await deck.updateOBR();
					deck.renderDeck();
				}
				event?.preventDefault();
			});
			pass.addEventListener('click', this.boundHandlers.get("pass")!);
		}
	}

	// New public render — now super fast and synchronous
	render(container: HTMLDivElement) {
		this.createControls(container);     // creates once
		this.updateButtonStates();          // only toggles classes/text
		this.updateButtonVisibility();      // show/hide based on GM/owner
		this.renderHandOnly();              // only clears and redraws cards
	}

	private updateButtonStates() {
		// Simple on/off toggles
		Util.setState(this.buttons.get("outcombat")!, this.outOfCombat);
		Util.setState(this.buttons.get("onhold")!, this.onHold);
		Util.setState(this.buttons.get("hesitant")!, this.hesitant);
		Util.setState(this.buttons.get("quick")!, this.quick);

		// 3-way state for Level-Headed / Improved Level-Headed
		const levelheadBtn = this.buttons.get("levelhead")!;
		Util.setState3way(
			levelheadBtn,
			this.levelHeaded, "scales",          // Normal Level-Headed
			this.impLevelHeaded, "scales-exclaim"   // Improved
		);

		// Optional: you can also force correct icon if someone manually changed it
		// (setState3way already does this, but this is defensive)
		if (this.impLevelHeaded) {
			Util.setImage("scales-exclaim", levelheadBtn);
		} else if (this.levelHeaded) {
			Util.setImage("scales", levelheadBtn);
		}
	}

	private updateButtonVisibility() {
		if (!CURRENT_PLAYER_ID) {
			// If player ID still loading (very rare), hide everything owner-specific
			const allButtons = Array.from(this.buttons.values());
			allButtons.forEach(b => b.style.display = "none");
			return;
		}

		const isOwner = this.playerId === CURRENT_PLAYER_ID;
		const isGM = Deck.getInstance().isGM;
		const isGMorOwner = isGM || isOwner;

		// Helper
		const show = (btn: HTMLButtonElement | undefined, condition: boolean) => {
			if (btn) btn.style.display = Util.display(condition);
		};

		// Individual visibility rules
		show(this.buttons.get("drawcard"), isGMorOwner);   // Draw single card
		show(this.buttons.get("drawhand"), isGM);          // Draw full initiative hand (GM only)
		show(this.buttons.get("discardhand"), isGMorOwner);   // Discard hand
		show(this.buttons.get("outcombat"), isGMorOwner);   // Out of combat toggle
		show(this.buttons.get("removeplayer"), isGMorOwner);   // Remove from initiative
		show(this.buttons.get("onhold"), isGMorOwner);   // On Hold
		show(this.buttons.get("hesitant"), isGMorOwner);   // Hesitant hindrance
		show(this.buttons.get("quick"), isGMorOwner);   // Quick edge
		show(this.buttons.get("levelhead"), isGMorOwner);   // Level-Headed / Improved

		show(this.buttons.get("info"), isOwner);       // Interlude popover (only own cards)
		show(this.buttons.get("pass"), true);          // Pass button always visible (anyone can receive cards)
	}

	private renderHandOnly() {
		if (!this.cardContainer) return;

		this.cardContainer.innerHTML = ''; // fast clear
		const deck = Deck.getInstance();
		const isOwner = this.playerId === CURRENT_PLAYER_ID;
		const isGM = deck.isGM;
		const inc = Util.offset('--card-spread-inc', this.hand.length);

		let x = 0;
		for (const seq of this.hand) {
			const card = Card.byId(seq);
			const svg = card.render(this.cardContainer, x, 0, Facing.Up);
			if (deck.isCardSelected(seq)) svg.classList.add("chosen");
			svg.setAttribute('data-card-id', seq.toString());
			if (isGM || isOwner) {
				svg.style.cursor = "pointer";
				svg.addEventListener('click', () => {
					deck.togglePlayerChoice(CURRENT_PLAYER_ID!, seq);
					deck.updateOBR().then(() => deck.renderDeck());
				});
			}
			x += inc;
		}
	}
	////

	//async 
	// render(container: HTMLDivElement, x: number, y: number) {
	// 	//const obrPlayerId = await OBR.player.getId()
	// 	const obrPlayerId = CURRENT_PLAYER_ID ?? this.playerId;
	// 	const doc = container.ownerDocument;
	// 	const deck = Deck.getInstance();
	// 	let fieldset = doc.querySelector(`fieldset[data-pid="${this.id}"]`) as HTMLFieldSetElement
	// 	if (!fieldset) {
	// 		fieldset = doc.createElement('fieldset') as HTMLFieldSetElement
	// 		const legend = doc.createElement('legend')
	// 		legend.textContent = this.name;
	// 		fieldset.appendChild(legend)
	// 		fieldset.classList.add("flex-container")
	// 		fieldset.title = this.name;
	// 		fieldset.dataset.pid = this.id;
	// 		let pdiv = doc.createElement('div') as HTMLDivElement
	// 		pdiv.classList.add("flex-item-1", Card.relcard[0]);
	// 		pdiv.dataset.slot = "b"
	// 		fieldset.appendChild(pdiv)
	// 		let cdiv = doc.createElement('div') as HTMLDivElement;
	// 		cdiv.classList.add("flex-item-2", ...Card.concard);
	// 		cdiv.dataset.slot = "c"
	// 		fieldset.appendChild(cdiv)
	// 		container.appendChild(fieldset)
	// 	}
	// 	let playerdiv = fieldset.children[1] as HTMLDivElement
	// 	let carddiv = fieldset.children[2] as HTMLDivElement
	// 	// GM-only actions
	// 	const isOwner = this.playerId === obrPlayerId
	// 	const isGMorOwner = deck.isGM || isOwner
	// 	// Draw Card Button
	// 	let drawcard = playerdiv.querySelector('#drawcard') as HTMLButtonElement
	// 	if (!drawcard) {
	// 		drawcard = Util.getButton(playerdiv, "drawcard", "Draw a Card", "card-pickup", "") //this.id)
	// 		drawcard.addEventListener('click', function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				p.drawCard()
	// 				deck.updateOBR()
	// 			}
	// 		})
	// 		playerdiv.appendChild(drawcard)
	// 	}
	// 	drawcard.style.display = Util.display(isGMorOwner)

	// 	let drawhand = playerdiv.querySelector('#drawhand') as HTMLButtonElement
	// 	if (!drawhand) {
	// 		drawhand = Util.getButton(playerdiv, "drawhand", "Draw Hand", "poker-hand", "") //this.id)
	// 		drawhand.addEventListener('click', function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				p.drawInitiative()
	// 				deck.updateOBR()
	// 			}
	// 		})
	// 		playerdiv.appendChild(drawhand)
	// 	}
	// 	drawhand.style.display = Util.display(deck.isGM)

	// 	let discardhand = playerdiv.querySelector('#discardhand') as HTMLButtonElement
	// 	if (!discardhand) {
	// 		discardhand = Util.getButton(playerdiv, "discardhand", "Discard Hand", "hand-discard", "")
	// 		discardhand.addEventListener('click', function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				if (p.hand.length === 0) {
	// 					return
	// 				}
	// 				p.discardHand()
	// 				deck.updateOBR()
	// 			}
	// 		})
	// 		playerdiv.appendChild(discardhand)
	// 	}
	// 	discardhand.style.display = Util.display(isGMorOwner)

	// 	let outcombat = playerdiv.querySelector('#outcombat') as HTMLButtonElement
	// 	if (!outcombat) {
	// 		outcombat = Util.getButton(playerdiv, "outcombat", "Out of Combat", "truce", "") //this.id)
	// 		outcombat.addEventListener('click', function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				p.outOfCombat = !p.outOfCombat
	// 				Util.setState(this, p.outOfCombat)
	// 				if (p.outOfCombat) {
	// 					p.discardHand()
	// 				}
	// 				deck.updateOBR()
	// 			}
	// 		})
	// 		playerdiv.appendChild(outcombat)
	// 	}
	// 	Util.setState(outcombat, this.outOfCombat)
	// 	outcombat.style.display = Util.display(isGMorOwner)


	// 	let rembut = playerdiv.querySelector('#removeplayer') as HTMLButtonElement
	// 	if (!rembut) {
	// 		rembut = Util.getButton(playerdiv, "removeplayer", "Remove Player", "trash-can", this.id)
	// 		rembut.addEventListener('click', async function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				deck.removePlayer(p)
	// 				//p.removeOBR()
	// 				await deck.updateOBR().then(() => {
	// 					deck.renderDeck()
	// 				})
	// 			}
	// 		})
	// 		playerdiv.appendChild(rembut)
	// 	}
	// 	rembut.style.display = Util.display(isGMorOwner)

	// 	let onhold = playerdiv.querySelector('#onhold') as HTMLButtonElement
	// 	if (!onhold) {
	// 		onhold = Util.getButton(playerdiv, "onhold", "On Hold", "halt", "") //this.id)
	// 		onhold.addEventListener('click', function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				p.onHold = !p.onHold
	// 				Util.setState(this, p.onHold)
	// 				deck.updateOBR()
	// 			}
	// 		})
	// 		playerdiv.appendChild(onhold)
	// 	}
	// 	Util.setState(onhold, this.onHold)
	// 	onhold.style.display = Util.display(isGMorOwner)

	// 	let hesitant = playerdiv.querySelector('#hesitant') as HTMLButtonElement
	// 	if (!hesitant) {
	// 		hesitant = Util.getButton(playerdiv, "hesitant", "Hesitant Hindrance", "uncertainty", "")
	// 		hesitant.addEventListener('click', function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				p.toggleHesitant()
	// 				Util.setState(this, p.hesitant)
	// 				const hes = this.parentElement?.querySelector('#quick') as HTMLButtonElement
	// 				Util.setState(hes, p.quick)
	// 				const lh = this.parentElement?.querySelector('#levelhead') as HTMLButtonElement
	// 				Util.setState3way(lh, p.levelHeaded, 'scales', p.impLevelHeaded, 'scales-exclaim')
	// 				deck.updateOBR()
	// 			}
	// 		})
	// 		playerdiv.appendChild(hesitant)
	// 	}
	// 	Util.setState(hesitant, this.hesitant)
	// 	hesitant.style.display = Util.display(isGMorOwner)

	// 	let quick = playerdiv.querySelector('#quick') as HTMLButtonElement
	// 	if (!quick) {
	// 		quick = Util.getButton(playerdiv, "quick", "Quick Edge", "sprint", "") //this.id)
	// 		quick.addEventListener('click', function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				p.toggleQuick()
	// 				Util.setState(this, p.quick)
	// 				const hes = this.parentElement?.querySelector('#hesitant') as HTMLButtonElement
	// 				Util.setState(hes, p.hesitant)
	// 				deck.updateOBR()
	// 			}
	// 		})
	// 		playerdiv.appendChild(quick)
	// 	}
	// 	Util.setState(quick, this.quick)
	// 	quick.style.display = Util.display(isGMorOwner)

	// 	// const tacttype = (this.mastertactician) ? "aces" : "ace"
	// 	// let tactician = playerdiv.querySelector('#tactician') as HTMLButtonElement
	// 	// if (!tactician) {
	// 	// 	tactician = Util.getButton(playerdiv, "tactician", "Tactician", tacttype, "")
	// 	// 	tactician.addEventListener('click', function () {
	// 	// 		let p = PlayerChar.getPlayer(this)
	// 	// 		if (p) {
	// 	// 			p.toggleTactician()
	// 	// 			Util.setState3way(tactician, p.levelHeaded, 'ace', p.impLevelHeaded, 'aces')
	// 	// 			p.updateOBR()
	// 	// 			const deck = Deck.getInstance()
	// 	// 			deck.updateOBR()
	// 	// 		}
	// 	// 	})
	// 	// 	playerdiv.appendChild(tactician)
	// 	// }
	// 	// Util.setState3way(tactician, this.tactician, "ace", this.mastertactician, "aces")
	// 	// tactician.style.display = Util.display(isGMorOwner)

	// 	const lvlheadtype = (this.impLevelHeaded) ? "scales-exclaim" : "scales"
	// 	let levelhead = playerdiv.querySelector('#levelhead') as HTMLButtonElement
	// 	if (!levelhead) {
	// 		levelhead = Util.getButton(playerdiv, "levelhead", "Level Headed Edge", lvlheadtype, "")
	// 		levelhead.addEventListener('click', function () {
	// 			let p = PlayerChar.getPlayer(this)
	// 			const deck = Deck.getInstance()
	// 			if (p) {
	// 				p.toggleLevelHeaded()
	// 				Util.setState3way(this, p.levelHeaded, 'scales', p.impLevelHeaded, 'scales-exclaim')
	// 				const hes = this.parentElement?.querySelector('#hesitant') as HTMLButtonElement
	// 				Util.setState(hes, p.hesitant)
	// 				deck.updateOBR()
	// 			}
	// 		})
	// 		playerdiv.appendChild(levelhead)
	// 	}
	// 	Util.setState3way(levelhead, this.levelHeaded, "scales", this.impLevelHeaded, "scales-exclaim")
	// 	levelhead.style.display = Util.display(isGMorOwner)

	// 	let info = playerdiv.querySelector('#info') as HTMLButtonElement
	// 	if (!info) {
	// 		info = Util.getButton(playerdiv, "info", "Interludes", "suits", "")
	// 		info.addEventListener('click', function (event) {
	// 			const p = PlayerChar.getPlayer(this);
	// 			if (p) {
	// 				const suit = Card.byId(p.bestCard()).suit.toString().replace("Red", "").replace("Black", "")
	// 				OBR.popover.open({
	// 					id: `${Util.ID}/interlude`,
	// 					url: `/interludes.html#${suit}`,
	// 					height: 400,
	// 					width: 600,
	// 				})
	// 			}
	// 			event.preventDefault()
	// 		})
	// 		playerdiv.appendChild(info)
	// 	}
	// 	info.style.display = Util.display(isOwner)

	// 	let pass = playerdiv.querySelector('#pass') as HTMLButtonElement
	// 	if (!pass) {
	// 		pass = Util.getButton(playerdiv, "pass", "Pass your selected card to here", "card-play", this.id)
	// 		pass.addEventListener('click', async function (event) {
	// 			const deck = Deck.getInstance()
	// 			const but = event.currentTarget as HTMLButtonElement
	// 			const to = deck.getPlayerById(but.dataset.pid + '')
	// 			if (to != null) {
	// 				const chosen = deck.getPlayerChoices(obrPlayerId)
	// 				for (let pc of chosen) {
	// 					to.passCardToPlayer(pc.chosenCard)
	// 					deck.removeChoiceCards([pc.chosenCard])
	// 					await deck.updateOBR().then(() => {
	// 						deck.renderDeck()
	// 					})
	// 				}
	// 			}
	// 			event.preventDefault()
	// 		})
	// 		playerdiv.appendChild(pass)
	// 	}
	// 	pass.style.display = Util.display(true)

	// 	// remove cards
	// 	while (carddiv.firstChild) {
	// 		carddiv.removeChild(carddiv.firstChild)
	// 	}
	// 	// add cards
	// 	let inc = Util.offset('--card-spread-inc', this.hand.length)
	// 	this.hand.forEach(cardSeq => {
	// 		const card = Card.byId(cardSeq);
	// 		const csvg = card.render(carddiv, x, y, Facing.Up);
	// 		if (deck.chosenList.find(c => c.chosenCard === card.sequence)) csvg.classList.add("chosen");
	// 		if (isGMorOwner) {
	// 			csvg.addEventListener('click', async () => {
	// 				//const ownid = CURRENT_PLAYER_ID ?? this.playerId;
	// 				deck.togglePlayerChoice(obrPlayerId, card.sequence)
	// 				await deck.updateOBR().then(() => {
	// 					deck.renderDeck()
	// 				})
	// 			});
	// 		}
	// 		x += inc;
	// 	});
	// }

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