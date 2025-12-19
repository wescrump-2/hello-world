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
  applyTheme();
  // Update whenever the user changes the theme in Owlbear Rodeo
  unsubscribes.push(OBR.theme.onChange(applyTheme));



  // Optional: react to entering/leaving scene later if needed
  unsubscribes.push(OBR.scene.onReadyChange(async (isReady) => {
    if (isReady) {
      console.log("Entered scene");
      // Do scene-specific init here if needed
    } else {
      console.log("Left scene");
    }
  }));

  // Check once at startup
  try {
    const isReady = await OBR.scene.isReady();
    if (isReady) {
      // Do any one-time scene init
    }
    await setupGameState();
  } catch (error) {
    console.error("Failed during initial setup:", error);
  }
  window.addEventListener('beforeunload', () => {
    unsubscribes.forEach(fn => fn());
  })

  // Migrate old room metadata to scene
  await migrateOldRoomMetadata();

  if (Debug.enabled) {
    try {
      await dumpRoomMetadata();
      await findItemMetadataKeys();
    } catch (error) {
      console.error("Failed to execute debug functions:", error);
    }
  }
});

function setupCards() {
  const svgCards = document.getElementById('cards-svg') as HTMLObjectElement
  const svgButtons = document.getElementById('buttons-svg') as HTMLObjectElement

  if (svgCards.contentDocument && svgButtons.contentDocument) {
    console.log("Button and card images loaded");
  } else {
    console.error("Failed to load SVG document")
  }
}

async function setupGameState(): Promise<void> {
  const deck = Deck.getInstance();

  try {
    deck.isGM = (await OBR.player.getRole()) === "GM";
  } catch (error) {
    console.error("Failed to get GM role:", error);
  }

  unsubscribes.push(OBR.scene.onMetadataChange(renderScene));

  try {
    // Ensure scene is ready before accessing metadata
    await Util.ensureSceneReady();
    const metadata = await OBR.scene.getMetadata();
    const dmd = Util.getDeckMeta(metadata);
    if (dmd) {
      deck.updateState(dmd);
    } else {
      deck.updateState(undefined);
    }
  } catch (error) {
    console.error(`Failed to get room metadata:`, error);
    deck.initializeDeck();
    deck.shuffleDeck();
  }

  try {
    const initialItems = await OBR.scene.items.getItems((item): item is Image => item.layer === "CHARACTER" && isImage(item));
    await updatePlayerState(initialItems).then(() => {
      if (deck.drawdeck.length === 0) {
        deck.shuffleDeck();
      }
    });

  } catch (error) {
    console.error("Failed to initialize player state:", error);
  }

  unsubscribes.push(OBR.scene.items.onChange(async (context) => {
    const chars = context.filter(item => isImage(item) && item.layer === 'CHARACTER');
    await updatePlayerState(chars);
  }));
  deck.renderDeckAsync();
}

async function renderScene(metadata: Record<string, any>) {
  const deck = Deck.getInstance();
  const newMeta = Util.getDeckMeta(metadata)
  if (newMeta) {
    deck.updateState(newMeta);
  }

  try {
    // Ensure scene is ready before accessing items
    await Util.ensureSceneReady();

    // Reload player states from scene items
    const items = await OBR.scene.items.getItems((item): item is Image => item.layer === "CHARACTER" && isImage(item))
    await updatePlayerState(items);
  } catch (error) {
    console.error("Failed to reload player states in renderScene:", error);
  }

  deck.renderDeckAsync();
}

// async function updatePlayerStateAll(playerItems: Item[]) {
//   const changed = await updatePlayerState(playerItems);

//   if (changed || playerItems.length === 0) {
//     Debug.updateFromPlayers(Deck.getInstance().players)
//   }
// }

async function updatePlayerState(items: Item[]): Promise<boolean> {
  const deck = Deck.getInstance();
  let changed = false;

  for (const item of items) {
    const pmd = item.metadata[Util.PlayerMkey] as PlayerMeta;
    if (pmd?.characterId) {
      if (rehydratePlayer(pmd, deck)) {
        changed = true;
      }
    }
  }

  const activePids = new Set(items.map(item => (item.metadata[Util.PlayerMkey] as PlayerMeta)?.characterId).filter(Boolean));

  const toRemove = Array.from(deck.players.values()).filter(p => !activePids.has(p.characterId));
  for (const player of toRemove) {
    deck.removePlayer(player);
    changed = true;
  }

  if (changed) {
    Debug.updateFromPlayers(Deck.getInstance().players)  
    Util.consistencyCheck(deck);
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
  Debug.updateFromPlayers(deck.players)
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
  const items = await OBR.scene.items.getItems(
    (item): item is Image =>
      item.layer === "CHARACTER" &&  // Filter by Character layer
      isImage(item)                  // Filter by image type
  );
  const keys = new Set();
  items.forEach(item => {
    if (item.metadata) {
      Object.keys(item.metadata).forEach(k => keys.add(k));
    }
  });

  Debug.log("=== METADATA KEYS FOUND ON SCENE ITEMS ===");
  Debug.log(Array.from(keys).sort());
}


async function migrateOldRoomMetadata() {
  try {
    // Ensure scene is ready before migration
    await Util.ensureSceneReady();

    // Check if old metadata exists on the room
    const roomMetadata = await OBR.room.getMetadata();
    const oldDeckMeta = roomMetadata[Util.DeckMkey];

    if (oldDeckMeta) {
      Debug.log("Found old deck metadata on room, migrating to scene...");

      // Get current scene metadata
      const sceneMetadata = await OBR.scene.getMetadata();

      // Check if scene already has the metadata
      if (!sceneMetadata[Util.DeckMkey]) {
        // Migrate the data to scene
        await OBR.scene.setMetadata({ [Util.DeckMkey]: oldDeckMeta });
        Debug.log("Successfully migrated deck metadata from room to scene");
      }

      // Remove old metadata from room
      await OBR.room.setMetadata({ [Util.DeckMkey]: null });
      Debug.log("Removed old deck metadata from room");

      // Show notification to GM
      if (Deck.getInstance().isGM) {
        await OBR.notification.show("Deck metadata has been migrated from room to scene storage", "INFO");
      }
    }
  } catch (error) {
    console.error("Failed to migrate old room metadata:", error);
  }
}

async function applyTheme() {
  const theme = await OBR.theme.getTheme();

  // Background
  document.documentElement.style.setProperty("--obr-background-default", theme.background.default);
  document.documentElement.style.setProperty("--obr-background-paper", theme.background.paper);

  // Text
  document.documentElement.style.setProperty("--obr-text-primary", theme.text.primary);
  document.documentElement.style.setProperty("--obr-text-secondary", theme.text.secondary);
  document.documentElement.style.setProperty("--obr-text-disabled", theme.text.disabled);

  // Primary color variants
  document.documentElement.style.setProperty("--obr-primary-main", theme.primary.main);
  document.documentElement.style.setProperty("--obr-primary-light", theme.primary.light);
  document.documentElement.style.setProperty("--obr-primary-dark", theme.primary.dark);
  document.documentElement.style.setProperty("--obr-primary-contrast", theme.primary.contrastText);

  // Secondary color variants
  document.documentElement.style.setProperty("--obr-secondary-main", theme.secondary.main);
  document.documentElement.style.setProperty("--obr-secondary-light", theme.secondary.light);
  document.documentElement.style.setProperty("--obr-secondary-dark", theme.secondary.dark);
  document.documentElement.style.setProperty("--obr-secondary-contrast", theme.secondary.contrastText);

  // Optional: Add classes for mode-specific styling
  document.body.classList.toggle("obr-dark", theme.mode === "DARK");
  document.body.classList.toggle("obr-light", theme.mode === "LIGHT");
}
