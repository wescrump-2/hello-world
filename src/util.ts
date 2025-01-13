import { Card } from "./cards";

export class Util {
    static ID = "com.wescrump.initiative-tracker";
    static PlayerMkey = `${Util.ID}/player`;
    static DeckMkey = `${Util.ID}/deck`;
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

    static readonly BUTTON_CLASS = 'btn';
    static readonly SUCCESS_CLASS = 'btn-success';
    static readonly SVG_NAMESPACE = "http://www.w3.org/2000/svg";

    static getButton(id: string, title: string, imageKey: string, uuid: string): HTMLButtonElement {
        const button = document.createElement('button') as HTMLButtonElement;
        button.id = id;
        button.title = title;
        button.classList.add(Util.BUTTON_CLASS);
        button.dataset.pid = uuid; // Use dataset for custom attributes
        const svg = button.querySelector(`svg`) as SVGElement;
        Util.setImage(imageKey, svg, '--button-size');
        return button;
    }

    static setImage(imageKey: string, svg: SVGElement, css: string) {
        const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement;
        if (svgButtons.contentDocument) {
            const svgDocument = svgButtons.contentDocument.documentElement as unknown as SVGSVGElement;
            const path = svgDocument.querySelector(`#${imageKey}`) as SVGElement;

            if (path) {
                let vbpath = path.getAttribute("viewbox")
                if (!vbpath)
                    vbpath = '0 0 512 512'
                svg.setAttribute('viewBox', vbpath)
                svg.innerHTML = path.outerHTML
                svg.setAttribute('width', Util.sizePixels(css))
                svg.setAttribute('height', Util.sizePixels(css))
            }
        }
    }

    private static sizePixels(css: string): string {
        return Util.convertToPixels(getComputedStyle(document.documentElement).getPropertyValue(css).trim())
    }

    static convertToPixels(size: string): string {
        const div = document.createElement('div');
        div.style.width = size;
        div.style.visibility = "hidden"
        div.style.position = "absolute"
        document.body.appendChild(div)
        const computedWidth = window.getComputedStyle(div).width
        document.body.removeChild(div)
        return computedWidth
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

    static shortUUID(): string {
        const uuid = crypto.randomUUID().replace(/-/g, '');
        const byteArray = new Uint8Array(uuid.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        return btoa(String.fromCharCode(...byteArray))
            .replace(/=+$/, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    static expandUUID(shortUUID: string): string {
        let paddedUUID = shortUUID + '=='.slice(0, (4 - shortUUID.length % 4) % 4);
        const byteString = atob(paddedUUID.replace(/-/g, '+').replace(/_/g, '/'));
        const byteArray = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) {
            byteArray[i] = byteString.charCodeAt(i);
        }
        const hexUUID = Array.from(byteArray, byte => byte.toString(16).padStart(2, '0')).join('');

        // Ensure the UUID format is correct by adding hyphens
        return `${hexUUID.slice(0, 8)}-${hexUUID.slice(8, 12)}-${hexUUID.slice(12, 16)}-${hexUUID.slice(16, 20)}-${hexUUID.slice(20)}`;
    }
}
