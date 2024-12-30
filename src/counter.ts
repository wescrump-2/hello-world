//import OBR from "@owlbear-rodeo/sdk";
import { ButtonFactory } from './button.js'
import { Game } from './game.js'

export function setupButtons(appdiv: HTMLDivElement) {
  const bc = appdiv.ownerDocument.getElementById("svgbuttons") as HTMLDivElement

  const dp = ButtonFactory.getButton("dp", "Discard All Hands", "card-burn", "")
  dp.addEventListener('click', () => {
    Game.instance.discardPlayers()
    Game.instance.render()
  })
  bc.appendChild(dp)

  const di = ButtonFactory.getButton("di", "Deal Initiative", "card-draw", "")
  di.addEventListener('click', () => {
    Game.instance.drawInitiative()
    Game.instance.render()
  })
  bc.appendChild(di)

  const dint = ButtonFactory.getButton("dint", "Deal Interlude", "card-pick", "")
  dint.addEventListener('click', () => {
    Game.instance.drawInterlude()
    Game.instance.render()
  })
  bc.appendChild(dint)

  // const cardplay = appdiv.querySelector('#card-play') as HTMLButtonElement
  // cardplay.addEventListener('click', () => {
  //   Game.instance.deck.moveToSpecialPool(Game.instance.deck.players[0].hand, 1)
  //   Game.instance.render()
  // })

  // const cardrandom = appdiv.querySelector('#card-random') as HTMLButtonElement
  // cardrandom.addEventListener('click', () => {
  //   Game.instance.deck.cut(Math.floor(Game.instance.deck.cards.length / 2))
  //   Game.instance.render()
  // })

  // const cog = ButtonFactory.getButton("cog", "Settings", "cog", "")
  // cog.addEventListener('click', function (event) {
  //   ButtonFactory.toggle(event)
  // })
  // bc.appendChild(cog)

  const shf = ButtonFactory.getButton("shf", "Shuffle", "stack", "")
  shf.addEventListener('click', () => {
    Game.instance.deck.newGame()
    Game.instance.render()
  })
  bc.appendChild(shf)

  const joke = ButtonFactory.getButton("joke", "Use Four Jokers", "joker", "")
  joke.addEventListener('click', function (event) {
    Game.instance.deck.toggleJokers()
    ButtonFactory.toggle(event)
    Game.instance.render()
  })
  bc.appendChild(joke)
}