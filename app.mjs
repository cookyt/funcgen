/** @type {HTMLElement} */
const oscillatorPanel = document.querySelector("#oscillatorPanel");
/** @type {HTMLButtonElement} */
const playPauseButton = document.querySelector("#playPauseButton");
/** @type {HTMLSelectElement} */
const functionKindSelect = document.querySelector("#functionKindSelect");
/** @type {HTMLInputElement} */
const frequencyInputText = document.querySelector("#frequencyInputText");
/** @type {HTMLInputElement} */
const frequencyInputSlider = document.querySelector("#frequencyInputSlider");

///////

import { Frequency, MidiNote } from "./freq.mjs";

/** @type {Frequency} */
var latestValidFrequency_ = new Frequency();

frequencyInputText.addEventListener("input", (/** @type {InputEvent} */ e) => {
  console.debug(e);
  const freq = Frequency.parse(frequencyInputText.value);
  console.info(`${freq.hz} Hz`);
  latestValidFrequency_ = freq;
});

frequencyInputSlider.addEventListener("input", (e) => {
  console.debug(e);
  frequencyInputSlider.value
});

//////

/** @type {?AudioContext} */
var gAudioContext = null;

/** @type {?OscillatorNode} */
var gOscillator = null;

playPauseButton.addEventListener('click', (e) => {
  const buttonClassList = playPauseButton.classList;
  if (buttonClassList.contains('playing')) {
    playPauseButton.innerText = 'Play';
    buttonClassList.remove('playing');
    if (gOscillator !== null) gOscillator.stop();
    gOscillator = null;
  } else {
    playPauseButton.innerText = 'Pause';
    buttonClassList.add('playing');

    if (gAudioContext === null) {
      gAudioContext = new window.AudioContext();
    }
    const ctx = gAudioContext;

    if (gOscillator !== null) gOscillator.stop();
    gOscillator = ctx.createOscillator();
    gOscillator.type = functionKindSelect.value || 'sine';
    gOscillator.frequency.setValueAtTime(
      latestValidFrequency_.hz, ctx.currentTime);
    gOscillator.connect(ctx.destination);
    gOscillator.start();
  }
});