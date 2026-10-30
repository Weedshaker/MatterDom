// @ts-check
/* global self */

import { Intersection } from './Intersection.js'

/**
 * Shape is a helper for any type of body
 *
 * @export
 * @function Shape
 * @param {CustomElementConstructor} ChosenHTMLElement
 * @return {CustomElementConstructor | *}
 */
export class Shape extends Intersection() {
  static get observedAttributes () {
    return ['is-static', 'width', 'height']
  }

  constructor (oid, ...args) {
    super({ intersectionObserverInit: {rootMargin: '0px 0px 0px 0px'} }, ...args)

    if (oid || !this.hasAttribute('oid')) this.setAttribute('oid', oid || `b_${self.crypto.randomUUID()}`)
    this.yjsBody = {}
    this.isIntersecting = this.hasAttribute('self')

    this.html = this.customStyle
    this.copyPropertiesToAttributes()
    const accuracy = this.hasAttribute('accuracy') ? Number(this.hasAttribute('accuracy')) : 2

    this.matterBodiesEventListener = event => {
      let body
      if ((body = event.detail.bodies.find(body => body.oid === this.getAttribute('oid')))) {
        this.body = body
        const sleepingChanged = this.getAttribute('is-sleeping') !== String(body.isSleeping)
        if (sleepingChanged) this.setAttribute('is-sleeping', body.isSleeping)
        /*
        // NOTE: transform has better performance than top and left props
        top: ${body.position.y - this.getAttribute('half-height')}px;
        left: ${body.position.x - this.getAttribute('half-width')}px;
        transform: rotate(${body.angle}rad);
        */
        // NOTE: translate3d is more likely to be handed to gpu than just translate
        const textContent = /* css */`
          :host {
            transform: translate3d(${(body.position.x - this.getAttribute('half-width')).toFixed(accuracy)}px, ${(body.position.y - this.getAttribute('half-height')).toFixed(accuracy)}px, 0) rotate(${body.angle.toFixed(accuracy)}rad);
          }
        `
        if (sleepingChanged || textContent !== this.customStyle.textContent) {
          this.customStyle.textContent = textContent
          if (this.isIntersecting) this.dispatchEvent(new CustomEvent(this.getAttribute('yjs-set-body') || 'yjs-set-body', {
            detail: {
              webComponent: this,
              body: {
                angle: body.angle,
                angularVelocity: body.angularVelocity,
                position: body.position,
                velocity: body.velocity,
                oid: this.getAttribute('oid') || body.oid || '',
                uid: this.getAttribute('uid') || body.uid || '',
                isStatic: this.isStatic() || body.isStatic || false,
                isSleeping: body.isSleeping,
                collisions: body.collisions
              },
              isSelf: this.hasAttribute('self'),
              isIntersecting: this.isIntersecting
            },
            bubbles: true,
            cancelable: true,
            composed: true
          }))
        }
      }
    }

    this.matterSleepStartEventListener = async event => {
      //if (event.detail.body === await this.body) document.body.removeEventListener('matter-bodies', this.matterBodiesEventListener)
    }
    this.matterSleepEndEventListener = async event => {
      //if (event.detail.body === await this.body) document.body.addEventListener('matter-bodies', this.matterBodiesEventListener)
    }

    this.yjsSelfUidEventListener = event => {
      // TODO: has uid === client controller shall be something more flexible for multiple bodies
      this.setAttribute('uid', event.detail.uid)
      this.setAttribute('oid', event.detail.uid)
      document.body.addEventListener('matter-bodies', this.matterBodiesEventListener)
      // the dispatch must be after rendering
      this.dispatchEvent(new CustomEvent(this.getAttribute('add-body') || 'add-body', {
        detail: {
          webComponent: this
        },
        bubbles: true,
        cancelable: true,
        composed: true
      }))
    }

    this.pointerdownEventListener = event => {
      if (!this.body) return
      this.setPointerCapture(event.pointerId)
      this.dispatchEvent(new CustomEvent(this.getAttribute('body-pointer-down') || 'body-pointer-down', {
        detail: {
          webComponent: this,
          position: {x: event.clientX, y: event.clientY}
        },
        bubbles: true,
        cancelable: true,
        composed: true
      }))
    }
    this.pointermoveEventListener = event => {
      if (!this.hasPointerCapture(event.pointerId)) return
      this.dispatchEvent(new CustomEvent(this.getAttribute('body-pointer-move') || 'body-pointer-move', {
        detail: {
          position: {x: event.clientX, y: event.clientY}
        },
        bubbles: true,
        cancelable: true,
        composed: true
      }))
    }
    this.pointerupEventListener = event => {
      this.dispatchEvent(new CustomEvent(this.getAttribute('body-pointer-up') || 'body-pointer-up', {
        bubbles: true,
        cancelable: true,
        composed: true
      }))
      if (this.hasPointerCapture(event.pointerId)) this.releasePointerCapture(event.pointerId)
    }
  }

  connectedCallback () {
    if (this.shouldRenderCSS()) this.renderCSS()
    document.body.addEventListener('matter-sleep-start', this.matterSleepStartEventListener)
    document.body.addEventListener('matter-sleep-end', this.matterSleepEndEventListener)
    // todo: needs to be self only and likely better uuid as additional info
    if (this.hasAttribute('self')) {
      document.body.addEventListener('yjs-self-uid', this.yjsSelfUidEventListener)
      this.addEventListener('pointerdown', this.pointerdownEventListener)
      this.addEventListener('pointermove', this.pointermoveEventListener)
      this.addEventListener('pointerup', this.pointerupEventListener)
    } else {
      super.connectedCallback()
      // TODO: Use other targets than document body, Environment.globalEventTarget or such...
      document.body.addEventListener('matter-bodies', this.matterBodiesEventListener)
      // the dispatch must be after rendering
      this.dispatchEvent(new CustomEvent(this.getAttribute('add-body') || 'add-body', {
        detail: {
          webComponent: this
        },
        bubbles: true,
        cancelable: true,
        composed: true
      }))
    }
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
          oid: this.getAttribute('oid') || ''
        }
      },
      bubbles: true,
      cancelable: true,
      composed: true
    }))
    document.body.removeEventListener('matter-bodies', this.matterBodiesEventListener)
    document.body.removeEventListener('matter-sleep-start', this.matterSleepStartEventListener)
    document.body.removeEventListener('matter-sleep-end', this.matterSleepEndEventListener)
    if (this.hasAttribute('self')) {
      document.body.removeEventListener('yjs-self-uid', this.yjsSelfUidEventListener)
      this.removeEventListener('pointerdown', this.pointerdownEventListener)
      this.removeEventListener('pointermove', this.pointermoveEventListener)
      this.removeEventListener('pointerup', this.pointerupEventListener)
    } else {
      super.disconnectedCallback()
    }
  }

  attributeChangedCallback (name, oldValue, newValue) {
    if (name === 'is-static') {
      //this.body.then(body => (body.isStatic = this.isStatic()))
    } else if (name === 'width' || name === 'height') {
      this.setAttribute('half-width', this.getAttribute('width') / 2)
      this.setAttribute('half-height', this.getAttribute('height') / 2)
    }
  }

  intersectionCallback (entries, observer) {
    this.isIntersecting = this.areEntriesIntersecting(entries)
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
      :host, :host * {
        -webkit-user-drag: none;
        user-select: none;
      }
      :host {
        background: ${this.getAttribute('background') ? this.getAttribute('background') : 'var(--background, #111)'};
        height: ${this.getAttribute('height') ? this.getAttribute('height') + 'px' : '5px'};
        position: ${this.getAttribute('position') ? this.getAttribute('position') : 'var(--position, absolute)'};
        width: ${this.getAttribute('width') ? this.getAttribute('width') + 'px' : '5px'};
        transform-origin: center;
        opacity: var(--opacity, 1);
        transition: transform 50ms ease-out;
      }
      :host([self]) {
        cursor: ${this.getAttribute('cursor') ? this.getAttribute('cursor') : 'var(--cursor, move)'};
        transition: none;
      }
      :host([is-sleeping=false]) {
        will-change: transform;
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
