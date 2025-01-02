export class ButtonFactory {
	static getButton(id: string, title: string, imagekey: string, uuid: string): HTMLButtonElement {
		const but = document.createElement('button') as HTMLButtonElement
		but.id = id
		but.title = title
		but.classList.add('btn')
		but.setAttribute('data-pid', uuid)
		ButtonFactory.setImage(imagekey, but)
		return but
	}
	static setImage(imagekey: string, but: HTMLButtonElement) {
		let svg = but.firstChild as SVGSVGElement
		if (!svg) {
			svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement
			but.appendChild(svg)
		}

		//get source of image
		const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement
		const svgDocument = svgButtons.contentDocument?.getRootNode() as SVGSVGElement
		if (svgDocument) {
			const path = svgDocument.querySelector(`[class="${imagekey}"]`) as SVGSVGElement
			svg.style.height = ButtonFactory.buttonSize()
			svg.style.width = ButtonFactory.buttonSize()
			const root = svgDocument.getRootNode().firstChild as SVGElement
			const h = root.style.height.replace("px", "")
			const w = root.style.width.replace("px", "")
			svg.setAttribute('viewBox', `0 0 ${h} ${w}`)
			svg.innerHTML = path.outerHTML
		}
	}

	static buttonSize(): string {
		const rootStyles = getComputedStyle(document.documentElement)
		return rootStyles.getPropertyValue('--button-size').trim()
	}

	static toggle(event: Event, imagekey: string = '') {
		const className = 'btn-success'
		if (event.currentTarget instanceof HTMLButtonElement) {
			const but = event.currentTarget as HTMLButtonElement
			if (but.classList.contains(className)) {
				but.classList.remove(className);
			} else {
				but.classList.add(className);
			}
			if (imagekey != '') {
				const svg = but.querySelector(`[class="${imagekey}"]`) as SVGSVGElement
				if (!svg) {
					ButtonFactory.setImage(imagekey, but)
				}
			}
		}
		//document.body.offsetHeight
	}
}