// @ts-check
/* global self */

import { Shadow } from './Shadow.js'

/**
 * Shape is a helper for any type of body
 *
 * @export
 * @function Shape
 * @param {CustomElementConstructor} ChosenHTMLElement
 * @return {CustomElementConstructor | *}
 */
export class Shape extends Shadow() {
  static get observedAttributes () {
    return ['is-static', 'width', 'height']
  }

  constructor (oid, ...args) {
    super(...args)

    this.body = new Promise(resolve => (this.resolveBody = resolve))
    if (oid || !this.hasAttribute('oid')) this.setAttribute('oid', oid || `b_${self.crypto.randomUUID()}`)
    this.yjsBody = {}

    this.html = this.customStyle
    this.copyPropertiesToAttributes()
    const accuracy = this.hasAttribute('accuracy') ? Number(this.hasAttribute('accuracy')) : 2

    this.matterBodiesEventListener = event => {
      let body
      if ((body = event.detail.bodies.find(body => body.webComponent === this))) {
        if (body.isSleeping) return
        /*
        // NOTE: transform has better performance than top and left props
        top: ${body.position.y - this.getAttribute('half-height')}px;
        left: ${body.position.x - this.getAttribute('half-width')}px;
        transform: rotate(${body.angle}rad);
        */
        const textContent = /* css */`
          :host {
            transform: translate(${(body.position.x - this.getAttribute('half-width')).toFixed(accuracy)}px, ${(body.position.y - this.getAttribute('half-height')).toFixed(accuracy)}px) rotate(${body.angle.toFixed(accuracy)}rad);
          }
        `
        if (textContent !== this.customStyle.textContent){
          this.customStyle.textContent = textContent
          this.dispatchEvent(new CustomEvent(this.getAttribute('yjs-set-body') || 'yjs-set-body', {
            detail: {
              webComponent: this,
              body: {
                angle: body.angle,
                angularSpeed: body.angularSpeed,
                angularVelocity: body.angularVelocity,
                force: body.force,
                position: body.position,
                positionImpulse: body.positionImpulse,
                velocity: body.velocity,
                oid: this.getAttribute('oid') || '',
                uid: this.getAttribute('uid') || '',
                isStatic: this.isStatic()
              },
              isSelf: this.hasAttribute('self')
            },
            bubbles: true,
            cancelable: true,
            composed: true
          }))
        }
      }
    }

    this.matterSleepStartEventListener = async event => {
      if (event.detail.body === await this.body) document.body.removeEventListener('matter-bodies', this.matterBodiesEventListener)
    }
    this.matterSleepEndEventListener = async event => {
      if (event.detail.body === await this.body) document.body.addEventListener('matter-bodies', this.matterBodiesEventListener)
    }

    this.yjsSelfUidEventListener = event => {
      this.setAttribute('uid', event.detail.uid)
      document.body.addEventListener('matter-bodies', this.matterBodiesEventListener)
    }
  }

  connectedCallback () {
    if (this.shouldRenderCSS()) this.renderCSS()
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
    // TODO: Use other targets than document body, Environment.globalEventTarget or such...
    if (!this.hasAttribute('self')) document.body.addEventListener('matter-bodies', this.matterBodiesEventListener)
    document.body.addEventListener('matter-sleep-start', this.matterSleepStartEventListener)
    document.body.addEventListener('matter-sleep-end', this.matterSleepEndEventListener)
    // todo: needs to be self only and likely better uuid as additional info
    if (this.hasAttribute('self')) document.body.addEventListener('yjs-self-uid', this.yjsSelfUidEventListener)
  }

  disconnectedCallback () {
    // must be dispatched from body, since this element dies before it can dispatch
    document.body.dispatchEvent(new CustomEvent(this.getAttribute('remove-body') || 'remove-body', {
      detail: {
        webComponent: this
      },
      bubbles: true,
      cancelable: true,
      composed: true
    }))
    this.dispatchEvent(new CustomEvent(this.getAttribute('yjs-remove-body') || 'yjs-remove-body', {
      detail: {
        body: {
          isSelf: this.hasAttribute('self'),
          oid: this.getAttribute('oid')
        }
      },
      bubbles: true,
      cancelable: true,
      composed: true
    }))
    this.body = new Promise(resolve => (this.resolveBody = resolve))
    document.body.removeEventListener('matter-bodies', this.matterBodiesEventListener)
    document.body.removeEventListener('matter-sleep-start', this.matterSleepStartEventListener)
    document.body.removeEventListener('matter-sleep-end', this.matterSleepEndEventListener)
    if (this.hasAttribute('self')) document.body.removeEventListener('yjs-self-uid', this.yjsSelfUidEventListener)
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'is-static') {
      this.body.then(body => (body.isStatic = this.isStatic()))
    } else if (name === 'width' || name === 'height') {
      this.setAttribute('half-width', this.getAttribute('width') / 2)
      this.setAttribute('half-height', this.getAttribute('height') / 2)
    }
  }

  /**
  * evaluates if a render is necessary
  *
  * @return {boolean}
  */
  shouldRenderCSS () {
    return !this.root.querySelector(`${this.cssSelector} > style[_css]`)
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
        width: ${this.getAttribute('width') ? this.getAttribute('width') + 'px' : '5px'};
        transform-origin: center;
        opacity: var(--opacity, 1);
        transition: transform 50ms ease-out;
      }
    `
  }

  copyPropertiesToAttributes () {
    const bodyBoundingClientRect = this.getBoundingClientRect()
    if (!this.hasAttribute('x')) this.setAttribute('x', bodyBoundingClientRect.x)
    if (!this.hasAttribute('y')) this.setAttribute('y', bodyBoundingClientRect.y)
    if (!this.hasAttribute('width')) this.setAttribute('width', bodyBoundingClientRect.width)
    if (!this.hasAttribute('height')) this.setAttribute('height', bodyBoundingClientRect.height)
  }

  /**
   * @return {boolean}
   */
  isStatic () {
    return this.hasAttribute('is-static') && this.getAttribute('is-static') !== 'false'
  }

  get customStyle () {
    return (
      this._customStyle ||
        (this._customStyle = (() => {
          const style = document.createElement('style')
          style.setAttribute('protected', 'true')
          return style
        })())
    )
  }
}
