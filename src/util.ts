import { Card } from "./cards";
import * as pako from 'pako';
import { DeckMeta, PlayerCard } from "./deck";
import OBR from "@owlbear-rodeo/sdk";
import { PlayerChar } from "./player";

export class Util {
    static readonly BUTTON_CLASS = 'toggle-image';
    static readonly ACTIVE_CLASS = 'active';
    static readonly SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    static ID = "com.wescrump.initiative-tracker";
    static PlayerMkey = `${Util.ID}/player`;
    static DeckMkey = `${Util.ID}/deck`;

    static display(on:boolean):string {
        if (on) return ""
        return "none"
    }

    // static setImage(imageKey: string, button: HTMLButtonElement) {
    //     let svg = button.querySelector('svg') as SVGSVGElement;
    //     if (!svg) {
    //         svg = document.createElementNS(Util.SVG_NAMESPACE, 'svg') as SVGSVGElement;
    //         button.appendChild(svg);
    //     }

    //     const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement;
    //     if (svgButtons.contentDocument) {
    //         const svgDocument = svgButtons.contentDocument.documentElement as unknown as SVGSVGElement;
    //         const path = svgDocument.querySelector(`.${imageKey}`) as SVGElement;
    //         if (path) {
    //             svg.style.height = Util.buttonSize()
    //             svg.style.width = Util.buttonSize()
    //             const root = svgDocument.getRootNode().firstChild as SVGElement
    //             const h = root.style.height.replace("px", "")
    //             const w = root.style.width.replace("px", "")
    //             svg.setAttribute('viewBox', `0 0 ${h} ${w}`)
    //             svg.innerHTML = path.outerHTML
    //         }
    //     }
    // }

    static setImage(imageKey: string, button: HTMLButtonElement) {
        try {
            let svg = button.querySelector('svg') as SVGSVGElement;
            if (!svg) {
                svg = document.createElementNS(Util.SVG_NAMESPACE, 'svg') as SVGSVGElement;
                button.appendChild(svg);
            }

            const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement;
            if (!svgButtons || !svgButtons.contentDocument) {
                throw new Error("SVG buttons document not found or not loaded.");
            }

            const svgDocument = svgButtons.contentDocument.documentElement as unknown as SVGSVGElement;
            const path = svgDocument.querySelector(`.${imageKey}`) as SVGElement;
            if (!path) {
                throw new Error(`Path with class ${imageKey} not found in SVG document.`);
            }

            svg.style.height = Util.buttonSize();
            svg.style.width = Util.buttonSize();
            const root = svgDocument.getRootNode().firstChild as SVGElement;
            const h = root.style.height.replace("px", "");
            const w = root.style.width.replace("px", "");
            svg.setAttribute('viewBox', `0 0 ${h} ${w}`);
            svg.innerHTML = path.outerHTML;
        } catch (error) {
            console.error(`Failed to set image ${imageKey} on button:`, error);
        }
    }

    private static buttonSize(): string {
        return getComputedStyle(document.documentElement).getPropertyValue('--button-size').trim();
    }

    static getState(button:HTMLButtonElement): boolean {
        return button.classList.contains(Util.ACTIVE_CLASS);
    }
    static getState3way(button:HTMLButtonElement, s2imagekey:string): {s1:boolean, s2:boolean} {
        let svg = button.querySelector(`svg .${s2imagekey}`) as SVGSVGElement;
        return {s1:button.classList.contains(Util.ACTIVE_CLASS),s2:!(!svg)}
    }
    static setState(button:HTMLButtonElement, state1:boolean){
        if (state1){
        button.classList.add(Util.ACTIVE_CLASS);
        } else {
            if (button) {
                button.classList.remove(Util.ACTIVE_CLASS);
            } else {
                console.error('button is null')
            }
        }
    }

    static setState3way(button: HTMLButtonElement, state1: boolean, imageKey1: string, state2: boolean, imageKey2: string) {
        if (state1 || state2) {
            button.classList.add(Util.ACTIVE_CLASS);
        } else {
            button.classList.remove(Util.ACTIVE_CLASS);
        }

        if (state2) {
            if (imageKey2) {
                let svg = button.querySelector(`svg .${imageKey2}`) as SVGSVGElement;
                if (!svg) {
                    Util.setImage(imageKey2, button);
                }
            }
        } else {
            if (imageKey1) {
                let svg = button.querySelector(`svg .${imageKey1}`) as SVGSVGElement;
                if (!svg) {
                    Util.setImage(imageKey1, button);
                }
            }
        }
    }

    static getButton(container: HTMLDivElement, id: string, title: string, imageKey: string, uuid: string): HTMLButtonElement {
        let button = container.querySelector(`#${id}`) as HTMLButtonElement
        if (!button) {
            button = document.createElement('button') as HTMLButtonElement
            button.id = id;
            button.title = title
            button.classList.add(Util.BUTTON_CLASS)
            if (uuid && uuid.length>0) button.dataset.pid = uuid; // Use dataset for custom attributes
        }
        Util.setImage(imageKey, button)
        return button
    }

    static rem2px(remstr: string): number {
        let rem = parseFloat(remstr);
        if (Number.isNaN(rem)) rem = 1.0
        const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        return rem * fontSize;
    }

    static offset(cardIncrement: string, len: number): number {
        let ff = 2
        let inc = Util.rem2px(Card.cardSpread(cardIncrement))
        if ('--card-spread-inc' === cardIncrement) {
            if (len > 7) inc /= ff
            if (len > 14) inc /= ff
            if (len > 26) inc /= ff
            if (len > 51) inc /= ff
        }
        return Math.max(5, Math.ceil(inc))
    }

    static shortId(len = 7): string {
        return Math.random().toString(36).slice(2, 2 + len);
    }

    // Compress
    static compress(data: DeckMeta): Uint8Array {
        const serialized = JSON.stringify(data);
        const compressed = pako.deflate(serialized, { level: 9 });
        return compressed;
    }

    static isCompressed(value: Uint8Array): boolean {
        if (!value) return false;
        const firstByte = value[0];
        return firstByte === 120; // 120 = 0x78 → zlib/deflate header
    }

    // Decompress
    static decompress(compressedData: Uint8Array): DeckMeta {
        try {
            const decompressed = pako.inflate(compressedData);
            const parsed = JSON.parse(new TextDecoder().decode(decompressed)) as DeckMeta;
            return parsed;
        } catch (err) {
            console.error("Failed to decompress deck:", err);
            return {
                    carddeck: Array.from({ length: 56 }, (_, i) => new PlayerCard(i + 1)),
                    back: 0,
                    scale: 1,
                    use4jokers: false,
                    discardVisible: false,
                    poolVisible: false,
                };
        }
    }
    
    static getByteSize(value: any): number {
        if (value instanceof Uint8Array) return value.length;
        if (Array.isArray(value) && value.every(n => typeof n === 'number' && n >= 0 && n <= 255)) {
            return value.length;
        }
        return JSON.stringify(value).length;
    }


    static getDeckMeta(metadata: Record<string, any>): DeckMeta | undefined {
        const raw = metadata[Util.DeckMkey] as Uint8Array;
        if (!raw) return undefined;

        if (Util.isCompressed(raw)) {
            try {
                let decomp:any = Util.decompress(raw);
                //cleanup by destructuring
                const { ["cardpool"]: _cp, 
                    ["discardpile"]: _dp,
                    ["drawdeck"]: _dd,
                    ["chosenList"]: _cl, 
                    ["currentPlayer"]: _p,
                    ["currentRound"]: _cr,
                    ...rest } = decomp;
                return rest as DeckMeta;
            } catch (e) {
                Debug.warn("Failed to decompress DeckMeta – falling back to raw", e);
                return undefined;
            }
        }
        // uncompressed meta
        return metadata[Util.DeckMkey];
    }

  static async ensureSceneReady(): Promise<boolean> {
    try {
      const isReady = await OBR.scene.isReady();
      if (!isReady) {
        Debug.warn("Scene not ready, waiting for scene to be ready...");
        // Wait for scene to be ready
        await new Promise<void>((resolve) => {
          const unsubscribe = OBR.scene.onReadyChange((ready: boolean) => {
            if (ready) {
              unsubscribe();
              resolve();
            }
          });
        });
        return true;
      }
      return true;
    } catch (error) {
      console.error("Failed to check scene readiness:", error);
      return false;
    }
  }
}//end Util

export class Debug {
    private static _enabled = false;
    private static wasEnabled = false;

    static get enabled() {
        return this._enabled;
    }

    static updateFromPlayers(players:Map<string, PlayerChar>) {
        let hasDebugPlayer = false;
        players.forEach((_, p) => {
            if (p.toLowerCase().includes("debug")) {
                hasDebugPlayer = true;
            }
        });

        if (hasDebugPlayer !== this._enabled) {
            this._enabled = hasDebugPlayer;

            if (hasDebugPlayer && !this.wasEnabled) {
                Debug.log(
                    "%cINITIATIVE DEBUG MODE ACTIVATED — 'debug' player in room.'",
                    "color: lime; background: #000; font-weight: bold; font-size: 16px; padding: 8px 12px; border-radius: 4px;"
                );
            }
            if (!hasDebugPlayer && this.wasEnabled) {
                Debug.log(
                    "%cINITIATIVE DEBUG MODE DEACTIVATED — no 'debug' player in room.",
                    "color: red; background: #000; font-weight: bold; font-size: 16px; padding: 8px 12px; border-radius: 4px;"
                );
            }
            this.wasEnabled = hasDebugPlayer;
        }
    }

    static log(...args: any[]) {
        if (this._enabled) console.log(...args);
    }

    static warn(...args: any[]) {
        if (this._enabled) console.warn(...args);
    }

    static error(...args: any[]) {
        if (this._enabled) console.error(...args);
    }
}// end Debug


// import OBR from "@owlbear-rodeo/sdk";

// async function checkCharacterOwnership(itemId:string) {
//   try {
//     const items = await OBR.scene.items.getItems(    (item): item is Image =>       item.layer ==="CHARACTER" &&   isImage(item)    );

//     if (items.length === 0) {
//       Debug.log("Character not found or not on the CHARACTER layer.");
//       return false;
//     }

//     const character = items[0];
//     const currentPlayer = await OBR.player.getId();

//     // Here's where you would check for ownership. Since OBR doesn't directly expose an 'owner' property,
//     // we'll assume you might have custom metadata or use permissions:
    
//     // Example with custom metadata:
//     if (character.metadata && character.metadata[`${Util.PlayerMkey}/ownerId`] === currentPlayer) {
//       return true; // The character is owned by the active user
//     }

//     // If you're using the built-in 'Owner Only' permissions:
//     // This is more hypothetical because we don't have direct API access to check this:
//     // if(await OBR.scene.items.hasPermission(character.id, "ownerOnly", currentPlayer.id)) {
//     //   return true;
//     // }

//     return false; // If no match is found or if ownership cannot be confirmed
//   } catch (error) {
//     console.error('Error checking character ownership:', error);
//     return false;
//   }
// }
