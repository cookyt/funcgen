const CLOSED_LOCK = '\u{1F512}';
const OPEN_LOCK = '\u{1F513}';

export class ForceableWakeLockInput {
  /** @type {HTMLElement} */
  #parent;
  /** @type {HTMLButtonElement} */
  #button;
  /** @type {HTMLElement} */
  #statusElem;

  /** @type {?WakeLockSentinel} */
  #lock = null;

  /**
   *
   * @param {HTMLElement|string} parentDiv
   * @returns
   */
  constructor(parentDiv) {
    if (typeof parentDiv === "string") {
      this.#parent = document.querySelector(parentDiv);
    } else {
      this.#parent = parentDiv;
    }

    if (!('wakeLock' in navigator)) {
      this.#parent.innerText = 'WakeLock is not supported.';
      return;
    }

    this.#parent.innerHTML = `
      <div>
        <span class="statusMessage">${OPEN_LOCK}</span>
        <button>Grab</button>
      </div>
    `;

    this.#button = this.#parent.querySelector("button");
    this.#statusElem = this.#parent.querySelector(".statusMessage");

    this.#button.onclick = () => this.#grabLockOnClick();
  }

  async #grabLockOnClick() {
    try {
      this.#lock = await navigator.wakeLock.request("screen");
      this.#statusElem.textContent = CLOSED_LOCK;
    } catch (err) {
      this.#statusElem.textContent = `ERROR: ${err.name}, ${err.message}`
      return;
    }

    this.#button.textContent = 'Release';
    this.#button.onclick = async () => {
      await this.#lock.release();
      this.#lock = null;
      this.#button.onclick = () => this.#grabLockOnClick();
    };
    this.#lock.addEventListener("release", () => {
      this.#button.textContent = "Grab";
      this.#statusElem.textContent = OPEN_LOCK;
    })

  }
}
