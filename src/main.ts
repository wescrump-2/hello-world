import './style.css'
import OBR from "@owlbear-rodeo/sdk"
import { setupContextMenu } from "./contextmenu"
import { setupInitiativeList } from "./initiativelist.ts"
import cardsImage from '/cards.svg'
import buttonsImage from '/buttons.svg'
import { Game } from './game.ts'
import { Card } from './cards.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
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
    game.deck.setBack(Math.floor(Math.random()*(Card.backs.length+1.0)))
    game.startGame()
    game.render()
  } else {
    console.error("Failed to load SVG document")
  }
})

OBR.onReady(async () => {
  setupContextMenu()
  setupInitiativeList() 
  Game.instance.updateGameOBState(await Game.instance.getCharacterItems())
})
