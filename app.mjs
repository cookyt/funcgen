/** @type {HTMLElement} */
const gOscillatorPanel = document.querySelector("#oscillatorPanel");

///////

// TODO: Make this section a web component.

import {Frequency, MidiNote, NoteError} from "./note.mjs";

/** @type {HTMLInputElement} */
const gFrequencyInputText = document.querySelector("#frequencyInputText");
/** @type {HTMLInputElement} */
const gFrequencyInputSlider = document.querySelector("#frequencyInputSlider");

const gSliderNote = new MidiNote();
gFrequencyInputSlider.value = gSliderNote.index;

class FrequencyChangeEvent extends Event {
  /**
   * @param {Frequency} frequency
   */
  constructor(frequency) {
    super("FrequencyChange");
    this.frequency = frequency;
  }
}
class FrequencyEventTarget extends EventTarget {
  /**
   * @param {Frequency} freq
   */
  dispatchFrequency(freq) {
    this.dispatchEvent(new FrequencyChangeEvent(freq));
  }
};

const gFrequencyEventTarget = new FrequencyEventTarget();

gFrequencyInputText.addEventListener("input", (e) => {
  console.debug(e);

  let freq;
  gFrequencyInputText.setCustomValidity("");
  try {
    freq = Frequency.parse(gFrequencyInputText.value);
  } catch (err) {
    if (!(err instanceof NoteError)) throw err;
    gFrequencyInputText.setCustomValidity(err.message);
    return;
  } finally {
    gFrequencyInputText.reportValidity();
  }

  gFrequencyEventTarget.dispatchFrequency(freq);
  gSliderNote.frequency = freq;
  gFrequencyInputSlider.value = gSliderNote.index;
});

gFrequencyInputSlider.addEventListener("input", (e) => {
  console.debug(e);
  gSliderNote.index = gFrequencyInputSlider.value;
  gFrequencyEventTarget.dispatchFrequency(gSliderNote.frequency);
  const hz = gSliderNote.frequency.hz;
  gFrequencyInputText.value =
      `${hz.toLocaleString('en-US', {maximumFractionDigits: 2})} Hz`;
});

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
gFrequencyEventTarget.addEventListener('FrequencyChange', (
    /** @type {FrequencyChangeEvent} **/e) => {
  gLatestValidFrequency = e.frequency;
  if (gOscillator != null) {
    gOscillator.frequency.value = e.frequency.hz;
  }
});

gFunctionKindSelect.addEventListener('input', (e) => {
  if (gOscillator != null) {
    gOscillator.type = e.target.value;
  }
});

gPlayPauseButton.addEventListener('click', (e) => {
  const classList = e.target.classList;
  if (classList.contains('playing')) {
    e.target.innerText = 'Play';
    classList.remove('playing');
    if (gOscillator !== null) gOscillator.stop();
    gOscillator = null;
    return;
  }

  e.target.innerText = 'Pause';
  classList.add('playing');

  if (gAudioContext === null) {
    gAudioContext = new window.AudioContext();
  }
  const ctx = gAudioContext;

  if (gOscillator !== null) gOscillator.stop();
  gOscillator = ctx.createOscillator();
  gOscillator.type = gFunctionKindSelect.value || 'sine';
  gOscillator.frequency.value = gLatestValidFrequency.hz;
  gOscillator.connect(ctx.destination);
  gOscillator.start();
});