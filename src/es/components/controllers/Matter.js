// @ts-check
/* global self */

/***
 * https://github.com/liabru/matter-js
 * https://brm.io/matter-js/docs/
 *
 * @export
 * @class Matter
 * @type {CustomElementConstructor}
 */
export default class Matter extends HTMLElement {
  constructor () {
    super()

    // start matter engine
    this.matterEnginePromise = this.loadDependency().then(Matter => {
      const engine = Matter.Engine.create({
        enableSleeping: true,
        gravity: {
            x: this.getAttribute('gravity-x') || 0,
            y: this.getAttribute('gravity-y') || 0.1,
            scale: this.getAttribute('gravity-scale') || 0.001
        }
      })
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
        const style = document.createElement('style')
        style.textContent = /* css */`
          ${this.tagName} {
            --opacity: 0.5;
          }
        `
        this.appendChild(style)
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
      Matter.Events.on(engine, 'sleepStart', event => this.dispatchEvent(new CustomEvent(this.getAttribute('matter-sleep-start') || 'matter-sleep-start', {
        detail: {
          body: event.source
        },
        bubbles: true,
        cancelable: true,
        composed: true
      })))
      Matter.Events.on(engine, 'sleepEnd', event => this.dispatchEvent(new CustomEvent(this.getAttribute('matter-sleep-start') || 'matter-sleep-end', {
        detail: {
          body: event.source
        },
        bubbles: true,
        cancelable: true,
        composed: true
      })))
      const mouseConstraint = Matter.MouseConstraint.create(engine, {
        element: document.body,
        constraint: {
          stiffness: 0.2,
          render: {
            visible: false
          }
        }
      })
      Matter.Composite.add(engine.world, mouseConstraint)
      return [Matter, engine]
    })

    this.timeEventListener = event => {
      if (event.detail.time && this.canUpdate) {
        this.matterEnginePromise.then(([Matter, engine]) => {
          this.dispatchEvent(new CustomEvent(this.getAttribute('matter-bodies') || 'matter-bodies', {
            detail: {
              bodies: engine.world.bodies
            },
            bubbles: true,
            cancelable: true,
            composed: true
          }))
          Matter.Engine.update(engine)
        })
      }
    }

    const webComponentMap = new Map()
    this.yjsBodiesEventListener = async event => {
      const [Matter] = await this.matterEnginePromise
      event.detail.keys.forEach(async ({key, isSelf, getBody}) => {
        if (isSelf) return
        const yjsBody = getBody()
        let webComponent
        if (webComponentMap.has(key)) {
          webComponent = await webComponentMap.get(key)
        } else if ((webComponent = this.querySelector(`[uid="${key}"]`))) {
          webComponentMap.set(key, Promise.resolve(webComponent))
        } else {
          let resolveWebComponent
          webComponentMap.set(key, new Promise(resolve => (resolveWebComponent = resolve)))
          const module = await import(`${import.meta.url.replace(/(.*\/)(.*)$/, '$1')}../bodies/Rectangle.js`)
          webComponent = new module.default
          webComponent.setAttribute('x', yjsBody.position.x)
          webComponent.setAttribute('y', yjsBody.position.y)
          webComponent.setAttribute('uid', yjsBody.uid)
          // TODO: make dynamic width, height, shape
          webComponent.setAttribute('width', '50')
          webComponent.setAttribute('height', '50')
          this.appendChild(webComponent)
          // @ts-ignore
          resolveWebComponent(webComponent)
        }
        // TODO: only set when the values changed
        //console.log('*********', webComponent)
        const body = await webComponent.body
        Matter.Sleeping.set(body, false)
        Matter.Body.setAngle(body, yjsBody.angle)
        Matter.Body.setPosition(body, yjsBody.position)
        Matter.Body.setAngularVelocity(body, yjsBody.angularVelocity)
        Matter.Body.setVelocity(body, yjsBody.velocity)
      })
    }

    this.addBodyEventListener = event => {
      let webComponent = null
      let resolveBody = null
      if (event && event.detail && (webComponent = event.detail.webComponent) && (resolveBody = event.detail.resolveBody)) {
        this.matterEnginePromise.then(([Matter, engine]) => {
          // add a reference pointing to the webComponent
          const body = Matter.Bodies.rectangle(...this.getRectangle(webComponent))
          Matter.Composite.add(engine.world, body)
          body.isStatic = webComponent.isStatic()
          resolveBody(body)
        })
      }
    }

    this.removeBodyEventListener = event => {
      let webComponent = null
      if (event && event.detail && (webComponent = event.detail.webComponent) && typeof webComponent.body?.then === 'function') {
        this.matterEnginePromise.then(([Matter, engine]) => {
          webComponent.body.then(body => Matter.Composite.remove(engine.world, body))
        })
      }
    }
  }

  connectedCallback () {
    document.body.addEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
    document.body.addEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    document.body.addEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
    document.body.addEventListener('yjs-bodies', this.yjsBodiesEventListener)
  }

  disconnectedCallback () {
    document.body.removeEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
    document.body.removeEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    document.body.removeEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
    document.body.removeEventListener('yjs-bodies', this.yjsBodiesEventListener)
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
   * @returns {Promise<any>}
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
        document.head.appendChild(matterScript)
      }
    }))
  }
}
