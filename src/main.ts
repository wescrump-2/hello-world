import './style.css'
import OBR, { isImage, Image } from "@owlbear-rodeo/sdk"

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
// window.addEventListener("load", () => {
//   const svgCards = document.getElementById('cards-svg') as HTMLObjectElement
//   const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement

//   if (svgCards.contentDocument && svgButtons.contentDocument) {
//     //const deck = Deck.getInstance()
//     //deck.back = (Math.floor(Math.random() * (Card.backs.length + 1.0)))
//     //deck.newGame()
//     //deck.renderDeck()
//   } else {
//     console.error("Failed to load SVG document")
//   }
// })

let unsubscribe = []
OBR.onReady(async () => {
  const svgCards = document.getElementById('cards-svg') as HTMLObjectElement
  const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement
  if (svgCards.contentDocument && svgButtons.contentDocument) {
    console.log("button and card images loaded")
  } else {
    console.error("button and card images NOT loaded")
  }
  setupContextMenu()
  setupGameState()
})

async function setupGameState(): Promise<void> {
  let deck = Deck.getInstance()
  try {
    deck.isGM = await OBR.player.getRole().then(role => role === "GM")
  } catch {
    console.error("get gm role failed")
  }
  //setup callback for room data
  function renderRoom(metadata: any) {
    const dmd = metadata[Util.DeckMkey] as DeckMeta
    if (dmd) {
      console.log("Room metadata changed:", dmd)
      Deck.getInstance().updateState(dmd)
    }
  }
  unsubscribe.push(OBR.room.onMetadataChange(renderRoom))

  // get room data
  try {
    let metadata = await OBR.room.getMetadata()
    let dmd = metadata[Util.DeckMkey] as DeckMeta
    let found = true
    try {
      dmd.cardpool.length
    } catch {
      found = false
    }
    if (found && dmd) {
      deck.updateState(dmd)
    } else {
      deck.updateOBR()
    }
  } catch (e) {
    console.error(`getting room meta failed ${e}`)
  }

  function renderList(items: any[]): void {
    updatePlayerState(items)
  }
  unsubscribe.push(OBR.scene.items.onChange(renderList))
  updatePlayerStateAll()
}

async function updatePlayerStateAll() {
    try {
      updatePlayerState(await OBR.scene.items.getItems(
        (item): item is Image => item.layer === "CHARACTER" && isImage(item)
      ))
    } catch (e) {
      console.log(`getitems missing. ${e}`)
      Deck.getInstance().renderDeck()
    }
  }

async function updatePlayerState(items: any[]) {
  const deck = Deck.getInstance()
  let flgrender = false
  //players
  const found: Player[] = []

  for (const item of items) {
    const pmd: PlayerMeta = item.metadata[Util.PlayerMkey] as PlayerMeta
    if (pmd) {
      let p = rehydratePlayer(pmd)
      found.push(p);
      flgrender = true
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
  p.setMeta = pmd
  return p
}
