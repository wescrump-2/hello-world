import './style.css';
import OBR, { isImage, Image, Item } from "@owlbear-rodeo/sdk";

import cardsImage from '/cards.svg';
import buttonsImage from '/buttons.svg';

import { setupContextMenu } from "./contextmenu";
import { Deck, DeckMeta } from './deck';
import { PlayerChar, PlayerMeta } from './player';
import { debounceRender, Util } from './util';
import { initDOM } from './initDOM';

initDOM(cardsImage, buttonsImage);

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
  const unsubscribes = await setupGameState();
  window.addEventListener('beforeunload', () => {
    unsubscribes.forEach(fn => fn());
  })
});


let unsubscribe: (() => void)[] = [];
async function setupGameState(): Promise<(() => void)[]> {
  const deck = Deck.getInstance();
  try {
    deck.isGM = (await OBR.player.getRole()) === "GM";
    deck.currentPlayer
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
      deck.updateState(undefined);
    }
    deck.needsFullRender = true;
    deck.renderDeck();
  } catch (error) {
    console.error(`Failed to get room metadata:`, error);
  }

  // Setup callback for scene items change
  unsubscribe.push(OBR.scene.items.onChange(updatePlayerStateAll));

  try {
    if (await OBR.scene.isReady()) {
      const initialItems = await OBR.scene.items.getItems();
      updatePlayerStateAll(initialItems);
    }
  } catch (error) {
    console.error("Failed to initialize player state:", error);
  }
  setTimeout(() => deck.updateOBR(), 0);
  return unsubscribe;
}

function renderRoom(metadata: any) {
  const dmd = metadata[Util.DeckMkey] as DeckMeta;
  if (dmd) {
    Deck.getInstance().updateState(dmd);
    Deck.getInstance().renderDeck();
  }
}

function updatePlayerStateAll(items: Item[]) {
  let shouldRender = false;
  try {
    const playerItems = items.filter(
      (item): item is Image => item.layer === "CHARACTER" && isImage(item) && item.metadata[Util.PlayerMkey] !== undefined
    );
    if (playerItems.length > 0) {
      shouldRender = updatePlayerState(playerItems);
    }
  } catch (error) {
    console.error(`Failed to process scene items:`, error);
  }
  if (shouldRender) {
    debounceRender(() => Deck.getInstance().renderDeck());
  }
}

function updatePlayerState(items: Item[]): boolean {
  const deck = Deck.getInstance();
  let shouldRender = false;

  const activePids = new Set(
    items.map(item => (item.metadata[Util.PlayerMkey] as PlayerMeta)?.id).filter(Boolean)
  );

  const playersArray = deck.playersArray;
  for (let i = playersArray.length - 1; i >= 0; i--) {
    const localPid = playersArray[i].id;
    if (!activePids.has(localPid)) {
      deck.removePlayer(playersArray[i]);
      shouldRender = true;
    }
  }

  for (const item of items) {
    const pmd = item.metadata[Util.PlayerMkey] as PlayerMeta;
    if (pmd) {
      const player = rehydratePlayer(pmd, deck);
      //console.log(`Player:${player.playerId} retrieved from metadata`)
      shouldRender = (player != null);
    }
  }

  return shouldRender
}

function rehydratePlayer(pmd: PlayerMeta, deck: Deck): PlayerChar {
  let player = deck.getPlayerById(pmd.id);
  if (!player) {
    player = deck.addPlayer(pmd.name, pmd.id, pmd.playerId);
    deck.extractPlayerCards(player);
  }
  player.setMeta = pmd;

  const handSet = new Set(pmd.hand);
  deck.discardpile = deck.discardpile.filter(c => !handSet.has(c));
  console.log('Discard cleaned for rehydrate:', deck.discardpile.length); 
  return player;
}
