// @ts-check
import { Shape } from '../prototypes/Shape.js'

/* global CustomEvent */

/***
* Matter.Bodies.rectangle(x, y, width, height, [options])
* https://brm.io/matter-js/docs/classes/Bodies.html
* https://github.com/liabru/matter-js/blob/master/src/factory/Bodies.js#L24
*
* @export
* @class Rectangle
* @type {CustomElementConstructor}
*/
export default class Rectangle extends Shape() {
  constructor (...args) {
    super(...args)

    this.body = new Promise(resolve => this.resolveBody = resolve)
  }

  connectedCallback () {
    if (this.shouldComponentRenderCSS()) this.renderCSS()
    this.copyPropertiesToAttributes()
    // the dispatch must be after rendering
    this.dispatchEvent(new CustomEvent(this.getAttribute('add-body') || 'add-body', {
      detail: {
        webComponent: this,
        resolveBody: this.resolveBody
      },
      bubbles: true,
      cancelable: true,
      composed: true
    }))
  }

  disconnectedCallback () {
    this.dispatchEvent(new CustomEvent(this.getAttribute('remove-body') || 'remove-body', {
      detail: {
        webComponent: this,
      },
      bubbles: true,
      cancelable: true,
      composed: true
    }))
  }

  /**
  * evaluates if a render is necessary
  *
  * @return {boolean}
  */
  shouldComponentRenderCSS () {
    return !this.root.querySelector('style[_css]')
  }

  /**
  * renders the css
  *
  * @return {void}
  */
  renderCSS () {
    this.css = /* css */`
      :host {
        background: ${this.getAttribute('background') ? this.getAttribute('background') : 'var(--background, #111)'};
        cursor: ${this.getAttribute('cursor') ? this.getAttribute('cursor') : 'var(--cursor, move)'};
        height: ${this.getAttribute('height') ? this.getAttribute('height') + 'px' : '5px'};
        position: ${this.getAttribute('position') ? this.getAttribute('position') : 'var(--position, absolute)'};
        transform: var(--transform);
        width: ${this.getAttribute('width') ? this.getAttribute('width') + 'px' : '5px'};
      }
    `
  }

  copyPropertiesToAttributes () {
    const bodyBoundingClientRect = this.getBoundingClientRect()
    if (!this.hasAttribute('x')) this.setAttribute('x', bodyBoundingClientRect.x)
    if (!this.hasAttribute('y')) this.setAttribute('y', bodyBoundingClientRect.y)
    if (!this.hasAttribute('width')) this.setAttribute('width', bodyBoundingClientRect.width)
    if (!this.hasAttribute('height')) this.setAttribute('height', bodyBoundingClientRect.height)
    this.setAttribute('half-width', this.getAttribute('width') / 2)
    this.setAttribute('half-height', this.getAttribute('height') / 2)
  }
}
