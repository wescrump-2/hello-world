// In a new initDOM.ts
export function initDOM(cardsImage: string, buttonsImage: string): void {
  const app = document.querySelector<HTMLDivElement>('#app')!;
  app.innerHTML = `
    <div>
      <div id="svgContainer"></div>
    </div>
    <object id="cards-svg" width="0" height="0" data="${cardsImage}" type="image/svg+xml"></object>
    <object id="buttons-svg" width="0" height="0" data="${buttonsImage}" type="image/svg+xml"></object>
  `;
}
