import { Card } from "./cards";
import * as pako from 'pako';
import { DeckMeta, PlayerCard } from "./deck";

export class Util {
    static readonly BUTTON_CLASS = 'toggle-image';
    static readonly ACTIVE_CLASS = 'active';
    static readonly SVG_NAMESPACE = "http://www.w3.org/2000/svg";
    static ID = "com.wescrump.initiative-tracker";
    static PlayerMkey = `${Util.ID}/player`;
    static DeckMkey = `${Util.ID}/deck`;

    static display(on:boolean):string {
        if(on) return "initial"
        return "none"
    }
    
/*     
    static hexToRgb(hex: string): { r: number; g: number; b: number } {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    static rgbToHex(r: number, g: number, b: number): string {
        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    static getMidpointColor(color1: string, color2: string): string {
        const rgb1 = Util.hexToRgb(color1);
        const rgb2 = Util.hexToRgb(color2);

        // Calculate midpoint for each component
        const r = Math.round((rgb1.r + rgb2.r) / 2);
        const g = Math.round((rgb1.g + rgb2.g) / 2);
        const b = Math.round((rgb1.b + rgb2.b) / 2);

        return Util.rgbToHex(r, g, b);
    }


    static getContrast(hexColor: string) {
        hexColor = hexColor.replace(/^#/, '');
        if (hexColor.length === 3) {
            hexColor = hexColor.split('').map(c => c + c).join('');
        }
        let r = parseInt(hexColor.slice(0, 2), 16);
        let g = parseInt(hexColor.slice(2, 4), 16);
        let b = parseInt(hexColor.slice(4, 6), 16);
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
        let complementaryHex = ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        return '#' + complementaryHex;
    }

    static generateColorCodes(): string[] {
        // Primary colors
        const primaryColors: { [key: string]: string } = {
            'Red': '#FF0000',
            'Blue': '#0000FF',
            'Yellow': '#FFFF00'
        };

        // Secondary colors (mix of two primary colors)
        const secondaryColors: { [key: string]: string } = {
            'Green': '#00FF00', // Blue + Yellow
            'Purple': '#800080', // Red + Blue
            'Orange': '#FFA500'  // Red + Yellow
        };

        // Tertiary colors (mix of one primary and one secondary color)
        const tertiaryColors: { [key: string]: string } = {
            'Red-Orange': '#FF4500',  // Red + Orange
            'Yellow-Orange': '#FF8C00', // Yellow + Orange
            'Yellow-Green': '#9ACD32',  // Yellow + Green
            'Blue-Green': '#008080',    // Blue + Green
            'Blue-Purple': '#4B0082',   // Blue + Purple
            'Red-Purple': '#8B008B'     // Red + Purple
        };

        // Quadiary colors (mix of various colors, examples)
        const quadiaryColors: { [key: string]: string } = {
            'Teal': '#008080',       // Often considered a mix of blue and green
            'Magenta': '#FF00FF',    // Red + Blue (but more vibrant than purple)
            'Chartreuse': '#7FFF00', // Yellow + Green
            'Maroon': '#800000',     // A dark red, could be seen as red mixed with black/brown
            'Turquoise': '#40E0D0'   // Blue + Green with a slight shift towards green
        };

        // Additional colors
        const additionalColors: { [key: string]: string } = {
            'Black': '#000000',
            'Grey': '#808080',  // This is a medium grey, can be adjusted for lighter or darker shades
            'White': '#FFFFFF',
            'Brown': '#A52A2A'   // This is 'SaddleBrown', one of many shades of brown
        };

        // Combine all color categories into one object
        const allColors = {
            ...primaryColors,
            ...secondaryColors,
            ...tertiaryColors,
            ...quadiaryColors,
            ...additionalColors
        };

        // Convert the object to an array of just the hex values
        return Object.values(allColors);
    }

    static generateRainbowColors(numberOfColors: number): string[] {
        const colors: string[] = [];

        // Helper function to convert HSL to Hex
        const hslToHex = (h: number, s: number, l: number): string => {
            l /= 100;
            const a = s * Math.min(l, 1 - l) / 100;
            const f = (n: number) => {
                const k = (n + h / 30) % 12;
                const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
                return Math.round(255 * color).toString(16).padStart(2, '0');
            };
            return `#${f(0)}${f(8)}${f(4)}`;
        };

        // Calculate steps for hue, saturation, and lightness
        const hueSteps = 360 / (numberOfColors - 2); // Excluding black and white
        const saturationSteps = 100 / (Math.floor((numberOfColors - 2) / 2)); // Half for increase, half for decrease
        //let saturationDirection = 1; // 1 for increase, -1 for decrease

        for (let i = 0; i < numberOfColors; i++) {
            if (i === 0) {
                // Black
                colors.push('#000000');
            } else if (i === numberOfColors - 1) {
                // White
                colors.push('#FFFFFF');
            } else {
                const hue = i * hueSteps;
                let saturation = Math.min(100, i * saturationSteps);
                let lightness = 50; // Full saturation at 50% lightness

                // If we've passed the midpoint, decrease saturation and increase lightness
                if (i >= Math.floor((numberOfColors - 2) / 2)) {
                    saturation = 100 - ((i - Math.floor((numberOfColors - 2) / 2)) * saturationSteps);
                    lightness = 50 + ((i - Math.floor((numberOfColors - 2) / 2)) * 50 / Math.ceil((numberOfColors - 2) / 2));
                }

                colors.push(hslToHex(hue, saturation, lightness));
            }
        }

        return colors;
    }
 */
    static setImage(imageKey: string, button: HTMLButtonElement) {
        let svg = button.querySelector('svg') as SVGSVGElement;
        if (!svg) {
            svg = document.createElementNS(Util.SVG_NAMESPACE, 'svg') as SVGSVGElement;
            button.appendChild(svg);
        }

        const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement;
        if (svgButtons.contentDocument) {
            const svgDocument = svgButtons.contentDocument.documentElement as unknown as SVGSVGElement;
            const path = svgDocument.querySelector(`.${imageKey}`) as SVGElement;
            if (path) {
                svg.style.height = Util.buttonSize()
                svg.style.width = Util.buttonSize()
                const root = svgDocument.getRootNode().firstChild as SVGElement
                const h = root.style.height.replace("px", "")
                const w = root.style.width.replace("px", "")
                svg.setAttribute('viewBox', `0 0 ${h} ${w}`)
                svg.innerHTML = path.outerHTML
            }
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
                Debug.error('button is null')
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
        Debug.log(`compressing... original: ${serialized.length}, compressed: ${compressed.length}`)
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
            if (compressedData === undefined) 
                Debug.log("compressedData is undefined.")
            const decompressed = pako.inflate(compressedData);
            Debug.log(`decompressing... compressed: ${compressedData.length}, decompressed: ${decompressed.length}`)
            const parsed = JSON.parse(new TextDecoder().decode(decompressed)) as DeckMeta;
            return parsed;
        } catch (err) {
            Debug.error("Failed to decompress deck:", err);
            return {
                    carddeck: Array.from({ length: 56 }, (_, i) => new PlayerCard(i + 1)),
                    back: 0,
                    scale: 1,
                    use4jokers: false,
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
                return Util.decompress(raw) as DeckMeta;
            } catch (e) {
                Debug.warn("Failed to decompress DeckMeta – falling back to raw", e);
                return undefined;
            }
        }
        // uncompressed meta
        return metadata[Util.DeckMkey];
    }
}//end Util

export class Debug {
    private static _enabled = false;
    private static wasEnabled = false;

    static get enabled() {
        return this._enabled;
    }

    static updateFromPlayers(names: string[]) {
        const hasDebugPlayer = names.some(p =>
            p.toLowerCase().includes("debug")
        );

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
//     const items = await OBR.scene.items.getItems((item) => item.id === itemId && item.layer === "CHARACTER");

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
//     Debug.error('Error checking character ownership:', error);
//     return false;
//   }
// }
