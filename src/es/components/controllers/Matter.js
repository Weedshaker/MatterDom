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
  constructor (options = {}, ...args) {
    super({ importMetaUrl: import.meta.url, tabindex: 'no-tabindex-style', ...options }, ...args)

    this.tickCounter = 0
    this.updateStaticByTick = 10000
    this.createStaticCSSTag()

    this.matterEnginePromise = this.loadDependency().then(Matter => {
      this._Matter = Matter
      const engine = Matter.Engine.create({
        enableSleeping: false,
        gravity: {
            x: 0,
            y: 0.1,
            scale: 0.001
        }
      })
      this._engine = engine
      self._engine = engine
      if (this.hasAttribute('debug')) {
        const render = Matter.Render.create({
          element: document.body,
          engine,
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
        Matter.Render.run(render)
      }

      const WALL = 50
      const height = Number(document.body.getAttribute('data-height'))
      const width = Number(document.body.getAttribute('data-width'))
      const walls = [
        Matter.Bodies.rectangle(width / 2, height + WALL / 2, width, WALL, { isStatic: true }),
        Matter.Bodies.rectangle(width / 2, -WALL / 2, width, WALL, { isStatic: true }),
        Matter.Bodies.rectangle(-WALL / 2, height / 2, WALL, height, { isStatic: true }),
        Matter.Bodies.rectangle(width + WALL / 2, height / 2, WALL, height, { isStatic: true })
      ]
      Matter.Composite.add(engine.world, walls)

      this.canUpdate = true
      Matter.Events.on(engine, 'beforeUpdate', () => (this.canUpdate = false))
      Matter.Events.on(engine, 'afterUpdate', () => (this.canUpdate = true))
      const mouseConstraint = Matter.MouseConstraint.create(engine, {
        element: document.body.querySelector('[self]'),
        constraint: {
          stiffness: 0.2,
          render: {
            visible: false
          }
        }
      }) // TODO: control mouseConstraints etc. at an other place
      Matter.Composite.add(engine.world, mouseConstraint)
      return [Matter, engine]
    })

    this.timeEventListener = event => {
      if (event.detail.time && this.canUpdate) {
        this.tickCounter++
        this.matterEnginePromise.then(([Matter, engine]) => {
          // this.renderCSS(this.filterDynamicBodies(engine.world.bodies)) // TODO: IPHONE IOS 13+ Bug does not update dom renderer when only changes on variables
          // TODO: retest this workaround
          this.filterDynamicBodies(engine.world.bodies).forEach(body => {
            body.webComponent.style.top = `${body.position.y - body.webComponent.getAttribute('half-height')}px`
            body.webComponent.style.left = `${body.position.x - body.webComponent.getAttribute('half-width')}px`
            body.webComponent.style.transform = `rotate(${body.angle}rad)`
            // TODO: fix this to transform
            //body.webComponent.style.transform = `rotate(${body.angle}rad) translate(${body.position.x - body.webComponent.getAttribute('half-width')}px, ${body.position.y - body.webComponent.getAttribute('half-height')}px)`
            if (body.webComponent?.hasAttribute('self')) {
              this.dispatchEvent(new CustomEvent(this.getAttribute('matter-self-body') || 'matter-self-body', {
                detail: {
                  body: {
                    angle: body.angle,
                    angularSpeed: body.angularSpeed,
                    angularVelocity: body.angularVelocity,
                    force: body.force,
                    position: body.position,
                    positionImpulse: body.positionImpulse,
                    velocity: body.velocity,
                    isUser: true
                  }
                },
                bubbles: true,
                cancelable: true,
                composed: true
              }))
            }
            // dispatch all other bodies to crdt
            if (body.webComponent?.hasAttribute('uid') && !otherBodiesControlledByForeignSession.includes(body.webComponent.hasAttribute('uid')) && !body.webComponent?.hasAttribute('self') && !body.webComponent?.hasAttribute('is-static')) {
              this.dispatchEvent(new CustomEvent(this.getAttribute('matter-other-body') || 'matter-other-body', {
                detail: {
                  body: {
                    angle: body.angle,
                    angularSpeed: body.angularSpeed,
                    angularVelocity: body.angularVelocity,
                    force: body.force,
                    position: body.position,
                    positionImpulse: body.positionImpulse,
                    velocity: body.velocity,
                    webComponent: body.webComponent
                  }
                },
                bubbles: true,
                cancelable: true,
                composed: true
              }))
            }
          })
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

    // TODO: clear this, when other session disconnects for that body and take dispatch to CRDT control
    const otherBodiesControlledByForeignSession = []
    const newWebComponentPromiseMap = new Map()
    this.yjsNotSelfBodyEventListener = async event => {
      let webComponent = this.root.querySelector(`#${event.detail.key}`) || this.root.querySelector(`[uid="${event.detail.key}"]`)
      // TODO: check what has better performance, always push or have one instance having control on other bodies
      //if (webComponent?.hasAttribute('uid')) otherBodiesControlledByForeignSession.push(webComponent.getAttribute('uid'))
      if (!webComponent) {
        if (!newWebComponentPromiseMap.has(event.detail.key)) newWebComponentPromiseMap.set(event.detail.key, import(`${this.importMetaUrl || import.meta.url.replace(/(.*\/)(.*)$/, '$1')}../bodies/Rectangle.js`).then(module => {
          webComponent = new module.default
          webComponent.setAttribute('id', event.detail.key)
          webComponent.setAttribute('x', '150')
          webComponent.setAttribute('y', '0')
          webComponent.setAttribute('width', '50')
          webComponent.setAttribute('height', '50')
          if (event.detail.body.isUser) webComponent.setAttribute('is-user', '')
          this.root.appendChild(webComponent)
          return webComponent
        }))
        webComponent = await newWebComponentPromiseMap.get(event.detail.key)
      }
      const body = await webComponent.body
      this._Matter.Body.setAngle(body, event.detail.body.angle);
      this._Matter.Body.setPosition(body, event.detail.body.position)
      this._Matter.Body.setAngularVelocity(body, event.detail.body.angularVelocity)
      this._Matter.Body.setVelocity(body, event.detail.body.velocity)
      // do not update engine here
    }
  }

  connectedCallback () {
    this.timeEventTarget.addEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
    document.body.addEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    document.body.addEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
    document.body.addEventListener('yjs-not-self-body', this.yjsNotSelfBodyEventListener)
    this.renderCSS()
  }

  disconnectedCallback () {
    this.timeEventTarget.removeEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
    document.body.removeEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    document.body.removeEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
    document.body.removeEventListener('yjs-not-self-body', this.yjsNotSelfBodyEventListener)
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
        ${bodies ? this.getCSSTransformString(bodies) : ''}
      }
      :host([debug]) > * {
        opacity: 0.5;
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
   * @return {[number, number, number, number, {webComponent:HTMLElement}|any]}
   */
  getRectangle (webComponent) {
    return [
      Number(webComponent.getAttribute('x')) + Number(webComponent.getAttribute('width')) / 2, // matter.js will use the coordinates for center of body but here we do adjust for top/left
      Number(webComponent.getAttribute('y')) + Number(webComponent.getAttribute('height')) / 2, // matter.js will use the coordinates for center of body but here we do adjust for top/left
      Number(webComponent.getAttribute('width')),
      Number(webComponent.getAttribute('height')),
      { webComponent, restitution: webComponent.getAttribute('restitution') || 0.6, friction: webComponent.getAttribute('friction') || 0.1 }
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
