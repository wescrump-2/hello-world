import { Card } from "./cards";

export class Util {
    static ID = "com.wescrump.initiative-tracker";
    static PlayerMkey = `${Util.ID}/player`;
    static DeckMkey = `${Util.ID}/deck`;

    /**
     * Converts REM units to pixels.
     * @param remstr - A string representation of a REM value.
     * @returns The pixel equivalent of the REM value.
     */
    static rem2px(remstr: string): number {
        let rem = parseFloat(remstr);
        if (Number.isNaN(rem)) rem=1.0
        const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
        return rem * fontSize;
    }

    static offset(cardIncrement: string, len: number): number {
        let ff = 2
        let inc = Util.rem2px(Card.cardSpread(cardIncrement))
        if ( '--card-spread-inc' === cardIncrement) {
            if (len > 7) inc /= ff
            if (len > 15) inc /= ff
            if (len > 26) inc /= ff
            if (len > 51) inc /= ff
        }
        return Math.max(5,Math.ceil(inc))
    }

    /**
     * Generates a shortened UUID.
     * @returns A base64 encoded string without padding, using '-' and '_' for URL safety.
     */
    static shortUUID(): string {
        const uuid = crypto.randomUUID().replace(/-/g, '');
        const byteArray = new Uint8Array(uuid.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
        return btoa(String.fromCharCode(...byteArray))
            .replace(/=+$/, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    }

    /**
     * Expands a shortened UUID back to its standard format.
     * @param shortUUID - The shortened UUID to expand.
     * @returns The expanded UUID in standard format.
     */
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
