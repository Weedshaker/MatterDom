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
  // TODO: querySelectorAll function for dom none web components to be added to matter engine
  constructor () {
    super()
    
    this.tickCounter = 0
    this.updateStaticByTick = 100
    this.createStaticCSSTag()

    this.matterEnginePromise = this.loadDependency().then(Matter => {
      const engine = Matter.Engine.create()
      this.canUpdate = true
      Matter.Events.on(engine, "beforeUpdate", () => this.canUpdate = false)
      Matter.Events.on(engine, "afterUpdate", () => this.canUpdate = true)
      const mouseConstraint = Matter.MouseConstraint.create(engine, { element: document.body }) // TODO: control mouseConstraints etc. at an other place
      Matter.Composite.add(engine.world, mouseConstraint)
      return [Matter, engine]
    })
    
    this.timeEventListener = event => {
      if (event.detail.time && this.canUpdate) {
        this.tickCounter++
        this.matterEnginePromise.then(([Matter, engine]) => {
          this.renderCSS(this.filterDynamicBodies(engine.world.bodies))
          if (this.tickCounter % this.updateStaticByTick === 0) this.renderStaticCSS(this.filterStaticBodies(engine.world.bodies))
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
          body.isStatic = webComponent.isStatic()
          this.renderStaticCSS(this.filterStaticBodies(engine.world.bodies))
          resolveBody(body)
        })
      }
    }

    this.removeBodyEventListener = event => {
      let webComponent = null
      if (event && event.detail && (webComponent = event.detail.webComponent)) {
        this.matterEnginePromise.then(([Matter, engine]) => {
          webComponent.body.then(body => {
            Matter.Composite.remove(engine.world, body)
            this.renderStaticCSS(this.filterStaticBodies(engine.world.bodies))
          })
        })
      }
    }
  }

  connectedCallback () {
    this.timeEventTarget.addEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
    document.body.addEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    document.body.addEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
  }

  disconnectedCallback () {
    this.timeEventTarget.removeEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
    document.body.removeEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    document.body.removeEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
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
        ${this.getCSSTransformString(bodies)}
      }
    `
  }

  /**
  * creates the style container for static css
  *
  * @return {void}
  */
  createStaticCSSTag () {
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
        ${this.getCSSTransformString(bodies)}
      }
    `
    if (this.namespace) style = style.replace(/--/g, `--${this.namespace}`)
    this._staticCss.textContent = style
  }

  /**
  * renders the static bodies css
  *
  * @param {any} bodies
  * @return {string}
  */
  getCSSTransformString (bodies) {
    return bodies.reduce((acc, body) => `${acc}--${body.webComponent.getAttribute('namespace')}transform: translate(${body.position.x - body.webComponent.getAttribute('half-width')}px, ${body.position.y - body.webComponent.getAttribute('half-height')}px) rotate(${body.angle}rad);`, '')
  }

  /**
  * @param {any} bodies
  * @return {[any]}
  */
  filterDynamicBodies (bodies) {
    return bodies.filter(body => !!body.webComponent && !body.isStatic)
  }

  /**
  * @param {any} bodies
  * @return {[any]}
  */
  filterStaticBodies (bodies) {
    return bodies.filter(body => !!body.webComponent && body.isStatic)
  }

  /**
   * @param {HTMLElement} webComponent
   * @return {[number, number, number, number, {webComponent:HTMLElement}]}
   */
  getRectangle (webComponent) {
    return [
      Number(webComponent.getAttribute('x')) + Number(webComponent.getAttribute('width')) / 2, // matter.js will use the coordinates for center of body but here we do adjust for top/left
      Number(webComponent.getAttribute('y')) + Number(webComponent.getAttribute('height')) / 2, // matter.js will use the coordinates for center of body but here we do adjust for top/left
      Number(webComponent.getAttribute('width')),
      Number(webComponent.getAttribute('height')),
      {webComponent}
    ]
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
