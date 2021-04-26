// @ts-check
import { Shape } from '../prototypes/Shape.js'

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
  connectedCallback () {
    if (this.shouldComponentRenderCSS()) this.renderCSS()
    this.dispatchEvent(new CustomEvent(this.getAttribute('add-body') || 'add-body', {
      detail: {
        body: this
      },
      bubbles: true,
      cancelable: true,
      composed: true
    }))
  }
  
  disconnectedCallback () {
    this.dispatchEvent(new CustomEvent(this.getAttribute('remove-body') || 'remove-body', {
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
    // TODO: make all dynamic
    this.css = /* css */`
      :host {
        position: absolute;
        background: #111;
        height: 40px;
        width: 40px;
        cursor: move;
        transform: var(--transform);
      }
    `
  }
}
