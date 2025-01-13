export class ButtonFactory {
    static readonly BUTTON_CLASS = 'toggle-image';
    static readonly SUCCESS_CLASS = 'btn-success';
    static readonly SVG_NAMESPACE = "http://www.w3.org/2000/svg";

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
                svg.style.height = ButtonFactory.buttonSize()
                svg.style.width = ButtonFactory.buttonSize()
                const root = svgDocument.getRootNode().firstChild as SVGElement
                const h = root.style.height.replace("px", "")
                const w = root.style.width.replace("px", "")
                svg.setAttribute('viewBox', `0 0 ${h} ${w}`)
                svg.innerHTML = path.outerHTML
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