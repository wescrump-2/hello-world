import './style.css';
import OBR, { isImage, Image, Item } from "@owlbear-rodeo/sdk";

import cardsImage from '/cards.svg';
import buttonsImage from '/buttons.svg';

import { setupContextMenu } from "./contextmenu";
import { Deck, DeckMeta } from './deck';
import { Player, PlayerMeta } from './player';
import { Util } from './util';

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div id="svgContainer"></div>
    <script src="cards.js"></script>
  </div>
  <object id="cards-svg" width="0" height="0" data="${cardsImage}" type="image/svg+xml"></object>
  <object id="buttons-svg" width="0" height="0" data="${buttonsImage}" type="image/svg+xml"></object>   
`;

let unsubscribe: (() => void)[] = [];

OBR.onReady(async () => {
  const svgCards = document.getElementById('cards-svg') as HTMLObjectElement;
  const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement;

  if (svgCards.contentDocument && svgButtons.contentDocument) {
    console.log("Button and card images loaded");
  } else {
    console.error("Button and card images NOT loaded");
  }

  setupContextMenu();
  await setupGameState();
});

async function setupGameState(): Promise<void> {
  const deck = Deck.getInstance();
  try {
    deck.isGM = (await OBR.player.getRole()) === "GM";
  } catch (error) {
    console.error("Failed to get GM role:", error);
  }

  // Setup callback for room data
  unsubscribe.push(OBR.room.onMetadataChange(renderRoom));

  // Get room data
  try {
    const metadata = await OBR.room.getMetadata();
    const dmd = metadata[Util.DeckMkey] as DeckMeta;
    if (dmd && 'cardpool' in dmd && Array.isArray(dmd.cardpool)) {
      deck.updateState(dmd);
    } else {
      await deck.updateOBR();
    }
  } catch (error) {
    console.error(`Failed to get room metadata: ${error}`);
  }

  // Setup callback for scene items change
  unsubscribe.push(OBR.scene.items.onChange(renderList));

  await updatePlayerStateAll();
}

function renderRoom(metadata: any) {
  const dmd = metadata[Util.DeckMkey] as DeckMeta;
  if (dmd) {
    console.log("Room metadata changed:", dmd);
    Deck.getInstance().updateState(dmd);
  }
}

async function updatePlayerStateAll() {
  try {
    const items = await OBR.scene.items.getItems(
      (item): item is Image => item.layer === "CHARACTER" && isImage(item)
    );
    await updatePlayerState(items);
  } catch (error) {
    console.error(`Failed to get scene items: ${error}`);
    Deck.getInstance().renderDeck();
  }
}

async function updatePlayerState(items: Item[]) {
  const deck = Deck.getInstance();
  let shouldRender = false;
  const foundPlayers: Player[] = [];

  for (const item of items) {
    const pmd = item.metadata[Util.PlayerMkey] as PlayerMeta;
    if (pmd) {
      const player = rehydratePlayer(pmd);
      foundPlayers.push(player);
      shouldRender = true;
    }
  }

  // Remove players not found in the scene
  const playersToRemove = deck.players.filter(p => !foundPlayers.some(player => player.id === p.id));
  for (const player of playersToRemove) {
    player.removeRender();
    deck.removePlayer(player);
    shouldRender = true;
  }

  if (shouldRender) {
    deck.renderDeck();
  }
}

function rehydratePlayer(pmd: PlayerMeta): Player {
  let player = Deck.getInstance().getPlayer(pmd.id);
  if (!player) {
    player = Deck.getInstance().addPlayer(pmd.name);
    Deck.getInstance().extractPlayerCards(player);
  }
  player.setMeta = pmd;
  return player;
}

function renderList(items: Item[]): void {
  updatePlayerState(items);
}


// import './style.css'
// import OBR, { isImage, Image } from "@owlbear-rodeo/sdk"

// import cardsImage from '/cards.svg'
// import buttonsImage from '/buttons.svg'

// import { setupContextMenu } from "./contextmenu"
// import { Deck, DeckMeta } from './deck'
// import { Player, PlayerMeta } from './player'
// import { Util } from './util'

// document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
//   <div>
//     <div id="svgContainer"></div>
//     <script src="cards.js"></script>
//   </div>
//   <object id="cards-svg" width="0" height="0" data="${cardsImage}" type="image/svg+xml"></object>
//   <object id="buttons-svg" width="0" height="0" data="${buttonsImage}" type="image/svg+xml"></object>   
// `

// let unsubscribe = []
// OBR.onReady(async () => {
//   const svgCards = document.getElementById('cards-svg') as HTMLObjectElement
//   const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement
//   if (svgCards.contentDocument && svgButtons.contentDocument) {
//     console.log("button and card images loaded")
//   } else {
//     console.error("button and card images NOT loaded")
//   }
//   setupContextMenu()
//   setupGameState()
// })

// async function setupGameState(): Promise<void> {
//   let deck = Deck.getInstance()
//   try {
//     deck.isGM = await OBR.player.getRole().then(role => role === "GM")
//   } catch {
//     console.error("get gm role failed")
//   }
//   //setup callback for room data
//   function renderRoom(metadata: any) {
//     const dmd = metadata[Util.DeckMkey] as DeckMeta
//     if (dmd) {
//       console.log("Room metadata changed:", dmd)
//       Deck.getInstance().updateState(dmd)
//     }
//   }
//   unsubscribe.push(OBR.room.onMetadataChange(renderRoom))

//   // get room data
//   try {
//     let metadata = await OBR.room.getMetadata()
//     let dmd = metadata[Util.DeckMkey] as DeckMeta
//     let found = true
//     try {
//       dmd.cardpool.length
//     } catch {
//       found = false
//     }
//     if (found && dmd) {
//       deck.updateState(dmd)
//     } else {
//       deck.updateOBR()
//     }
//   } catch (e) {
//     console.error(`getting room meta failed ${e}`)
//   }

//   function renderList(items: any[]): void {
//     updatePlayerState(items)
//   }
//   unsubscribe.push(OBR.scene.items.onChange(renderList))
//   updatePlayerStateAll()
// }

// async function updatePlayerStateAll() {
//     try {
//       updatePlayerState(await OBR.scene.items.getItems(
//         (item): item is Image => item.layer === "CHARACTER" && isImage(item)
//       ))
//     } catch (e) {
//       console.log(`getitems missing. ${e}`)
//       Deck.getInstance().renderDeck()
//     }
//   }

// async function updatePlayerState(items: any[]) {
//   const deck = Deck.getInstance()
//   let flgrender = false
//   //players
//   const found: Player[] = []

//   for (const item of items) {
//     const pmd: PlayerMeta = item.metadata[Util.PlayerMkey] as PlayerMeta
//     if (pmd) {
//       let p = rehydratePlayer(pmd)
//       found.push(p);
//       flgrender = true
//     }
//   }

//   //find any player that is not in scene objects remove render and player
//   const result = deck.players.filter(p => !found.find(item => p.id === item.id));
//   for (const p of result) {
//     p.removeRender()
//     deck.removePlayer(p)
//     flgrender = true
//   }

//   if (flgrender) {
//     deck.renderDeck()
//   }
// }

// function rehydratePlayer(pmd: PlayerMeta): Player {
//   let p = Deck.getInstance().getPlayer(pmd.id)
//   if (!p) {
//     // if not found, create them, give name and unique id from metadata
//     p = Deck.getInstance().addPlayer(pmd.name)

//     // see if they have any cards in other pools and remove
//     Deck.getInstance().extractPlayerCards(p)
//   }
//   p.setMeta = pmd
//   return p
// }
