/* global self */

import { Shadow } from './Shadow.js'

/**
 * Shape is a helper for any type of body
 *
 * @export
 * @function Shape
 * @param {CustomElementConstructor} ChosenHTMLElement
 * @property {
    uniqueId
  }
 * @return {CustomElementConstructor | *}
 */
export const Shape = (ChosenClass = Shadow()) => class Shape extends ChosenClass {
  constructor (...args) {
    super(...args)

    if (!this.hasAttribute('namespace')) {
      this.setAttribute('namespace', (this.namespace = this.uniqueId + '-'))
    }
  }

  get uniqueId () {
    return this._uniqueId || (this._uniqueId = self.crypto.getRandomValues(new Uint32Array(3)).join(''))
  }
}
