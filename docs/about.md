# Savage Worlds Initiative Tracker

A card-based initiative tracker extension for [Owlbear Rodeo](https://owlbear-rodeo.com/), designed specifically for the Savage Worlds RPG system.

## Overview

This extension implements the Savage Worlds initiative system using a standard deck of 52 playing cards plus 4 jokers. Players draw cards to determine their initiative order, with various edges and hindrances affecting how cards are drawn and played.

![Main Interface](images/main-interface.png)

## Getting Started

### Installation

1. Install the extension from the Owlbear Rodeo extension marketplace
2. Open your Owlbear Rodeo scene
3. Click the Savage Worlds Initiative icon in the toolbar to open the tracker

### Adding Characters to Initiative

Right-click on character tokens in your scene and select "Add to Initiative" from the context menu.

![Adding Characters](images/add-character.png)

Characters will appear in the initiative tracker with their own card hands and control buttons.

## Interface Overview

The extension displays several sections:

### Draw Deck
The main deck of cards used for initiative.
- **Card Count**: Shows number of cards remaining
- **Buttons**:
  - **Deal Action Cards**: Deals initiative cards to all active players
  - **Deal Interlude Cards**: Deals cards for storytelling interludes (DM-initiated)
  - **Use Four Jokers**: Toggle between 52-card deck (no jokers) and 56-card deck (with jokers)
  - **Change Back**: Cycle through different card back designs

![Draw Deck Section](images/draw-deck.png)

### Discard Pile
Cards that have been played or discarded.
- **Card Count**: Shows number of discarded cards
- **Buttons** (GM Only):
  - **Shuffle**: Return all cards to draw deck and shuffle
  - **Discard All Hands**: Force all players to discard their current hands

![Discard Pile Section](images/discard-pile.png)

### Card Pool
A shared pool of cards for special situations.
- **Card Count**: Shows number of cards in pool
- **Buttons** (GM Only):
  - **Deal a Card to Pool**: Draw one card face-up to the pool
  - **Discard Card Pool**: Move all pool cards to discard

![Card Pool Section](images/card-pool.png)

### Player Sections
Each player in initiative has their own section showing:
- **Player Name**: Character name and player name
- **Card Hand**: Current initiative cards (face-up)
- **Initiative Order**: Players are automatically sorted by their best card

#### Player Control Buttons

##### Available to All Players:
- **Draw a Card**: Draw a single card to your hand
- **Discard Hand**: Discard all cards in your hand
- **Out of Combat**: Remove yourself from initiative (discards hand)
- **Remove Player**: Remove character from initiative tracking
- **On Hold**: Temporarily pause your initiative (card remains but you're skipped)
- **Interludes**: Open popup showing storytelling suggestions based on your best card's suit

![Player Controls](images/player-controls.png)

##### Edge/Hindrance Buttons:
- **Hesitant Hindrance**: Forces you to act last (lowest card wins)
- **Quick Edge**: Draw additional cards until you get one above 5
- **Level Headed Edge**: Draw extra cards at start of round
  - Single click: Level Headed (draw 2 cards)
  - Double click: Improved Level Headed (draw 3 cards)

![Edge Buttons](images/edge-buttons.png)

##### GM-Only Buttons:
- **Draw Hand**: Deal initiative cards to this specific player

## How Initiative Works

1. **Setup**: GM adds characters to initiative using the context menu
2. **Deal Cards**: GM clicks "Deal Action Cards" to give each player their initiative cards
3. **Apply Edges**: Players activate relevant edges (Level Headed, Quick, etc.)
4. **Turn Order**: Players act in order from highest to lowest card
5. **Resolution**: After all players act, GM can shuffle discard pile back into draw deck
6. **Repeat**: Continue dealing cards each round as needed

### Player States and Initiative Order

- **Active Players**: Players with initiative cards participate normally in turn order
- **On Hold**: Players marked "On Hold" skip drawing new initiative cards but retain any existing cards, which may still affect their position in the turn order
- **Out of Combat**: Players marked "Out of Combat" skip drawing new initiative cards but retain any existing cards, which may still affect their position in the turn order
- **Hesitant**: Players with the Hesitant hindrance always act last among players with cards

## Special Rules

### Jokers
When a Joker is drawn:
- Shuffle the deck immediately
- Issue Bennies to all players
- The Joker acts first in the round

### Edges and Hindrances

#### Level Headed
- Draw extra initiative cards at the start of combat
- Improved Level Headed: Draw even more cards

#### Quick
- Draw additional cards until getting one above 5
- Acts on the highest card drawn

#### Hesitant
- Always acts last in the round
- Lowest card determines turn order among hesitant characters

### Interludes
Interludes are DM-initiated storytelling opportunities that occur at the GM's discretion, not necessarily between every combat round. When the GM deals interlude cards, players receive cards that suggest story ideas for developing their characters. The cards bypass normal initiative rules and are used purely for narrative purposes.

Players can click the **Interludes** button to see suggestions based on their card's suit:
- **Hearts**: Social interactions, gathering information
- **Diamonds**: Acquiring resources, shopping
- **Clubs**: Crafting, repairing equipment
- **Spades**: Training, learning new skills

## Troubleshooting

### Cards Not Appearing
- Ensure you're in an active Owlbear Rodeo scene
- Check that the extension is properly loaded

### Players Not in Order
- Initiative order updates automatically based on card values
- Players with "On Hold" or "Out of Combat" are skipped during new card draws but may retain cards from previous rounds that affect sorting

### Missing Buttons
- Some buttons are GM-only and won't appear for regular players
- Owner-only buttons require you to own the character token

## Technical Notes

- Card data is compressed and stored in room metadata
- Supports up to 56 cards (52 + 4 jokers)
- Automatic cleanup of orphaned cards when players are removed
- Real-time synchronization across all players in the room

---

*For more information about Savage Worlds, visit the official website at [savage-worlds.com](https://savage-worlds.com/)*