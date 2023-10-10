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
      <p>
        <button>Grab Wake Lock</button>
        <span class="statusMessage">Lock Released</span>
      </p>
    `;

    this.#button = this.#parent.querySelector("button");
    this.#statusElem = this.#parent.querySelector(".statusMessage");

    this.#button.onclick = () => this.#grabLockOnClick();
  }

  async #grabLockOnClick() {
    try {
      this.#lock = await navigator.wakeLock.request("screen");
      this.#statusElem.textContent = 'Lock Acquired';
    } catch (err) {
      this.#statusElem.textContent = `ERROR: ${err.name}, ${err.message}`
      return;
    }

    this.#button.textContent = 'Release Wake Lock';
    this.#button.onclick = async () => {
      await this.#lock.release();
      this.#lock = null;
      this.#button.onclick = () => this.#grabLockOnClick();
    };
    this.#lock.addEventListener("release", () => {
      this.#button.textContent = "Grab Wake Lock";
      this.#statusElem.textContent = "Lock Released";
    })

  }
}