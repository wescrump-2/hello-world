export class ButtonFactory {
    private static readonly BUTTON_CLASS = 'btn';
    private static readonly SUCCESS_CLASS = 'btn-success';
    private static readonly SVG_NAMESPACE = "http://www.w3.org/2000/svg";

    /**
     * Creates a button with specified properties.
     * @param id - The id for the button.
     * @param title - The title/tooltip for the button.
     * @param imageKey - The key to find the appropriate SVG icon.
     * @param uuid - A unique identifier for the button.
     * @returns A newly created HTMLButtonElement.
     */
    static getButton(id: string, title: string, imageKey: string, uuid: string): HTMLButtonElement {
        const button = document.createElement('button') as HTMLButtonElement;
        button.id = id;
        button.title = title;
        button.classList.add(ButtonFactory.BUTTON_CLASS);
        button.dataset.pid = uuid; // Use dataset for custom attributes
        ButtonFactory.setImage(imageKey, button);
        return button;
    }

    /**
     * Sets or updates the SVG image of the button.
     * @param imageKey - The class name to match the SVG path within the SVG document.
     * @param button - The button element to set the image on.
     */
    static setImage(imageKey: string, button: HTMLButtonElement) {
        let svg = button.querySelector('svg') as SVGSVGElement;
        if (!svg) {
            svg = document.createElementNS(ButtonFactory.SVG_NAMESPACE, 'svg') as SVGSVGElement;
            button.appendChild(svg);
        }

        const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement;
        if (svgButtons.contentDocument) {
            const svgDocument = svgButtons.contentDocument.documentElement as unknown as SVGSVGElement;
            const path = svgDocument.querySelector(`.${imageKey}`) as SVGElement;
            if (path) {
                const size = ButtonFactory.buttonSize();
                svg.style.height = svg.style.width = size;
                const {width, height} = svgDocument;
                svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
                svg.innerHTML = path.outerHTML;
            }
        }
    }

    /**
     * Gets the button size from CSS custom properties.
     * @returns The size of the button as a string.
     */
    private static buttonSize(): string {
        return getComputedStyle(document.documentElement).getPropertyValue('--button-size').trim();
    }

    /**
     * Toggles a class on the button and optionally sets an SVG icon.
     * @param event - The event that triggered the toggle.
     * @param imageKey - Optional key for setting or changing the button's icon.
     */
    static toggle(event: Event, imageKey: string = '') {
        if (!(event.currentTarget instanceof HTMLButtonElement)) return;

        const button = event.currentTarget;
        button.classList.toggle(ButtonFactory.SUCCESS_CLASS);

        if (imageKey) {
            let svg = button.querySelector(`svg .${imageKey}`) as SVGSVGElement;
            if (!svg) {
                ButtonFactory.setImage(imageKey, button);
            }
        }
    }
}


// export class ButtonFactory {
// 	static getButton(id: string, title: string, imagekey: string, uuid: string): HTMLButtonElement {
// 		const but = document.createElement('button') as HTMLButtonElement
// 		but.id = id
// 		but.title = title
// 		but.classList.add('btn')
// 		but.setAttribute('data-pid', uuid)
// 		ButtonFactory.setImage(imagekey, but)
// 		return but
// 	}
// 	static setImage(imagekey: string, but: HTMLButtonElement) {
// 		let svg = but.firstChild as SVGSVGElement
// 		if (!svg) {
// 			svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement
// 			but.appendChild(svg)
// 		}

// 		const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement
// 		const svgDocument = svgButtons.contentDocument?.getRootNode() as SVGSVGElement
// 		if (svgDocument) {
// 			const path = svgDocument.querySelector(`[class="${imagekey}"]`) as SVGSVGElement
// 			svg.style.height = ButtonFactory.buttonSize()
// 			svg.style.width = ButtonFactory.buttonSize()
// 			const root = svgDocument.getRootNode().firstChild as SVGElement
// 			const h = root.style.height.replace("px", "")
// 			const w = root.style.width.replace("px", "")
// 			svg.setAttribute('viewBox', `0 0 ${h} ${w}`)
// 			svg.innerHTML = path.outerHTML
// 		}
// 	}

// 	static buttonSize(): string {
// 		const rootStyles = getComputedStyle(document.documentElement)
// 		return rootStyles.getPropertyValue('--button-size').trim()
// 	}

// 	static toggle(event: Event, imagekey: string = '') {
// 		const className = 'btn-success'
// 		if (event.currentTarget instanceof HTMLButtonElement) {
// 			const but = event.currentTarget as HTMLButtonElement
// 			if (but.classList.contains(className)) {
// 				but.classList.remove(className);
// 			} else {
// 				but.classList.add(className);
// 			}
// 			if (imagekey != '') {
// 				const svg = but.querySelector(`[class="${imagekey}"]`) as SVGSVGElement
// 				if (!svg) {
// 					ButtonFactory.setImage(imagekey, but)
// 				}
// 			}
// 		}
// 	}
// }