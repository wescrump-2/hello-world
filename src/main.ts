import './style.css'
import OBR, { isImage } from "@owlbear-rodeo/sdk"

import cardsImage from '/cards.svg'
import buttonsImage from '/buttons.svg'

import { setupContextMenu } from "./contextmenu"
import { Deck, DeckMeta } from './deck'
import { Player, PlayerMeta } from './player'
import { Util } from './util'

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
    //const deck = Deck.getInstance()
    //deck.back = (Math.floor(Math.random() * (Card.backs.length + 1.0)))
    //deck.newGame()
    //deck.renderDeck()
  } else {
    console.error("Failed to load SVG document")
  }
})
let unsubscribe=[]
OBR.onReady(async () => {
  setupContextMenu()
  setupGameState()
  //updatePlayerState(await Player.getOBRCharacterItems())
  unsubscribe.push(OBR.room.onMetadataChange((metadata) => {
    const dmd = metadata[Util.DeckMkey] as DeckMeta
    if (dmd) {
      //("Room metadata changed:", dmd)
      Deck.getInstance().updateState()
    }
  }))
  await Deck.getInstance().updateState()
})

async function setupGameState(): Promise<void> {
  function renderList(items: any[]): void {
    updatePlayerState(items)
  }
  OBR.scene.items.onChange(renderList)
  let chars = await getOBRCharacterItems()
  updatePlayerState(chars)
}

async function getOBRCharacterItems() {
  let r: any[] = []
  try {
    const characters = await OBR.scene.items.getItems((item) => {
      return item.layer === "CHARACTER" && isImage(item)
    })
    return characters
  } catch (error) {
    console.error("Failed to get character items:", error)
  }
  return r
}

async function updatePlayerState(items: any[]) {
  const deck = Deck.getInstance()
  let flgrender = false
  //players
  const found: Player[] = [];
  for (const item of items) {
    if (item.layer === "CHARACTER" && isImage(item)) {
      const pmd: PlayerMeta = item.metadata[Util.PlayerMkey] as PlayerMeta
      if (pmd) {
        let p = rehydratePlayer(pmd)
        found.push(p);
        flgrender = true
      }
    }
  }

  //find any player that is not in scene objects remove render and player
  const result = deck.players.filter(p => !found.find(item => p.id === item.id));
  for (const p of result) {
    p.removeRender()
    deck.removePlayer(p)
    flgrender = true
  }

  if (flgrender) {
    deck.renderDeck()
  }
}

function rehydratePlayer(pmd: PlayerMeta): Player {
  let p = Deck.getInstance().getPlayer(pmd.id)
  if (!p) {
    // if not found, create them, give name and unique id from metadata
    p = Deck.getInstance().addPlayer(pmd.name)
 
    // see if they have any cards in other pools and remove
    Deck.getInstance().extractPlayerCards(p)
  }
     //console.log(`pmd extensible:${Object.isExtensible(pmd.hand)} sealed:${Object.isSealed(pmd.hand)} frozen:${Object.isFrozen(pmd.hand)}}`)
    p.setMeta = pmd
  return p
}
