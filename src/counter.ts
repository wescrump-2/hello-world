//import OBR from "@owlbear-rodeo/sdk";
import { ButtonFactory } from './button.js'
import { Facing } from './cards.js'
import { Game } from './game.js'

export function setupCounter(appdiv: HTMLDivElement) {
  const cntrbut = appdiv.querySelector('#counter') as HTMLButtonElement
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    if (counter > 56) counter = 1
    cntrbut.innerHTML = `count is ${counter}`
  }
  cntrbut.addEventListener('click', () => setCounter(counter + 1))
  setCounter(1)
}

export function setupButtons(appdiv: HTMLDivElement) {
  const bc = document.getElementById("buttons") as HTMLDivElement

  const discardplayers = appdiv.querySelector('#card-burn') as HTMLButtonElement
  discardplayers.addEventListener('click', () => {
    Game.instance.discardPlayers()
    Game.instance.render()
  })
  const dp = ButtonFactory.getButton("dp","Discard All Hands", "card-burn","")
  dp.addEventListener('click', () => {
    Game.instance.discardPlayers()
    Game.instance.render()
  })
  bc.appendChild(dp)

  const discardhand = appdiv.querySelector('#card-discard') as HTMLButtonElement
  discardhand.addEventListener('click', () => {
    Game.instance.deck.moveToDiscardPool(Game.instance.deck.players[0].hand, 0)
    Game.instance.render()
  })


  const dealInitiative = appdiv.querySelector('#card-draw') as HTMLButtonElement
  dealInitiative.addEventListener('click', () => {
    Game.instance.drawInitiative()
    Game.instance.render()
  })

  const choosecard = appdiv.querySelector('#card-exchange') as HTMLButtonElement
  choosecard.addEventListener('click', toggle)

  const dealInterlude = appdiv.querySelector('#card-pick') as HTMLButtonElement
  dealInterlude.addEventListener('click', () => {
    Game.instance.drawInterlude()
    Game.instance.render()
  })

  const cardpickup = appdiv.querySelector('#card-pickup') as HTMLButtonElement
  cardpickup.addEventListener('click', () => {
    Game.instance.deck.dealFromTop(Game.instance.deck.players[0].hand, 1, Facing.Up)
    Game.instance.render()
  })

  const cardplay = appdiv.querySelector('#card-play') as HTMLButtonElement
  cardplay.addEventListener('click', () => {
    Game.instance.deck.moveToSpecialPool(Game.instance.deck.players[0].hand, 1)
    Game.instance.render()
  })

  const cardrandom = appdiv.querySelector('#card-random') as HTMLButtonElement
  cardrandom.addEventListener('click', () => {
    Game.instance.deck.cut(Math.floor(Game.instance.deck.cards.length / 2))
    Game.instance.render()
  })

  const settings = appdiv.querySelector('#cog') as HTMLButtonElement
  settings.addEventListener('click', toggle)

  const onhold = appdiv.querySelector('#halt') as HTMLButtonElement
  onhold.addEventListener('click', toggle)

  const levelhead = appdiv.querySelector('#scales') as HTMLButtonElement
  levelhead.addEventListener('click', toggle)

  const improvedlevelhead = appdiv.querySelector('#scales-exclaim') as HTMLButtonElement
  improvedlevelhead.addEventListener('click', toggle)

  const quick = appdiv.querySelector('#sprint') as HTMLButtonElement
  quick.addEventListener('click', toggle)

  const shuffle = appdiv.querySelector('#stack') as HTMLButtonElement
  shuffle.addEventListener('click', () => {
    Game.instance.newGame()
    Game.instance.render()
  })

  const joker = appdiv.querySelector('#joker') as HTMLButtonElement
  joker.addEventListener('click', toggle)
}

function toggle(event: Event) {
  const className = 'btn-success'
  if (event.currentTarget instanceof HTMLButtonElement) {
    if (event.currentTarget.classList.contains(className)) {
      event.currentTarget.classList.remove(className);
    } else {
      event.currentTarget.classList.add(className);
    }
  }
  document.body.offsetHeight
}