import './style.css'
import OBR from "@owlbear-rodeo/sdk"

import cardsImage from '/cards.svg'
import buttonsImage from '/buttons.svg'

import { setupContextMenu, setupInitiativeList } from "./contextmenu"
import { Deck } from './deck'
import { Card } from './cards'

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
    const deck = Deck.getInstance()
    deck.setBack(Math.floor(Math.random() * (Card.backs.length + 1.0)))
    deck.startGame()
    deck.render()
  } else {
    console.error("Failed to load SVG document")
  }
})

OBR.onReady(async () => {
  setupContextMenu()
  setupInitiativeList()
  Deck.getInstance().updateGameOBState(await Deck.getInstance().getCharacterItems())
})
