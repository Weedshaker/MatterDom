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
  // TODO: Add mutation observer or an other mechanism to check bodyBoundingClientRect on the fly to adjust html/css changes realtime at matter
  static get observedAttributes () {
    return ['is-static', 'isStatic']
  }

  constructor (...args) {
    super(...args)

    this.body = new Promise(resolve => (this.resolveBody = resolve))
    if (!this.hasAttribute('namespace')) {
      this.setAttribute('namespace', (this.namespace = this.uniqueId + '-'))
    }
  }

  attributeChangedCallback (name, oldValue, newValue) {
    this.body.then(body => (body.isStatic = this.isStatic()))
  }

  /**
   * @return {boolean}
   */
  isStatic () {
    return (this.hasAttribute('isStatic') && this.getAttribute('isStatic') !== 'false') || (this.hasAttribute('is-static') && this.getAttribute('is-static') !== 'false')
  }

  get uniqueId () {
    return this._uniqueId || (this._uniqueId = self.crypto.getRandomValues(new Uint32Array(1)).join(''))
  }
}
