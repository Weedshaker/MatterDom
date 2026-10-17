// @ts-check
/* global self */

import Matter from '../../dependencies/matter.min.js'

/***
 * https://github.com/liabru/matter-js
 * https://brm.io/matter-js/docs/
 * 
 *
 * @export
 * @class MatterWebWorker
 * @type {CustomElementConstructor}
 */
export default class MatterWebWorker {
  constructor (options) {
    this.importMetaUrl = import.meta.url.replace(/(.*\/)(.*)$/, '$1')

    // start matter engine
    this.engine = Matter.Engine.create(options.create)
    // TODO: fix the wall and dimension stuff
    const WALL = 50
    const height = options.walls.height
    const width = options.walls.width
    const walls = [
      Matter.Bodies.rectangle(width / 2, height + WALL / 2, width, WALL, { isStatic: true }),
      Matter.Bodies.rectangle(width / 2, -WALL / 2, width, WALL, { isStatic: true }),
      Matter.Bodies.rectangle(-WALL / 2, height / 2, WALL, height, { isStatic: true }),
      Matter.Bodies.rectangle(width + WALL / 2, height / 2, WALL, height, { isStatic: true })
    ]
    Matter.Composite.add(this.engine.world, walls)
    this.beforeUpdateFuncs = []
    this.canUpdate = true
    Matter.Events.on(this.engine, 'beforeUpdate', () => {
      this.canUpdate = false
      const updatedBodies = this.beforeUpdateFuncs.map(func => func())
      this.beforeUpdateFuncs = []
      // check if the body has a ground below, else wake the body up
      this.engine.world.bodies.forEach(body => {
        if (body.isStatic) return
        if (!body.isSleeping) return
        if (updatedBodies.includes(body)) return
        const { min, max } = body.bounds
        const collisions = Matter.Query.ray(
          this.engine.world.bodies.filter(
            otherBody => otherBody !== body && !otherBody.isSensor
          ),
          { x: min.x + 1, y: max.y + 1 },
          { x: max.x - 1, y: max.y + 6 }
        )
        if (collisions.length < 1) Matter.Sleeping.set(body, false)
      })
    })
    Matter.Events.on(this.engine, 'afterUpdate', () => {
      this.canUpdate = true
      self.postMessage({ type: 'afterUpdate', bodies: this.engine.world.bodies })
    })
    // Matter.Events.on(this.engine, 'sleepStart', event => this.dispatchEvent(new CustomEvent('matter-sleep-start', {
    //   detail: {
    //     body: event.source
    //   },
    //   bubbles: true,
    //   cancelable: true,
    //   composed: true
    // })))
    // Matter.Events.on(this.engine, 'sleepEnd', event => this.dispatchEvent(new CustomEvent('matter-sleep-end', {
    //   detail: {
    //     body: event.source
    //   },
    //   bubbles: true,
    //   cancelable: true,
    //   composed: true
    // })))
    /*
    const mouseConstraint = Matter.MouseConstraint.create(this.engine, {
      element: document.body,
      constraint: {
        stiffness: 0.2,
        render: {
          visible: false
        }
      }
    })
    Matter.Composite.add(this.engine.world, mouseConstraint)
    */

    this.timeEventListener = event => {
      if (this.canUpdate) Matter.Engine.update(this.engine)
    }

    // const webComponentMap = new Map()
    // let beforeUpdateFuncs = []
    // this.yjsBodiesEventListener = async event => {
    //   const [Matter] = await this.matterEnginePromise
    //   event.detail.keys.forEach(async ({key, isSelf, getBody}) => {
    //     if (isSelf) return
    //     const yjsBody = getBody()
    //     let webComponent
    //     if (webComponentMap.has(key)) {
    //       webComponent = await webComponentMap.get(key)
    //     } else if ((webComponent = yjsBody.uid ? this.querySelector(`[uid="${yjsBody.uid}"]`) : this.querySelector(`[oid="${yjsBody.oid}"]`))) {
    //       webComponentMap.set(key, Promise.resolve(webComponent))
    //     } else {
    //       let resolveWebComponent
    //       webComponentMap.set(key, new Promise(resolve => (resolveWebComponent = resolve)))
    //       const module = await import(`${this.importMetaUrl}../bodies/Rectangle.js`)
    //       webComponent = new module.default
    //       webComponent.setAttribute('x', yjsBody.position.x)
    //       webComponent.setAttribute('y', yjsBody.position.y)
    //       webComponent.setAttribute('oid', yjsBody.oid)
    //       webComponent.setAttribute('uid', yjsBody.uid)
    //       webComponent.setAttribute('is-static', yjsBody.isStatic)
    //       // TODO: make dynamic width, height, shape
    //       webComponent.setAttribute('width', '50')
    //       webComponent.setAttribute('height', '50')
    //       this.appendChild(webComponent)
    //       // @ts-ignore
    //       resolveWebComponent(webComponent)
    //     }
    //     webComponent.yjsBody = yjsBody
    //     const body = await webComponent.body
    //     beforeUpdateFuncs.push(() => {
    //       Matter.Sleeping.set(body, false)
    //       Matter.Body.setAngle(body, yjsBody.angle)
    //       Matter.Body.setPosition(body, yjsBody.position)
    //       Matter.Body.setAngularVelocity(body, yjsBody.angularVelocity)
    //       Matter.Body.setVelocity(body, yjsBody.velocity)
    //       return body
    //     })
    //   })
    // }

    this.addBodyEventListener = event => {
      let webComponent = null
      let resolveBody = null
      console.log('****addBodyEventListener*****', event.data)
      /*
        const body = Matter.Bodies.rectangle(...this.getRectangle(webComponent))
        Matter.Composite.add(this.engine.world, body)
        body.isStatic = webComponent.isStatic()
        resolveBody(body)
      */
    }

    // this.removeBodyEventListener = event => {
    //   let webComponent = null
    //   if (event && event.detail && (webComponent = event.detail.webComponent) && typeof webComponent.body?.then === 'function') {
    //     this.matterEnginePromise.then(([Matter, engine]) => {
    //       webComponent.body.then(body => Matter.Composite.remove(engine.world, body))
    //     })
    //   }
    // }
  }

  connectedCallback () {
    // document.body.addEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    // document.body.addEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
    // document.body.addEventListener('yjs-bodies', this.yjsBodiesEventListener)
  }

  disconnectedCallback () {
    // document.body.removeEventListener(this.getAttribute('add-body') || 'add-body', this.addBodyEventListener)
    // document.body.removeEventListener(this.getAttribute('remove-body') || 'remove-body', this.removeBodyEventListener)
    // document.body.removeEventListener('yjs-bodies', this.yjsBodiesEventListener)
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
}

let matterWebWorker
self.addEventListener('message', event => {
  switch (event.data.type) {
    case 'engineCreate':
      matterWebWorker = new MatterWebWorker(event.data.options)
      break
    case 'tick':
      matterWebWorker.timeEventListener(event)
      break
    case 'yjsBodies':
      matterWebWorker.beforeUpdateFuncs.push(() => {
        console.log('*****beforeUpdateFuncs****', event.data.bodies)
        event.data.bodies.forEach(yjsBody => {
          /*
          Matter.Sleeping.set(body, false)
          Matter.Body.setAngle(body, yjsBody.angle)
          Matter.Body.setPosition(body, yjsBody.position)
          Matter.Body.setAngularVelocity(body, yjsBody.angularVelocity)
          Matter.Body.setVelocity(body, yjsBody.velocity)
          return body
          */
        })
      })
      break
    case 'addBody':
      matterWebWorker.addBodyEventListener(event)
      break
  }
})
