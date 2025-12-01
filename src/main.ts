import './style.css';
import OBR, { isImage, Image, Item } from "@owlbear-rodeo/sdk";
import cardsImage from '/cards.svg';
import buttonsImage from '/buttons.svg';
import { setupContextMenu } from "./contextmenu";
import { Deck } from './deck';
import { getCurrentPlayerId, PlayerMeta } from './player';
import { Debug, Util } from './util';
import { initDOM } from './initDOM';

let unsubscribes: (() => void)[] = [];

initDOM(cardsImage, buttonsImage);
window.addEventListener("load", () => { setupCards() });

OBR.onReady(async () => {
  await getCurrentPlayerId();
  setupContextMenu();
  // Optional: react to entering/leaving scene later if needed
  OBR.scene.onReadyChange(async (isReady) => {
    if (isReady) {
      console.log("Entered scene");
      // Do scene-specific init here if needed
    } else {
      console.log("Left scene");
    }
  });

  // Check once at startup
  const isReady = await OBR.scene.isReady();
  if (isReady) {
    // Do any one-time scene init
  }
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
    console.log("Button and card images loaded");
  } else {
    Debug.error("Failed to load SVG document")
  }
}

async function setupGameState(): Promise<void> {
  const deck = Deck.getInstance();

  try {
    deck.isGM = (await OBR.player.getRole()) === "GM";
  } catch (error) {
    Debug.error("Failed to get GM role:", error);
  }

  unsubscribes.push(OBR.room.onMetadataChange(renderRoom));

  try {
    const metadata = await OBR.room.getMetadata();
    const dmd = Util.getDeckMeta(metadata);
    if (dmd) {
      deck.updateState(dmd);
    } else {
      deck.updateState(undefined);
    }
  } catch (error) {
    Debug.error(`Failed to get room metadata:`, error);
    deck.initializeDeck();
    deck.shuffleDeck();
  }

  try {
    const initialItems = await OBR.scene.items.getItems();
    await updatePlayerStateAll(initialItems).then(() => {
      if (deck.drawdeck.length === 0) {
        deck.shuffleDeck();
      }
      deck.cleanupOrphanCards();
    });

  } catch (error) {
    Debug.error("Failed to initialize player state:", error);
  }

  unsubscribes.push(OBR.scene.items.onChange(updatePlayerStateAll));
  deck.renderDeckAsync();
}

async function renderRoom(metadata: Record<string, any>) {
  const deck = Deck.getInstance();
  const newMeta = Util.getDeckMeta(metadata)
  if (newMeta) {
    deck.updateState(newMeta);
  }

  // Reload player states from scene items
  const items = await OBR.scene.items.getItems();
  await updatePlayerStateAll(items);

  deck.renderDeckAsync();
}

async function updatePlayerStateAll(items: Item[]) {
  const playerItems = items.filter(
    (item): item is Image => item.layer === "CHARACTER" && isImage(item) && item.metadata[Util.PlayerMkey] !== undefined
  );
  const changed = await updatePlayerState(playerItems);

  if (changed || playerItems.length === 0) {
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
      if (rehydratePlayer(pmd, deck)) {
        changed = true;
      }
    }
  }

  if (changed) {
    deck.renderDeckAsync();
  }
  return changed;
}

function rehydratePlayer(pmd: PlayerMeta, deck: Deck): boolean {
  let player = deck.getPlayerById(pmd.characterId);
  let changed = false;
  if (!player) {
    player = deck.addPlayer(pmd.name, pmd.characterId, pmd.playerId);
    changed = true;
  }
  if (player.applyMeta(pmd)) {
    changed = true;
  }
  Debug.updateFromPlayers(deck.playerNames)
  return changed;
}

// --- List ALL room metadata keys and their sizes ---
async function dumpRoomMetadata() {
  const meta = await OBR.room.getMetadata();
  Debug.log("=== ROOM METADATA ===");
  for (const [key, value] of Object.entries(meta)) {
    const size = Util.getByteSize(value);
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

