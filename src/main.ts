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
`
function setupCards() {
  const svgCards = document.getElementById('cards-svg') as HTMLObjectElement
  const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement

  if (svgCards.contentDocument && svgButtons.contentDocument) {
    console.log("Button and card images loaded");
  } else {
    console.error("Failed to load SVG document")
  }
}
window.addEventListener("load", () => {
  setupCards()
})

OBR.onReady(async () => {
    setupContextMenu();
    await setupGameState();
  });


let unsubscribe: (() => void)[] = [];
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
    player = Deck.getInstance().addPlayer(pmd.name,pmd.id);
    Deck.getInstance().extractPlayerCards(player);
  }
  player.setMeta = pmd;
  return player;
}

function renderList(items: Item[]): void {
  updatePlayerState(items);
}
