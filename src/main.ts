import './style.css'
import { setupButtons} from './counter.ts'
import cardsImage from '/cards.svg'
import buttonsImage from '/buttons.svg'
import { Game } from './game.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>

    <div id="svgbuttons"></div>
    <div id="svgContainer"></div>
    <script src="cards.js"></script>
  </div>
  <object id="cards-svg" width="0" height="0" data="${cardsImage}" type="image/svg+xml"></object>
  <object id="buttons-svg" width="0" height="0" data="${buttonsImage}" type="image/svg+xml"></object>   
`
window.addEventListener("load", () => {
  const svgCards = document.getElementById('cards-svg') as HTMLObjectElement
  const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement

  if (svgCards.contentDocument && svgButtons.contentDocument) {
    const game = new Game(document.getElementById('svgContainer') as HTMLDivElement)
    game.deck.setBack(4)
    game.startGame()

    game.drawInitiative()

    game.render()
    setupButtons(document.querySelector<HTMLDivElement>('#app')!)
  } else {
    console.error("Failed to load SVG document")
  }
});