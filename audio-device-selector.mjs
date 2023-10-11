// A few util functions for manipulating SinkIds.
const SinkIds = {
  // A special sentinel value, rather than a real ID. Tells us we need to
  // configure the audioContext not to send _any_ audio out.
  NONE: 'none',
  isNone: (s) => {
    return s === 'none' ||
           (s instanceof Object && s.type === 'none')
  },

  // The default audio device which the OS has given the browser.
  DEFAULT: '',
  isDefault: (s) => {
    return s === '' || s === 'default' || s === null;
  },

  areSame: (a, b) => {
    return (a === b) ||
           (SinkIds.isNone(a) && SinkIds.isNone(b)) ||
           (SinkIds.isDefault(a) && SinkIds.isDefault(b));
  }
};

// Provides access to the AudioContext and will mount to a drop-down menu
// to allow users to switch which output device audio is sent to.
//
// Note, in order to populate the list of audio devices (aside from the default
// device and the null device), we must request microphone access. Since I
// don't want to request that when the page first opens, we mount a "refresh"
// button which requests the permission and then updates the selection box.
// This way, the app is still usable without giving mic access.
//
// See: https://developer.chrome.com/blog/audiocontext-setsinkid/
//
// TODO: Make this a webcomponent
export class AudioOutputDeviceSelector {
  /** @type {?HTMLElement} */
  #parent = null;
  /** @type {?HTMLSelectElement} */
  #selectElem = null;
  /** @type {HTMLButtonElement} */
  #refreshButton = null;
  /** @type {string} */
  #selectedDevice = SinkIds.DEFAULT;
  /** @type {?AudioContext} */
  #audioCtx = null;

  /**
   * @param {string|HTMLElement} parent
   */
  constructor(parent) {
    if (typeof parent === "string") {
      this.#parent = document.querySelector(parent);
    } else {
      this.#parent = parent;
    }

    if (!('setSinkId' in AudioContext.prototype)) {
      this.#parent.textContent = "setSinkId not supported";
      return;
    }

    this.#parent.innerHTML = `
      <button title="Refresh the list of available audio output devices.">
        &#10226;
      </button>
      <select></select>
    `;
    this.#refreshButton = this.#parent.querySelector("button");
    this.#selectElem = this.#parent.querySelector("select");

    this.#refreshButton.onclick = () => this.#refreshDevices();
    this.#selectElem.oninput = () => this.#updateSelectedDevice();

    // TODO: Check if I already have device enumeration permission
    // and use #refreshDevices if so.
    this.#updateHtml();
  }

  /** @returns {AudioContext} */
  async getOrCreateAudioContext() {
    if (!this.#audioCtx) {
      this.#audioCtx = new window.AudioContext();
    }
    await this.#updateSinkIfContextAvailable();
    return this.#audioCtx;
  }

  /** @returns {AudioDestinationNode} */
  async getAudioDestination() {
    const ctx = await this.getOrCreateAudioContext();
    return ctx.destination;
  }

  async #updateSinkIfContextAvailable() {
    if (!this.#audioCtx) return;
    if (SinkIds.areSame(this.#selectedDevice, this.#audioCtx.sinkId)) return;

    let sinkId = this.#selectedDevice;
    if (SinkIds.isNone(this.#selectedDevice)) sinkId = {type: 'none'};
    await this.#audioCtx.setSinkId(sinkId);
  }

  async #refreshDevices() {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.debug("Found audio devices: ", devices);
    const outputs = devices.filter(
        device => device.kind == "audiooutput" &&
                  !SinkIds.isDefault(device.deviceId));
    console.debug("Found audio Output devices: ", outputs);
    const newDevices = outputs
        .map(dev => ({id: dev.deviceId, label: dev.label}))
        .sort((a, b) => a.label.localeCompare(b));
    this.#updateHtml(newDevices);
  }

  async #updateSelectedDevice() {
    const newSelection = this.#selectElem.value;
    if (newSelection == this.#selectedDevice) return;
    this.#selectedDevice = newSelection;
    await this.#updateSinkIfContextAvailable();
  }

  #updateHtml(newDevices = []) {
    const STANDARD_DEVICES = [
      {id: SinkIds.DEFAULT, label: "Default"},
      {id: SinkIds.NONE, label: "Mute"},
    ];
    const addDevice = (device) => {
      const option = document.createElement("option");
      option.value = device.id;
      option.text = device.label;
      this.#selectElem.add(option);

      if (device.id === this.#selectedDevice) {
        this.#selectElem.selectedIndex = this.#selectElem.length - 1;
      }
    };

    this.#selectElem.length = 0;
    STANDARD_DEVICES.forEach(addDevice);
    newDevices.forEach(addDevice);

    if (this.#selectElem.value !== this.#selectedDevice) {
      console.warn(
          "The new set of audio output devices is missing the selected " +
          "device before the refresh. Falling back to default device.",
          this.#selectedDevice, newDevices);
      this.#selectedDevice = SinkIds.DEFAULT;
      this.#selectElem.selectedIndex = 0;
      this.#updateSinkIfContextAvailable();
    }
  }
};

