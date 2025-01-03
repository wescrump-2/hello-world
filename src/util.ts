export class Util {
	static ID = "com.wescrump.initiative-tracker"
	
	static rem2px(remstr: string): number {
		const rem = parseFloat(remstr)
		return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
	}

	static shortUUID(): string {
		const uuid = crypto.randomUUID()
		const cleanUUID = uuid.replace(/-/g, '');
		const byteArray = new Uint8Array(cleanUUID.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
		const base64UUID = btoa(String.fromCharCode(...byteArray));
		return base64UUID.replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
	}

	static expandUUID(shortUUID: string): string {
		let paddedUUID = shortUUID + '=='.slice(0, (4 - shortUUID.length % 4) % 4);
		const byteString = atob(paddedUUID.replace(/-/g, '+').replace(/_/g, '/'));
		const byteArray = new Uint8Array(byteString.length);
		for (let i = 0; i < byteString.length; i++) {
			byteArray[i] = byteString.charCodeAt(i);
		}
		const hexUUID = Array.from(byteArray, byte => byte.toString(16).padStart(2, '0')).join('');
		return `${hexUUID.slice(0, 8)}-${hexUUID.slice(8, 12)}-${hexUUID.slice(12, 16)}-${hexUUID.slice(16, 20)}-${hexUUID.slice(20)}`;
	}
}