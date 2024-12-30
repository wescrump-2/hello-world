import { Deck, Facing } from "./cards"
import { Player } from "./player"

// Game class
export class Game {
	static instance: Game
	deck: Deck
	div: HTMLDivElement

	constructor(container: HTMLDivElement) {
		this.deck = new Deck()
		this.div = container
		Game.instance = this
	}

	addPlayer(name: string): Player {
		const p = new Player(name)
		this.deck.players.push(p);
		return p
	}

	render() {
		//draw deck
		this.deck.removeRender(this.div)
		this.deck.render(this.div)
		//draw player hands
		let y = 0
		let x = 0
		for (const p of this.deck.players) {
			p.removeRender(this.div)
			p.render(this.div, x, y)
		}
	}
	testplayers: string[] = ["h", "il", "lh", "a", "q", "lhq", "ilq"]
	startGame() {
		this.newGame()
		this.deck.shuffle();
		for (const pn of this.testplayers) {
			let p = this.addPlayer(pn)
			let pnl = pn.toLowerCase()
			p.hesitant = pnl.indexOf("h") >= 0
			p.impLevelHeaded = pnl.indexOf("il") >= 0
			p.levelHeaded = pnl.indexOf("lh") >= 0
			p.onHold = pnl.indexOf("oh") >= 0
			p.outOfCombat = pnl.indexOf("oc") >= 0
			p.quick = pnl.indexOf("q") >= 0
		}
	}

	newRound() {
		for (const p of this.deck.players) {
			this.deck.moveToDiscardPool(p.hand)
		}
	}

	newGame() {
		this.newRound()
		this.deck.moveToDiscardPool(this.deck.specialPool)
		this.deck.returnCardsToDeck(this.deck.discardPool)
	}

	drawInitiative() {
		for (const p of this.deck.players) {
			if (p.hesitant) {
				p.quick = false
				p.levelHeaded = false
				p.impLevelHeaded = false
			}
			if (p.onHold)
				return
			this.deck.moveToDiscardPool(p.hand)
			if (p.outOfCombat)
				return
			this.deck.dealFromTop(p.hand, 1, Facing.Up)
			if (p.impLevelHeaded)
				this.deck.dealFromTop(p.hand, 1, Facing.Up)
			if (p.levelHeaded || p.impLevelHeaded || p.hesitant)
				this.deck.dealFromTop(p.hand, 1, Facing.Up)
			if (p.quick)
				while (p.hand.every(c => c.value <= 5)) {
					this.deck.dealFromTop(p.hand, 1, Facing.Up)
				}
		}
	}

	drawInterlude() {
		for (const p of this.deck.players) {
			this.deck.moveToDiscardPool(p.hand)
			this.deck.dealFromTop(p.hand, 1, Facing.Up)
		}
	}

	discardPlayers() {
		for (const p of this.deck.players) {
			this.deck.moveToDiscardPool(p.hand, 0)
		}
	}

}