//import OBR from "@owlbear-rodeo/sdk";

export function setupCounter(element: HTMLButtonElement) {
  let counter = 0
  const setCounter = (count: number) => {
    counter = count
    if (counter>56) counter=1
    element.innerHTML = `count is ${counter}`
    //OBR.notification.show(`count is ${counter}`)
    //setcard(counter.toString());
   }
  element.addEventListener('click', () => setCounter(counter + 1))
  setCounter(1)
}
