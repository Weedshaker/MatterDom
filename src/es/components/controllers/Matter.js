// @ts-check
/* global self */

import Matter from '../../dependencies/matter.min.js'
import MatterWebWorker from './MatterWebWorker.js'

/***
 * https://github.com/liabru/matter-js
 * https://brm.io/matter-js/docs/
 * 
 * TODO: do matter physics inside webworker
 *
 * @export
 * @class Matter
 * @type {CustomElementConstructor}
 */
export default class MatterElement extends HTMLElement {
  constructor () {
    super()

    this.importMetaUrl = import.meta.url.replace(/(.*\/)(.*)$/, '$1')

    const engineCreateOptions = {
      create: {
        enableSleeping: true, // makes it less accurate
        gravity: {
            x: this.getAttribute('gravity-x') || 0,
            y: this.getAttribute('gravity-y') || 0.1,
            scale: this.getAttribute('gravity-scale') || 0.001
        }
      },
      walls: {
        width: Number(document.body.getAttribute('data-width')) || 1600,
        height: Number(document.body.getAttribute('data-height')) || 1200
      }
    }

    if (this.hasAttribute('debug')) {
      this.worker = new MatterWebWorker(engineCreateOptions)
        // start matter this.engine
        const render = Matter.Render.create({
          element: document.body,
          engine: this.worker.engine,
          options: {
            width: Number(document.body.getAttribute('data-width')) || 1600,
            height: Number(document.body.getAttribute('data-height')) || 1200,
            hasBounds: true,
            wireframes: true,
            showBounds: true,
            showVelocity: true,
            showCollisions: true,
            showAxes: true,
            showPositions: true,
            showAngleIndicator: true
          }
        })
        const style = document.createElement('style')
        style.textContent = /* css */`
          ${this.tagName} {
            --opacity: 0.5;
          }
        `
        this.appendChild(style)
        Matter.Render.run(render)
    } else {
      this.worker = new Worker(`${this.importMetaUrl}./MatterWebWorker.js`, {type: 'module'})
      this.worker.addEventListener('error', error => console.error('MatterWebWorker.js Error:', error))
      this.worker.addEventListener('messageerror', error => console.error('MatterWebWorker.js message deserialization failed:', error))
      this.worker.postMessage({
        type: 'engineCreate',
        options: engineCreateOptions
      })
    }

    let animationFrameId = null
    let bodies = null
    this.worker.onmessage = event => {
      if (!event.data) event.data = event
      switch (event.data.type) {
        case 'afterUpdate':
          bodies = event.data.bodies
          if (!animationFrameId) animationFrameId = self.requestAnimationFrame(timestamp => _dispatchEvent())
          break
      }
    }
    const _dispatchEvent = () => {
      if (!bodies) return
      this.dispatchEvent(new CustomEvent(this.getAttribute('matter-bodies') || 'matter-bodies', {
        detail: {
          bodies
        },
        bubbles: true,
        cancelable: true,
        composed: true
      }))
      bodies = null
      animationFrameId = null
    }

    this.addBodyEventListener = event => {
      let webComponent = null
      if (event && event.detail && (webComponent = event.detail.webComponent)) {
        // add a reference pointing to the webComponent
        this.worker.postMessage({
          type: 'addBody',
          oid: webComponent.getAttribute('oid') || '',
          shape: MatterElement.getRectangle(webComponent)
        })
      }
    }

    this.removeBodyEventListener = event => {
      /*let webComponent = null
      if (event && event.detail && (webComponent = event.detail.webComponent) && typeof webComponent.body?.then === 'function') {
        webComponent.body.then(body => Matter.Composite.remove(this.engine.world, body))
      }*/
    }

    this.bodyPointerDownEventListener = event => {
      let webComponent = null
      if (event && event.detail && (webComponent = event.detail.webComponent)) {
        this.worker.postMessage({
          type: 'bodyPointerDown',
          oid: webComponent.getAttribute('oid') || '',
          position: event.detail.position
        })
      }
    }
    this.bodyPointerMoveEventListener = event => {
      this.worker.postMessage({
        type: 'bodyPointerMove',
        position: event.detail.position
      })
    }
    this.bodyPointerUpEventListener = event => {
      this.worker.postMessage({
        type: 'bodyPointerUp'
      })
    }

    const webComponentMap = new Map()
    this.yjsBodiesEventListener = async event => {
      const bodies = []
      event.detail.keys.forEach(async ({key, isSelf, getBody}) => {
        if (isSelf) return
        const yjsBody = getBody()
        bodies.push(yjsBody)
        let webComponent
        if (webComponentMap.has(key)) {
          webComponent = await webComponentMap.get(key)
        } else if ((webComponent = yjsBody.uid ? this.querySelector(`[uid="${yjsBody.uid}"]`) : this.querySelector(`[oid="${yjsBody.oid}"]`))) {
          webComponentMap.set(key, Promise.resolve(webComponent))
        } else {
          let resolveWebComponent
          webComponentMap.set(key, new Promise(resolve => (resolveWebComponent = resolve)))
          const module = await import(`${this.importMetaUrl}../bodies/Rectangle.js`)
          webComponent = new module.default
          webComponent.setAttribute('x', yjsBody.position.x)
          webComponent.setAttribute('y', yjsBody.position.y)
          webComponent.setAttribute('oid', yjsBody.oid)
          webComponent.setAttribute('uid', yjsBody.uid)
          webComponent.setAttribute('is-static', yjsBody.isStatic)
          // TODO: make dynamic width, height, shape
          webComponent.setAttribute('width', '50')
          webComponent.setAttribute('height', '50')
          this.appendChild(webComponent)
          // @ts-ignore
          resolveWebComponent(webComponent)
        }
        webComponent.yjsBody = yjsBody
      })
      this.worker.postMessage({
        type: 'yjsBodies',
        bodies
      })
    }
  }

  connectedCallback () {
    document.body.addEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    document.body.addEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
    document.body.addEventListener(this.getAttribute('body-pointer-down') || 'body-pointer-down', this.bodyPointerDownEventListener)
    document.body.addEventListener(this.getAttribute('body-pointer-move') || 'body-pointer-move', this.bodyPointerMoveEventListener)
    document.body.addEventListener(this.getAttribute('body-pointer-up') || 'body-pointer-up', this.bodyPointerUpEventListener)
    document.body.addEventListener('yjs-bodies', this.yjsBodiesEventListener)
  }

  disconnectedCallback () {
    document.body.removeEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    document.body.removeEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
    document.body.removeEventListener(this.getAttribute('body-pointer-down') || 'body-pointer-down', this.bodyPointerDownEventListener)
    document.body.removeEventListener(this.getAttribute('body-pointer-move') || 'body-pointer-move', this.bodyPointerMoveEventListener)
    document.body.removeEventListener(this.getAttribute('body-pointer-up') || 'body-pointer-up', this.bodyPointerUpEventListener)
    document.body.removeEventListener('yjs-bodies', this.yjsBodiesEventListener)
  }


  /**
   * @param {HTMLElement} webComponent
   * @return {[number, number, number, number, {webComponent:HTMLElement}|any]}
   */
  static getRectangle (webComponent) {
    return [
      Number(webComponent.getAttribute('x')) + Number(webComponent.getAttribute('width')) / 2, // matter.js will use the coordinates for center of body but here we do adjust for top/left
      Number(webComponent.getAttribute('y')) + Number(webComponent.getAttribute('height')) / 2, // matter.js will use the coordinates for center of body but here we do adjust for top/left
      Number(webComponent.getAttribute('width')),
      Number(webComponent.getAttribute('height')),
      // @ts-ignore
      {
        oid: webComponent.getAttribute('oid') || '',
        uid: webComponent.getAttribute('uid') || '',
        restitution: webComponent.getAttribute('restitution') || 0.6,
        friction: webComponent.getAttribute('friction') || 0.1,
        // @ts-ignore
        isStatic: webComponent.isStatic(),
        collisions: []
      }
    ]
  }
}
