import OBR, { isImage } from "@owlbear-rodeo/sdk";
import { Card, Facing } from "./cards";
import { Deck, PileId } from "./deck";
import { Debug, Util } from "./util";

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
	characterId: string; //the char token unique id
	playerId: string; //the user id
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

export let CURRENT_PLAYER_ID: string | null = null;
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
	private buttons = new Map<string, HTMLButtonElement>();
	private boundHandlers = new Map<string, (event?: MouseEvent) => void>();
	private controlsContainer?: HTMLDivElement;
	private cardContainer!: HTMLDivElement;

	constructor(name: string, charid: string, pid: string) {
		this.meta = {
			characterId: charid,
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

	get characterId(): string { return this.meta.characterId; }
	get playerId(): string { return this.meta.playerId; }
	get pileId(): PileId {
		return { characterId: this.meta.characterId };
	}
	get name(): string { return this.meta.name; }
	set name(v: string) {
		this.meta.name = v;
	}

	get owner(): string { return this.meta.owner; }
	set owner(v: string) {
		this.meta.owner = v;
	}

	get onHold(): boolean { return this.meta.onHold; }
	set onHold(v: boolean) {
		this.meta.onHold = v;
	}

	get outOfCombat(): boolean { return this.meta.outOfCombat; }
	set outOfCombat(v: boolean) {
		this.meta.outOfCombat = v;
	}

	get levelHeaded(): boolean { return this.meta.levelHeaded; }
	set levelHeaded(v: boolean) {
		this.meta.levelHeaded = v;
	}

	get impLevelHeaded(): boolean { return this.meta.impLevelHeaded; }
	set impLevelHeaded(v: boolean) {
		this.meta.impLevelHeaded = v;
	}

	get tactician(): boolean { return this.meta.tactician; }
	set tactician(v: boolean) {
		this.meta.tactician = v;
	}

	get mastertactician(): boolean { return this.meta.mastertactician; }
	set mastertactician(v: boolean) {
		this.meta.mastertactician = v;
	}

	get quick(): boolean { return this.meta.quick; }
	set quick(v: boolean) {
		this.meta.quick = v;
	}

	get canchoose(): boolean { return this.meta.canchoose; }
	set canchoose(v: boolean) {
		this.meta.canchoose = v;
	}

	get hesitant(): boolean { return this.meta.hesitant; }
	set hesitant(v: boolean) {
		this.meta.hesitant = v;
	}

	get Meta(): PlayerMeta { return { ...this.meta }; }

	applyMeta(newMeta: PlayerMeta): boolean {
		const oldJson = JSON.stringify(this.meta);
		this.meta = { ...newMeta };
		return oldJson !== JSON.stringify(newMeta);
	}

	get hand(): number[] {
		const deck = Deck.getInstance();
		return deck.carddeck.filter(c => Deck.isSamePile(c.pile, this.pileId)).sort((a, b) => a.dealOrder - b.dealOrder).map(c => c.cid);
	}


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
		if (this.hesitant) return this.lowCard();
		const high = this.highCard();
		const maxChosen = Deck.getInstance().getMaxChosenInHand(this.pileId);  // O(1) lookup
		return maxChosen > -1 ? maxChosen : high;
	}

	highCard(): number {
		return this.hand.length > 0 ? Math.max(...this.hand) : -1;
	}

	lowCard(): number {
		return this.hand.length > 0 ? Math.min(...this.hand) : -1;
	}

	drawCard() {
		Deck.getInstance().dealFromTop(this.pileId, 1, Facing.Up);
	}

	drawInitiative() {
		const deck = Deck.getInstance();
		if (this.hesitant) {
			this.quick = this.levelHeaded = this.impLevelHeaded = false;
		}
		if (this.onHold) {
			return;
		}

		deck.moveToDiscardPool(this.pileId, 0);
		if (!this.outOfCombat) {
			deck.dealFromTop(this.pileId, 1, Facing.Up);
			if (this.impLevelHeaded) deck.dealFromTop(this.pileId, 1, Facing.Up);
			if (this.levelHeaded || this.impLevelHeaded || this.hesitant) deck.dealFromTop(this.pileId, 1, Facing.Up);
			if (this.quick) {
				let safety = 0;
				while (deck.drawdeck.length > 0 &&
					this.hand.every(c => Card.byId(c).rank <= 5) &&
					safety++ < 16) {   // ← prevents infinite loop
					deck.dealFromTop(this.pileId, 1, Facing.Up);
				}
				if (safety >= 16) {
					Debug.error("Quick edge aborted — possible infinite loop prevented");
				}
			}
		}
	}


	drawInterlude() {
		const deck = Deck.getInstance();
		deck.moveToDiscardPool(this.pileId, 0);
		deck.dealFromTop(this.pileId, 1, Facing.Up);
	}

	discardHand() {
		const deck = Deck.getInstance();
		deck.moveToDiscardPool(this.pileId, 0);
	}

	hasJoker(): boolean {
		return this.hand.some(c => Card.isJoker(c));
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
		Debug.error('Player ID not found in element attributes')
		return null
	}

	private createControls(container: HTMLDivElement) {
		if (this.controlsContainer) return; // already created

		const doc = container.ownerDocument;
		let fieldset = doc.querySelector(`fieldset[data-pid="${this.characterId}"]`) as HTMLFieldSetElement;

		if (!fieldset) {
			fieldset = this.createFieldset(doc, container);
		}

		this.controlsContainer = fieldset.children[1] as HTMLDivElement;
		this.cardContainer = fieldset.children[2] as HTMLDivElement;

		this.setupAllButtons();
		this.updateButtonVisibility(); // initial state
	}

	private createFieldset(doc: Document, container: HTMLDivElement): HTMLFieldSetElement {
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		fieldset.dataset.pid = this.characterId;
		fieldset.classList.add("flex-container");
		fieldset.style.order = "999";

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
				btn = Util.getButton(div, id, label, icon, this.characterId);
				this.buttons.set(id, btn);
				div.appendChild(btn);
			}
			return btn;
		};

		// ─── Draw Card ───
		const drawcard = getBtn("drawcard", "Draw a Card", "card-pickup");
		if (!this.boundHandlers.has("drawcard")) {
			this.boundHandlers.set("drawcard", () => {
				Debug.log("player.drawCard");
				this.drawCard();
				deck.triggerPlayerStateChange();
			});
			drawcard.addEventListener('click', this.boundHandlers.get("drawcard")!);
		}

		// ─── Draw Hand (GM only) ───
		const drawhand = getBtn("drawhand", "Draw Hand", "poker-hand");
		if (!this.boundHandlers.has("drawhand")) {
			this.boundHandlers.set("drawhand", () => {
				Debug.log("player.drawHand");
				this.drawInitiative();
				deck.triggerPlayerStateChange();
			});
			drawhand.addEventListener('click', this.boundHandlers.get("drawhand")!);
		}

		// ─── Discard Hand ───
		const discardhand = getBtn("discardhand", "Discard Hand", "hand-discard");
		if (!this.boundHandlers.has("discardhand")) {
			this.boundHandlers.set("discardhand", () => {
				Debug.log("player.discardHand");
				if (this.hand.length === 0) return;
				this.discardHand();
				deck.triggerPlayerStateChange();
			});
			discardhand.addEventListener('click', this.boundHandlers.get("discardhand")!);
		}

		// ─── Out of Combat ───
		const outcombat = getBtn("outcombat", "Out of Combat", "truce");
		if (!this.boundHandlers.has("outcombat")) {
			this.boundHandlers.set("outcombat", () => {
				Debug.log("player.outOfCombat");
				this.outOfCombat = !this.outOfCombat;
				Util.setState(outcombat, this.outOfCombat);
				if (this.outOfCombat) {
					this.discardHand();
					deck.triggerPlayerStateChange();
				}
			});
			outcombat.addEventListener('click', this.boundHandlers.get("outcombat")!);
		}

		// ─── Remove Player (GM or owner) ───
		const removeplayer = getBtn("removeplayer", "Remove Player", "trash-can");
		if (!this.boundHandlers.has("removeplayer")) {
			this.boundHandlers.set("removeplayer", async () => {
				Debug.log("player.removePlayer");
				deck.removePlayer(this);
				deck.triggerPlayerStateChange();
			});
			removeplayer.addEventListener('click', this.boundHandlers.get("removeplayer")!);
		}

		// ─── On Hold ───
		const onhold = getBtn("onhold", "On Hold", "halt");
		if (!this.boundHandlers.has("onhold")) {
			this.boundHandlers.set("onhold", () => {
				Debug.log("player.onHold");
				this.onHold = !this.onHold;
				Util.setState(onhold, this.onHold);
				deck.triggerPlayerStateChange();
			});
			onhold.addEventListener('click', this.boundHandlers.get("onhold")!);
		}

		// ─── Hesitant Hindrance ───
		const hesitant = getBtn("hesitant", "Hesitant Hindrance", "uncertainty");
		if (!this.boundHandlers.has("hesitant")) {
			this.boundHandlers.set("hesitant", () => {
				Debug.log("player.hesitant");
				this.toggleHesitant();
				this.updateButtonStates(); // sync related buttons
				deck.triggerPlayerStateChange();
			});
			hesitant.addEventListener('click', this.boundHandlers.get("hesitant")!);
		}

		// ─── Quick Edge ───
		const quick = getBtn("quick", "Quick Edge", "sprint");
		if (!this.boundHandlers.has("quick")) {
			this.boundHandlers.set("quick", () => {
				Debug.log("player.quick");
				this.toggleQuick();
				this.updateButtonStates();
				deck.triggerPlayerStateChange();
			});
			quick.addEventListener('click', this.boundHandlers.get("quick")!);
		}

		// ─── Level-Headed / Improved Level-Headed ───
		const levelhead = getBtn("levelhead", "Level Headed Edge", "scales");
		if (!this.boundHandlers.has("levelhead")) {
			this.boundHandlers.set("levelhead", () => {
				Debug.log("player.levelHeaded");
				this.toggleLevelHeaded();
				Util.setState3way(levelhead,
					this.levelHeaded, "scales",
					this.impLevelHeaded, "scales-exclaim"
				);
				this.updateButtonStates();
				deck.triggerPlayerStateChange();
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

		// ───  Selected Card(s) to This Player ───
		const pass = getBtn("pass", "Pass your selected card to here", "card-play");
		if (!this.boundHandlers.has("pass")) {
			this.boundHandlers.set("pass", async (event) => {
				Debug.log("player.pass");
				const button = event?.target as HTMLElement;
				if (!button) return;

				const fieldset = button.closest('fieldset[data-pid]') as HTMLElement;
				const toHandId = fieldset?.dataset.pid;
				if (!toHandId || !deck.players.has(toHandId)) {
					return;
				}
				let flag = false;
				//get cards selected by player and set the pile to hand of targetId
				let pileId = { characterId: toHandId } as PileId
				let selected = deck.carddeck.filter(c => c.selectedBy === CURRENT_PLAYER_ID);
				selected.forEach(c => {
					deck.setPile(c, pileId);
					flag = true
				})
				if (flag) {
					const giver = deck.getPlayerById(this.characterId);
					const receiver = deck.getPlayerById(toHandId);
					if (giver && receiver) {
						giver.render(deck.svgcontainer);
						receiver.render(deck.svgcontainer);
					}
					deck.triggerPlayerStateChange();
				}
				event?.preventDefault();
			});
			pass.addEventListener('click', this.boundHandlers.get("pass")!);
		}
	}

	render(container: HTMLDivElement) {
		Debug.log(`%cRENDER → Player: ${this.name} (${this.characterId}) — ${this.hand.length} cards`,
			"color: #9C27B0; font-weight: bold");

		this.createControls(container);

		this.updateButtonStates();
		this.updateButtonVisibility();
		if (!this.cardContainer?.dataset.rendered) {
			Debug.log(`Player ${this.name} (${this.characterId}) UI initialized`);
			this.cardContainer!.dataset.rendered = "true";
		}

		this.renderHandOnly();
	}

	private updateButtonStates() {

		Util.setState(this.buttons.get("outcombat")!, this.outOfCombat);
		Util.setState(this.buttons.get("onhold")!, this.onHold);
		Util.setState(this.buttons.get("hesitant")!, this.hesitant);
		Util.setState(this.buttons.get("quick")!, this.quick);


		const levelheadBtn = this.buttons.get("levelhead")!;
		Util.setState3way(
			levelheadBtn,
			this.levelHeaded, "scales",
			this.impLevelHeaded, "scales-exclaim"
		);

		if (this.impLevelHeaded) {
			Util.setImage("scales-exclaim", levelheadBtn);
		} else if (this.levelHeaded) {
			Util.setImage("scales", levelheadBtn);
		}
	}

	private updateButtonVisibility() {
		const deck = Deck.getInstance();
		const isOwner = CURRENT_PLAYER_ID ? this.playerId === CURRENT_PLAYER_ID : false;
		const isGM = deck.isGM;
		const isGMorOwner = isGM || isOwner;

		// Helper
		const show = (btn: HTMLButtonElement | undefined, condition: boolean) => {
			if (btn) btn.style.display = Util.display(condition);
		};

		// Individual visibility rules
		show(this.buttons.get("drawcard"), isGMorOwner);
		show(this.buttons.get("drawhand"), isGM);
		show(this.buttons.get("discardhand"), isGMorOwner);
		show(this.buttons.get("outcombat"), isGMorOwner);
		show(this.buttons.get("removeplayer"), isGMorOwner);
		show(this.buttons.get("onhold"), isGMorOwner);
		show(this.buttons.get("hesitant"), isGMorOwner);
		show(this.buttons.get("quick"), isGMorOwner);
		show(this.buttons.get("levelhead"), isGMorOwner);

		show(this.buttons.get("info"), isOwner);
		show(this.buttons.get("pass"), true);
	}

	private renderHandOnly() {
		Debug.log(`   DRAWING HAND → ${this.name}: [${this.hand.map(c => Card.byId(c).displayText()).join(', ')}]`);

		this.cardContainer.replaceChildren();
		const inc = Util.offset('--card-spread-inc', this.hand.length);
		let x = 0;
		this.hand.forEach(c => {
			const card = Card.byId(c);
			card.render(this.cardContainer, x, 0, Facing.Up);
			x += inc;
		});
	}

	async removeOBR() {
		try {
			await OBR.scene.items.updateItems(
				item => item.layer === "CHARACTER" && isImage(item) && item.metadata[Util.PlayerMkey] !== undefined,
				characters => characters.forEach(char => {
					if ((char.metadata[Util.PlayerMkey] as PlayerMeta)?.characterId === this.characterId) {
						delete char.metadata[Util.PlayerMkey];
						Debug.log(`deleted character item ${this.characterId}`)
					}
				})
			)
		} catch (error) {
			Debug.error("Failed to remove character item from scene:", error);
		}
	}
}