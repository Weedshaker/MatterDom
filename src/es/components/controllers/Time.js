// @ts-check
import { Shadow } from '../prototypes/Shadow.js'

/* global requestAnimationFrame */
/* global self */

/***
 * Game Timer or simple DOM requestAnimationFrame
 *
 * @export
 * @class Time
 * @type {CustomElementConstructor}
 */
export default class Time extends Shadow() {
  connectedCallback () {
    this.addEventListenerRequestAnimationFrame(time => this.dispatchEvent(new CustomEvent(this.getAttribute('time') || 'time', {
      detail: { time },
      bubbles: true,
      cancelable: true,
      composed: true
    })), null, true)
  }
  disconnectedCallback () {
    this.removeEventListenerRequestAnimationFrame()
  }
  /**
   * subscribe to requestAnimationFrame callback by recursive loop
   *
   * @param {function} func
   * @param {DOMHighResTimeStamp | null} time
   * @param {boolean} [keepRunning=this._isRunning]
   */
  addEventListenerRequestAnimationFrame (func, time, keepRunning = this._isRunning) {
    this._isRunning = keepRunning
    func(time)
    if (this._isRunning) self.requestAnimationFrame(time => this.addEventListenerRequestAnimationFrame(func, time))
  }
  removeEventListenerRequestAnimationFrame () {
    this._isRunning = false
  }
}
