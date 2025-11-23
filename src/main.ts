import './style.css';
import OBR, { isImage, Image, Item } from "@owlbear-rodeo/sdk";
import cardsImage from '/cards.svg';
import buttonsImage from '/buttons.svg';
import { setupContextMenu } from "./contextmenu";
import { Deck, DeckMeta } from './deck';
import { getCurrentPlayerId, PlayerChar, PlayerMeta } from './player';
import { Debug, Util } from './util';
import { initDOM } from './initDOM';

let unsubscribes: (() => void)[] = [];

initDOM(cardsImage, buttonsImage);
window.addEventListener("load", () => { setupCards() });

OBR.onReady(async () => {
  await getCurrentPlayerId();
  await new Promise<void>((resolve) => {
    OBR.scene.onReadyChange((isReady) => {
      if (isReady) resolve();
    });
    // In case we are already in a scene when the extension loads
    OBR.scene.isReady().then((ready) => {
      if (ready) resolve();
    });
  });
  setupContextMenu();
  await setupGameState();
  window.addEventListener('beforeunload', () => {
    unsubscribes.forEach(fn => fn());
  })

  if (Debug.enabled) {
    await dumpRoomMetadata();
    await findItemMetadataKeys();
  }
});

function setupCards() {
  const svgCards = document.getElementById('cards-svg') as HTMLObjectElement
  const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement

  if (svgCards.contentDocument && svgButtons.contentDocument) {
    Debug.log("Button and card images loaded");
  } else {
    console.error("Failed to load SVG document")
  }
}

async function setupGameState(): Promise<void> {
  const deck = Deck.getInstance();
  try {
    deck.isGM = (await OBR.player.getRole()) === "GM";
    unsubscribes.push(
      OBR.player.onChange(async (player) => {
        deck.isGM = player.role === "GM";
        deck.renderDeckAsync(); // maybe needed
      })
    );
  } catch (error) {
    console.error("Failed to get GM role:", error);
  }

  unsubscribes.push(OBR.room.onMetadataChange(renderRoom));

  try {
    const metadata = await OBR.room.getMetadata();
    const dmd = metadata[Util.DeckMkey] as DeckMeta;
    if (dmd) {
      deck.updateState(dmd);
    } else {
      deck.updateState(undefined);
    }
  } catch (error) {
    console.error(`Failed to get room metadata:`, error);
  }

  try {
    const initialItems = await OBR.scene.items.getItems();
    updatePlayerStateAll(initialItems);
    deck.cleanupOrphanCards();
  } catch (error) {
    console.error("Failed to initialize player state:", error);
  }

  unsubscribes.push(OBR.scene.items.onChange(updatePlayerStateAll));
  deck.renderDeckAsync();
}

async function renderRoom(metadata: Record<string, any>) {
  Debug.log("renderRoom called.")
  const deck = Deck.getInstance();
  const newMeta = metadata[Util.DeckMkey] as DeckMeta | undefined;

  if (newMeta) {
    deck.updateState(newMeta);
  }

  deck.renderDeckAsync();
}

async function updatePlayerStateAll(items: Item[]) {
  Debug.log("updatePlayerStateAll called.")
  const playerItems = items.filter(
    (item): item is Image => item.layer === "CHARACTER" && isImage(item) && item.metadata[Util.PlayerMkey] !== undefined
  );
  const changed = await updatePlayerState(playerItems);

  if ( changed || playerItems.length === 0) {
    Debug.updateFromPlayers(Deck.getInstance().playerNames)
  }
}

async function updatePlayerState(items: Item[]): Promise<boolean> {
  const deck = Deck.getInstance();
  let changed = false;

  const activePids = new Set(items.map(item => (item.metadata[Util.PlayerMkey] as PlayerMeta)?.characterId).filter(Boolean));

  for (let i = deck.playersArray.length - 1; i >= 0; i--) {
    const localPid = deck.playersArray[i].characterId;
    if (!activePids.has(localPid)) {
      deck.removePlayer(deck.playersArray[i]);
      changed = true;
    }
  }

  for (const item of items) {
    const pmd = item.metadata[Util.PlayerMkey] as PlayerMeta;
    if (pmd?.characterId) {
      const player = rehydratePlayer(pmd, deck);
      Debug.log(`Player:${player.playerId} with hand:${player.characterId} retrieved from metadata`)
      changed = true;
    }
  }

  if (changed) {
    deck.renderDeckAsync();
  }
  return changed;
}

function rehydratePlayer(pmd: PlayerMeta, deck: Deck): PlayerChar {
  let player = deck.getPlayerById(pmd.characterId);
  if (!player) {
    player = deck.addPlayer(pmd.name, pmd.characterId, pmd.playerId);
  }
  player.applyMeta(pmd);
  Debug.updateFromPlayers(deck.playerNames)
  return player;
}

// --- List ALL room metadata keys and their sizes ---
async function dumpRoomMetadata() {
  const meta = await OBR.room.getMetadata();
  Debug.log("=== ROOM METADATA ===");
  for (const [key, value] of Object.entries(meta)) {
    const size = JSON.stringify(value).length;
    Debug.log(`${key}  →  ${size} bytes`, value);
  }
}

// --- List ALL extensions that have stored something on scene items ---
async function findItemMetadataKeys() {
  const items = await OBR.scene.items.getItems();
  const keys = new Set();
  items.forEach(item => {
    if (item.metadata) {
      Object.keys(item.metadata).forEach(k => keys.add(k));
    }
  });
  Debug.log("=== METADATA KEYS FOUND ON SCENE ITEMS ===");
  Debug.log(Array.from(keys).sort());
}

