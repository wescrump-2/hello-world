import './style.css'
import { setupCounter } from './counter.ts'
import { Game } from './cards.ts'
import cardsImage from '/cards.svg'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <object id="hidden-svg" width="0" height="0" data="${cardsImage}" type="image/svg+xml"></object> 
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <div id="svgContainer">
    </div>
    <script src="cards.js"></script>
  </div>
`

setupCounter(document.querySelector<HTMLButtonElement>('#counter')!)

window.addEventListener("load", () => {
  const svgObject = document.getElementById('hidden-svg') as HTMLObjectElement
  const svgDocument = svgObject.contentDocument

  if (svgDocument) {
    // Now you can access and manipulate the SVG
    const svgElement = svgDocument.documentElement
    console.info(`cards loaded [${svgElement.id}]`)
    // Perform operations on svgElement
    const game = new Game(document.getElementById('hidden-svg') as HTMLObjectElement, document.getElementById('svgContainer') as HTMLDivElement)

    game.startGame()

    game.drawInitiative()

    game.render()

  } else {
    console.error("Failed to load SVG document")
  }
});