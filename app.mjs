/** @type {HTMLElement} */
const gOscillatorPanel = document.querySelector("#oscillatorPanel");

///////

// TODO: Make this section a web component.

import {Frequency, MidiNote, NoteError} from "./note.mjs";

class FrequencyInputEvent extends Event {
  /**
   * @param {Frequency} frequency
   */
  constructor(frequency) {
    super("FrequencyInput");
    this.frequency = frequency;
  }
}

/**
 * Element for handling frequency-valued inputs.
 *
 * @fires FrequencyInputEvent When the user changes the frequency.
 */
class FrequencyInput extends EventTarget {
  /** @type {HTMLInputElement} */
  #inputText = document.querySelector("#frequencyInputText");

  /** @type {HTMLInputElement} */
  #inputSlider = document.querySelector("#frequencyInputSlider");

  #note = new MidiNote();

  constructor() {
    super("FrequencyInput");
    this.#inputText.addEventListener("input", e => this.#onTextInput(e));
    this.#inputSlider.addEventListener("input", e => this.#onSliderInput(e));

    this.#inputSlider.value = this.#note.index;
    this.#inputText.placeholder = this.#note.frequency.toString();
  }

  /**
   * @param {Event} e
   */
  #onTextInput(e) {
    console.debug(e);

    let freq;
    e.target.setCustomValidity("");
    try {
      freq = Frequency.parse(e.target.value);
    } catch (err) {
      if (!(err instanceof NoteError)) throw err;
      e.target.setCustomValidity(err.message);
      return;
    } finally {
      e.target.reportValidity();
    }

    this.#dispatchFreq(freq);
    this.#note.frequency = freq;
    this.#inputSlider.value = this.#note.index;
  }

  /**
   * @param {Event} e
   */
  #onSliderInput(e) {
    console.debug(e);

    this.#note.index = e.target.value;
    const freq = this.#note.frequency;
    this.#inputText.value = freq.toString();

    this.#dispatchFreq(freq);
  }

  /**
   * @param {Frequency} freq
   */
  #dispatchFreq(freq) {
    this.dispatchEvent(new FrequencyInputEvent(freq));
  }
}

const gFrequencyInput = new FrequencyInput();

//////

/** @type {HTMLButtonElement} */
const gPlayPauseButton = document.querySelector("#playPauseButton");
/** @type {HTMLSelectElement} */
const gFunctionKindSelect = document.querySelector("#functionKindSelect");

/** @type {?AudioContext} */
var gAudioContext = null;

/** @type {?OscillatorNode} */
var gOscillator = null;

/** @type {Frequency} */
var gLatestValidFrequency = new Frequency();
gFrequencyInput.addEventListener('FrequencyInput', (
    /** @type {FrequencyInputEvent} **/e) => {
  gLatestValidFrequency = e.frequency;
  if (gOscillator != null) {
    gOscillator.frequency.value = e.frequency.hz;
  }
});

class VolumeInput {
  /** @type {?GainNode} */
  gainNode = null;

  /** @type {HTMLInputElement} */
  #inputSlider = document.querySelector("#volumeInputSlider");
  /** @type {HTMLInputElement} */
  #inputText = document.querySelector("#volumeInputText");

  constructor() {
    this.#inputSlider.addEventListener('input', (e) => this.#onSliderInput(e));
    this.#inputText.addEventListener('input', (e) => this.#onTextInput(e));
  }

  /**
   * Initializes the gainNode by using the given audioContext.
   * If the gainNode is already initialized, does nothing.
   *
   * @param {AudioContext} ctx
   */
  initGainNode(ctx) {
    if (this.gainNode != null) return;

    this.gainNode = ctx.createGain();
    this.#updateGainParam();
    this.gainNode.connect(ctx.destination);
  }

  get value() { return this.#inputSlider.value; }
  get max() { return this.#inputSlider.max; }
  get min() { return this.#inputSlider.min; }

  /**
   * Updates the internal gainNode's param based on the current slider value.
   */
  #updateGainParam() {
    let newGain = (this.value - this.min) / (this.max - this.min);
    newGain = newGain * newGain;  // Approximate logarithmic behavior.
    console.debug(`Setting gain to ${newGain}`);
    if (this.gainNode != null) {
      this.gainNode.gain.value = newGain;
    }
    return newGain;
  }

  /** @param {Event} e */
  #onSliderInput(e) {
    this.#inputText.value = `${e.target.value}`;
    this.#updateGainParam();
  }
  /** @param {Event} e */
  #onTextInput(e) {
    console.debug(e)

    let parsed;
    e.target.setCustomValidity("");
    try {
      parsed = this.#parseVolume(e.target.value)
    } catch (err) {
      e.target.setCustomValidity(err.message);
      return;
    } finally {
      e.target.reportValidity();
    }

    this.#inputSlider.value = parsed;
    this.#updateGainParam();
  }

  /**
   * @param {string} text The volume integer to parse. [0, 100].
   * @returns {Number}
   */
  #parseVolume(text) {
    let parsed;
    if (text == "") {
      parsed = 0;
    } else {
      parsed = parseInt(text, 10);
    }

    if (Number.isNaN(parsed)) {
      throw new Error(`Failed to parse volume to number: ${text}`);
    }
    if (parsed < 0 || parsed > 100) {
      throw new Error(`Volume out of range: ${parsed}. Should be [0, 100].`)
    }

    return parsed;
  }
}

const gVolumeInput = new VolumeInput();

/**
 * @param {HTMLInputElement} slider
 * @returns {Number}
 */
function computeGain(slider) {
  let newGain = slider.value / slider.max;
  newGain = newGain * newGain;
  return newGain;
}

gFunctionKindSelect.addEventListener('input', (e) => {
  if (gOscillator == null) {
    return;
  }
  gOscillator.type = e.target.value;
});

gPlayPauseButton.addEventListener('click', (e) => {
  const classList = e.target.classList;
  if (classList.contains('playing')) {
    e.target.innerText = 'Play';
    classList.remove('playing');
    if (gOscillator != null) {
      gOscillator.stop();
    }
    gOscillator = null;
    return;
  }

  e.target.innerText = 'Pause';
  classList.add('playing');

  if (gAudioContext === null) {
    gAudioContext = new window.AudioContext();
  }
  const ctx = gAudioContext;

  gVolumeInput.initGainNode(ctx);

  if (gOscillator == null) {
    gOscillator = ctx.createOscillator();
    gOscillator.type = gFunctionKindSelect.value || 'sine';
    gOscillator.frequency.value = gLatestValidFrequency.hz;
    gOscillator.connect(gVolumeInput.gainNode);
  }

  gOscillator.start();
});

if (window.location.hostname == 'localhost') {
  console.log('Running locally.');
  const newtitle = `local: ${document.title}`;
  document.title = newtitle;
}