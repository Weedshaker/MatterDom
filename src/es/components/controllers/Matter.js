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
    
    this.tickCounter = 0
    this.updateStaticByTick = 100
    this.createStaticCss()

    this.matterEnginePromise = this.loadDependency().then(Matter => {
      const engine = Matter.Engine.create()
      this.canUpdate = true
      Matter.Events.on(engine, "beforeUpdate", () => this.canUpdate = false)
      Matter.Events.on(engine, "afterUpdate", () => this.canUpdate = true)
      const mouseConstraint = Matter.MouseConstraint.create(engine, { element: document.body })
      // TODO: querySelectorAll function for dom none web components to be added to matter engine
      Matter.Composite.add(engine.world, mouseConstraint)
      return [Matter, engine]
    })
    
    this.timeEventListener = event => {
      if (event.detail.time && this.canUpdate) {
        this.tickCounter++
        this.matterEnginePromise.then(([Matter, engine]) => {
          this.renderCSS(engine.world.bodies.filter(body => !!body.webComponent && !body.isStatic))
          if (this.tickCounter % this.updateStaticByTick === 0) this.renderStaticCSS(engine.world.bodies.filter(body => !!body.webComponent && body.isStatic))
          Matter.Engine.update(engine)
        })
      }
    }

    this.addBodyEventListener = event => {
      let webComponent = null
      let resolveBody = null
      if (event && event.detail && (webComponent = event.detail.webComponent) && (resolveBody = event.detail.resolveBody)) {
        this.matterEnginePromise.then(([Matter, engine]) => {
          const body = Matter.Bodies.rectangle(...this.getRectangle(webComponent))
          Matter.Composite.add(engine.world, body)
          this.renderStaticCSS(engine.world.bodies.filter(body => !!body.webComponent && body.isStatic))
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
  * renders the dynamic bodies css
  *
  * @param {any} bodies
  * @return {void}
  */
  renderCSS (bodies) {
    this.css = ''
    this.css = /* css */`
      :host {
        ${bodies.reduce((acc, body) => `${acc}--${body.webComponent.getAttribute('namespace')}transform: translate(${body.position.x - body.webComponent.getAttribute('half-width')}px, ${body.position.y - body.webComponent.getAttribute('half-height')}px) rotate(${body.angle}rad);`, '')}
      }
    `
  }

  /**
  * creates the style container for static css
  *
  * @return {void}
  */
  createStaticCss () {
    this._staticCss = document.createElement('style')
    this._staticCss.setAttribute('_staticCss', '')
    this._staticCss.setAttribute('protected', 'true') // this will avoid deletion by html=''
    this.root.appendChild(this._staticCss)
  }

  /**
  * renders the static bodies css
  *
  * @param {any} bodies
  * @return {void}
  */
  renderStaticCSS (bodies) {
    let style = /* css */`
      :host {
        ${bodies.reduce((acc, body) => `${acc}--${body.webComponent.getAttribute('namespace')}transform: translate(${body.position.x - body.webComponent.getAttribute('half-width')}px, ${body.position.y - body.webComponent.getAttribute('half-height')}px) rotate(${body.angle}rad);`, '')}
      }
    `
    if (this.namespace) style = style.replace(/--/g, `--${this.namespace}`)
    this._staticCss.textContent = style
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
   * @param {HTMLElement} webComponent
   * @return {[number, number, number, number, {webComponent:HTMLElement, isStatic:boolean}]}
   */
  getRectangle (webComponent) {
    return [
      Number(webComponent.getAttribute('x')) + Number(webComponent.getAttribute('width')) / 2, // matter.js will use the coordinates for center of body but here we do adjust for top/left
      Number(webComponent.getAttribute('y')) + Number(webComponent.getAttribute('height')) / 2, // matter.js will use the coordinates for center of body but here we do adjust for top/left
      Number(webComponent.getAttribute('width')),
      Number(webComponent.getAttribute('height')),
      {webComponent, isStatic: this.getIsStatic(webComponent)}
    ]
  }

  /**
   * @param {HTMLElement} webComponent
   * @return {boolean}
   */
  getIsStatic (webComponent) {
    return (webComponent.hasAttribute('isStatic') && webComponent.getAttribute('isStatic') !== 'false') || (webComponent.hasAttribute('is-static') && webComponent.getAttribute('is-static') !== 'false')
  }

  /**
   * @return {HTMLElement}
   * @readonly
   */
  get timeEventTarget () {
    return this.hasAttribute('time-event-target-selector') ? document.body.querySelector(this.getAttribute('time-event-target-selector')) || this : this
  }
}
