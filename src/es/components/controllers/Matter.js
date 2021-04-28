// @ts-check
import { Shadow } from '../prototypes/Shadow.js'

/* global self */

/***
 * https://github.com/liabru/matter-js
 * https://brm.io/matter-js/docs/
 *
 * @export
 * @class Matter
 * @type {CustomElementConstructor}
 */
export default class Matter extends Shadow() {
  constructor () {
    super()
    
    this.matterEnginePromise = this.loadDependency().then(Matter => {
      const engine = Matter.Engine.create()
      this.canUpdate = true
      Matter.Events.on(engine, "beforeUpdate", () => this.canUpdate = false)
      Matter.Events.on(engine, "afterUpdate", () => this.canUpdate = true)
      // TODO: make whole DOM top, left border
      const ground = Matter.Bodies.rectangle(
        100, 200, 500, 120, { isStatic: true } // TODO: load this dynamically with option to set static rectangles
      )
      // TODO: allow selectors to add none static elements to Bodies
      const mouseConstraint = Matter.MouseConstraint.create(engine, { element: document.body })
      Matter.Composite.add(engine.world, [ground, mouseConstraint])
      return [Matter, engine]
    })
    
    this.timeEventListener = event => {
      if (event.detail.time && this.canUpdate) {
        this.matterEnginePromise.then(([Matter, engine]) => {
          engine.world.bodies.forEach(body => {
            if (body.webComponent) {
              this.css = ''
              this.css = /* css */`
                :host {
                  --${body.webComponent.getAttribute('namespace')}transform: translate(${body.position.x - body.webComponent.getAttribute('half-width')}px, ${body.position.y - body.webComponent.getAttribute('half-height')}px) rotate(${body.angle}rad);
                }
              `
            }
          })
          Matter.Engine.update(engine)
        })
      }
    }

    this.addBodyEventListener = event => {
      let webComponent = null
      let resolveBody = null
      if (event && event.detail && (webComponent = event.detail.webComponent) && (resolveBody = event.detail.resolveBody)) {
        this.matterEnginePromise.then(([Matter, engine]) => {
          const body = Matter.Bodies.rectangle(
            Number(webComponent.getAttribute('x')),
            Number(webComponent.getAttribute('y')),
            Number(webComponent.getAttribute('width')),
            Number(webComponent.getAttribute('height')),
            {webComponent}
          )
          Matter.Composite.add(engine.world, body)
          resolveBody(body)
        })
      }
    }
  }

  connectedCallback () {
    this.timeEventTarget.addEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
    this.timeEventTarget.addEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    // TODO: add remove-body listener
  }

  disconnectedCallback () {
    this.timeEventTarget.removeEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
    this.timeEventTarget.removeEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
  }

  /**
   * fetch dependency
   *
   * @returns {Promise<{Matter: any}>}
   */
  loadDependency () {
    return this.dependencyPromise || (this.dependencyPromise = new Promise(resolve => {
      // needs markdown
      if ('Matter' in self === true) {
        resolve(self.Matter) // eslint-disable-line
      } else {
        const matterScript = document.createElement('script')
        matterScript.setAttribute('type', 'text/javascript')
        matterScript.setAttribute('async', '')
        matterScript.setAttribute('src', 'https://cdn.jsdelivr.net/npm/matter-js/build/matter.min.js')
        matterScript.onload = () => {
          if ('Matter' in self === true) resolve(self.Matter) // eslint-disable-line
        }
        this.html = matterScript
      }
    }))
  }

  /**
   * @return {HTMLElement}
   * @readonly
   */
  get timeEventTarget () {
    return this.hasAttribute('time-event-target-selector') ? document.body.querySelector(this.getAttribute('time-event-target-selector')) || this : this
  }
}
