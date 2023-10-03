/** @type {HTMLElement} */
const gOscillatorPanel = document.querySelector("#oscillatorPanel");
/** @type {HTMLButtonElement} */
const gPlayPauseButton = document.querySelector("#playPauseButton");
/** @type {HTMLSelectElement} */
const gFunctionKindSelect = document.querySelector("#functionKindSelect");
/** @type {HTMLInputElement} */
const gFrequencyInputText = document.querySelector("#frequencyInputText");
/** @type {HTMLInputElement} */
const gFrequencyInputSlider = document.querySelector("#frequencyInputSlider");

///////

// TODO: Make this section a web component.

import {Frequency, MidiNote, NoteError} from "./note.mjs";

const gSliderNote = new MidiNote();
gSliderNote.index = gFrequencyInputSlider.value;

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

/** @type {?AudioContext} */
var gAudioContext = null;

/** @type {?OscillatorNode} */
var gOscillator = null;

/** @type {Frequency} */
var gLatestValidFrequency = new Frequency();
gFrequencyEventTarget.addEventListener('FrequencyChange', (e) => {
  console.log(e);
  gLatestValidFrequency = e.frequency;
});

gPlayPauseButton.addEventListener('click', (e) => {
  const buttonClassList = gPlayPauseButton.classList;
  if (buttonClassList.contains('playing')) {
    gPlayPauseButton.innerText = 'Play';
    buttonClassList.remove('playing');
    if (gOscillator !== null) gOscillator.stop();
    gOscillator = null;
  } else {
    gPlayPauseButton.innerText = 'Pause';
    buttonClassList.add('playing');

    if (gAudioContext === null) {
      gAudioContext = new window.AudioContext();
    }
    const ctx = gAudioContext;

    if (gOscillator !== null) gOscillator.stop();
    gOscillator = ctx.createOscillator();
    gOscillator.type = gFunctionKindSelect.value || 'sine';
    gOscillator.frequency.setValueAtTime(
      gLatestValidFrequency.hz, ctx.currentTime);
    gOscillator.connect(ctx.destination);
    gOscillator.start();
  }
});