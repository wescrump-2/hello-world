export class ButtonFactory {
	static getButton(id: string, title: string, imagekey: string, uuid: string): HTMLButtonElement {
		const but = document.createElement('button') as HTMLButtonElement
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg") as SVGSVGElement
		but.id = id
		but.title = title
		but.classList.add('btn')
		but.setAttribute('data-uuid', uuid)
		but.appendChild(svg)
		//get source of image
		const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement
		const svgDocument = svgButtons.contentDocument?.getRootNode() as SVGSVGElement
		if (svgDocument) {
			const path = svgDocument.querySelector(`[class="${imagekey}"]`) as SVGSVGElement
			svg.style.height = "1.1em"
			svg.style.width = "1.1em"
			const root = svgDocument.getRootNode().firstChild as SVGElement
			const h = root.style.height.replace("px", "")
			const w = root.style.width.replace("px", "")
			svg.setAttribute('viewBox', `0 0 ${h} ${w}`)
			svg.innerHTML = path.outerHTML
		}
		return but
	}
	static toggle(event: Event) {
		const className = 'btn-success'
		if (event.currentTarget instanceof HTMLButtonElement) {
		  if (event.currentTarget.classList.contains(className)) {
			event.currentTarget.classList.remove(className);
		  } else {
			event.currentTarget.classList.add(className);
		  }
		}
		document.body.offsetHeight
	  }
}