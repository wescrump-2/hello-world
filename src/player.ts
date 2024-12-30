import { ButtonFactory } from "./button";
import { Card, Deck } from "./cards";
import { Game } from "./game";

export class Player {
	hand: Card[] = [];
	public id = crypto.randomUUID()
	public onHold: boolean = false;
	public outOfCombat: boolean = false;
	public levelHeaded: boolean = false;
	public impLevelHeaded: boolean = false;
	public quick: boolean = false;
	public chooseCard: boolean = false;
	public hesitant: boolean = false;

	constructor(public name: string) { }

	addCard(card: Card) {
		this.hand.push(card);
	}

	removeCard(card: Card) {
		const index = this.hand.indexOf(card);
		if (index > -1) {
			this.hand.splice(index, 1);
		}
	}
	removeRender(container: HTMLDivElement) {
		const divToRemove = container.querySelector(`div[title="${this.name}"]`);
		if (divToRemove) {
			// If div is found, remove it from the DOM
			divToRemove.remove();
		} 
	}

	render(container: HTMLDivElement, x: number, y: number) {
		const doc = container.ownerDocument
		const fieldset = doc.createElement('fieldset') as HTMLFieldSetElement;
		const playerdiv = doc.createElement('div') as HTMLDivElement
		playerdiv.title = this.name
		const carddiv = doc.createElement('div') as HTMLDivElement
		carddiv.classList.add(...Card.relcard)
		container.appendChild(playerdiv)
		playerdiv.appendChild(fieldset)

		const legend = doc.createElement('legend') as HTMLLegendElement;
		legend.textContent = `Player: ${this.name}`;
		fieldset.appendChild(legend);

		const onholdlabel = doc.createElement('label') as HTMLLabelElement
		onholdlabel.textContent = `On Hold:${this.onHold}`
		const outofcombatlabel = doc.createElement('label') as HTMLLabelElement
		outofcombatlabel.textContent = `Out of Combat:${this.outOfCombat}`
		const levelheadedlabel = doc.createElement('label') as HTMLLabelElement
		levelheadedlabel.textContent = `Level Headed:${this.levelHeaded}`
		const impLevelHeadedlabel = doc.createElement('label') as HTMLLabelElement
		impLevelHeadedlabel.textContent = `Improved Level Headed:${this.impLevelHeaded}`
		const quicklabel = doc.createElement('label') as HTMLLabelElement
		quicklabel.textContent = `Quick:${this.quick}`
		const hesitantlabel = doc.createElement('label') as HTMLLabelElement
		hesitantlabel.textContent = `Hesitant:${this.hesitant}`
		const choosecardlable = doc.createElement('label') as HTMLLabelElement
		choosecardlable.textContent = `Chooses Card:${this.chooseCard}`

		fieldset.appendChild(onholdlabel)
		fieldset.appendChild(outofcombatlabel)
		fieldset.appendChild(levelheadedlabel)
		fieldset.appendChild(impLevelHeadedlabel)
		fieldset.appendChild(quicklabel)
		fieldset.appendChild(hesitantlabel)
		fieldset.appendChild(choosecardlable)
		fieldset.appendChild(carddiv)

		const dh = ButtonFactory.getButton("dh","Discard Hand", "card-discard", this.id)
		dh.addEventListener('click', function () {
			let p = parseInt(this.getAttribute('data-uuid') as string)
		  Game.instance.deck.moveToDiscardPool(Game.instance.deck.players[p].hand, 0)
		  Game.instance.render()
		})
		fieldset.appendChild(dh)

		for (const c of this.hand) {
			c.render(carddiv, x, y)
			x = x + Deck.rem2px(Card.spreadinc)
		}
	}
}