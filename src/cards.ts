import { Deck } from "./deck";
import { Debug, Util } from "./util";

export enum Suit {
    Hearts = "Hearts",
    Diamonds = "Diamonds",
    Clubs = "Clubs",
    Spades = "Spades",
    RedJoker = "RedJoker",
    BlackJoker = "BlackJoker"
}

export enum Rank {
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
    Jack = 11,
    Queen = 12,
    King = 13,
    Ace = 14,
    Joker = 15
}

export enum Color {
    Red = "Red",
    Black = "Black"
}

export enum Facing {
    None,
    Up,
    Down
}

export class Card {
    private static _cards: Card[] = [];
    static backs: SVGSVGElement[] = [];
    public static readonly abscard: string[] = ["position-absolute", "small-card"];
    public static readonly relcard: string[] = ["position-relative", "small-card"];
    public static readonly concard: string[] = ["position-relative", "small-card-div"];
    //public static backindex: number = 0;

    public sequence: number;
    public dir: Facing = Facing.Down;
    public suit: Suit;
    public rank: Rank;
    public face: SVGElement;
    public color: Color;

    private static svgDoc: Document | null = null;

    // Static getter for cards
    public static get cards(): Card[] {
        if (Card._cards.length === 0) {
            for (let i = 1; i <= 56; i++) {
                Card._cards.push(new Card(i));
            }
        }
        return Card._cards;
    }

    // Helper method to get a card by sequence
    public static byId(seq: number): Card {
        const s = Math.max(1, Math.min(56, seq));
        return Card.cards.find(c => c.sequence === s)!;
    }

    constructor(sequence: number) {
        this.sequence = sequence;
        this.dir = Facing.Down;

        if (!Card.svgDoc) {
            const obj = document.getElementById("cards-svg") as HTMLObjectElement;
            Card.svgDoc = obj.contentDocument;
        }

        if (Card.backs.length === 0 && Card.svgDoc) {
            const elements = Array.from(Card.svgDoc.querySelectorAll("[cardback]"));
            Card.backs = elements.map(el => el as SVGSVGElement);
        }

        this.face = Card.svgDoc?.querySelector(`[sequence="${sequence}"]`) as SVGElement;
        this.rank = Number(this.face.getAttribute("rank")) as Rank;
        this.suit = this.face.getAttribute("suit") as Suit;
        this.color = (this.suit === Suit.Spades || this.suit === Suit.Clubs || this.suit === Suit.BlackJoker) ? Color.Black : Color.Red;
    }

    public static isJoker(c: number): boolean {
        return c > 52;
    }


    public static cardSpread(type: string): string {
        return getComputedStyle(document.documentElement).getPropertyValue(type).trim();
    }

    public displayText(): string {
        if (this.dir === Facing.Up || Debug.enabled) {
            let pc = Deck.getInstance().carddeck.find(c => c.cid === this.sequence);
            let dbg = (Debug.enabled) ? `[${this.sequence}:${pc?.order}/${pc?.dealOrder}]` : '';
            return `${Rank[this.rank]} of ${(this.rank === Rank.Joker) ? this.color : this.suit}${dbg}`
            
        } else {
            return 'card';
        }
    }

    public render(container: HTMLDivElement, x: number, y: number, override: Facing = Facing.None): SVGSVGElement {
        if (override !== Facing.None) this.dir = override;

        const cardId = `card-svg-${this.sequence}`;
        let div = container.ownerDocument.createElement('div');
        let svg = container.ownerDocument.createElementNS(Util.SVG_NAMESPACE, "svg");
        svg.classList.add(...Card.abscard, 'card');
        svg.classList.toggle('chosen', Deck.getInstance().isCardSelected(this.sequence));
        div.id = cardId;
        div.style.position = 'absolute';
        div.style.left = `${x}px`;
        div.style.top = `${y}px`;

        div.appendChild(svg);
        container.appendChild(div);

        svg.setAttribute('data-card-id', this.sequence.toString());
        const source = this.dir === Facing.Up ? this.face : Deck.getInstance().backsvg;
        svg.replaceChildren();
        svg.append(...Array.from(source.children).map(c => c.cloneNode(true)));
        div.title = this.displayText();

        // === viewBox: set only once, and ONLY when the SVG is attached and has content ===
        if (!svg.hasAttribute('viewBox') && svg.isConnected && svg.children.length > 0) {
            requestAnimationFrame(() => {
                try {
                    const bbox = svg.getBBox();
                    if (bbox.width > 0 && bbox.height > 0) {
                        svg.setAttribute('viewBox', `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
                    }
                } catch (e) {
                    // Silently ignore – sometimes getBBox fails on detached/invalid SVG
                    Debug.warn("getBBox failed for card, ignore, it happens on detached svg.", this.sequence);
                }
            });
        }
        return svg;
    }
}