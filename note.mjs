export class NoteError extends Error {};
export class ParseError extends NoteError {};
export class RangeError extends NoteError {};

export class Frequency {
  static DEFAULT_HZ = 440;
  static MIN_HZ = 10;
  static MAX_HZ = 20_000;

  /**
   * @param {string} text
   * @returns {Frequency}
   */
  static parse(text) {
    text = text.trim();
    if (text === "") return new Frequency();

    const re = /^([0-9,]+[.]?[0-9]*)\s*(k?)\s*(?:hz)?$/i;
    const m = text.match(re);
    if (m === null) {
      throw new ParseError(
          `Must be a number ending in Hz or KHz. Got "${text}".`);
    }

    const hzText = m[1].replaceAll(",", "");
    var hz = parseFloat(hzText);
    if (m[2] !== "") hz *= 1000;
    return new Frequency(hz);
  }

  /**
   * @param {?Number} freq_hz
   */
  constructor(freq_hz) {
    if (freq_hz == null) freq_hz = Frequency.DEFAULT_HZ;
    if (freq_hz < Frequency.MIN_HZ || freq_hz > Frequency.MAX_HZ) {
      throw new RangeError(
          "Frequency must be between " +
          `${Frequency.MIN_HZ} Hz and ${Frequency.MAX_HZ} Hz. ` +
          `Got ${freq_hz}.`)
    }
    this.#freq_hz = freq_hz;
  }

  /** @returns {Number} */
  get hz() { return this.#freq_hz; }

  static minAudible() { return new Frequency(Frequency.MIN_HZ); }
  static maxAudible() { return new Frequency(Frequency.MAX_HZ); }

  /** @type {Number} */
  #freq_hz = Frequency.DEFAULT_HZ;
}


/**
 * Uses the same equation as MIDI numbers to translate from a
 * linearly-increasing index to an audio frequency.
 *
 * Equation: Frq = 440 * 2^((Idx - 69) / 12)
 *   Domain: Idx = 0 to 127
 *    Range: Frq = 8.176 to 12,543 Hz
 *
 * Useful Frequencies:
 *   -        A4 on 12-TET = 440 Hz
 *   -            A4 Index = 69
 *   -  Highest Piano Note ~ 5K Hz
 *   - Human hearing range ~ 20 Hz to 20,000 Hz
 */
export class MidiNote {
  /**
   * The MIDI index number of this note. Non-MIDI frequencies are represented
   * with fractional index values.
   * @type {Number}
  */
  index = 69;  // A4

  /** @returns {Frequency} */
  get frequency() {
    return new Frequency(440 * Math.pow(2, (this.index - 69) / 12));
  }

  /**
   * @param {Frequency|Number} freq
   */
  set frequency(freq) {
    const hz = (freq instanceof Frequency) ? freq.hz : freq;
    this.index = Math.log2(hz / 440) * 12  + 69;
  }
}