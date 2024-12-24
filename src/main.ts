import './style.css'
import { setupCounter } from './counter.ts'
import { Game } from './cards.ts'
import typescriptLogo from '/typescript.svg'
import viteLogo from '/vite.svg'
import cardsImage from '/cards.svg'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <a href="https://vite.dev" target="_blank">
      <img src="${viteLogo}" class="logo" alt="Vite logo" />
    </a>
    <a href="https://www.typescriptlang.org/" target="_blank">
      <img src="${typescriptLogo}" class="logo vanilla" alt="TypeScript logo" />
    </a>
    <object id="hidden-svg" width="0" height="0" data="${cardsImage}" type="image/svg+xml"></object> 
    <div class="card">
      <button id="counter" type="button"></button>
    </div>
    <div id="svgContainer">
    </div>
    <script src="cards.js"></script>
    <p class="read-the-docs">
      Click on the Vite and TypeScript logos to learn more
    </p>
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
    const game = new Game( document.getElementById('hidden-svg') as HTMLObjectElement, document.getElementById('svgContainer') as HTMLDivElement )
    game.addPlayer("Alice")
    game.addPlayer("Bob")
    game.addPlayer("Carol")
    game.addPlayer("David")
    game.startGame()
    
    game.deck.dealFromTop(game.deck.players[0], 5)
    game.deck.dealFromBottom(game.deck.players[1], 5)
    game.deck.dealFromTop(game.deck.players[2], 5)
    game.deck.dealFromTop(game.deck.players[3], 5)
    
    game.draw()
    
    console.log(game.deck.players[0].hand)
    console.log(game.deck.players[1].hand)
    console.log(game.deck.players[2].hand)
    console.log(game.deck.players[3].hand)

  } else {
    console.error("Failed to load SVG document")
  }
});