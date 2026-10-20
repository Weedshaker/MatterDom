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

    try {
      // @ts-ignore
      if (globalThis instanceof WorkerGlobalScope) self.addEventListener('message', this.postMessage)
    } catch (error) {
      console.info('MatterWebWorker is running in main threat due to debugging')
    }

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
      this.onmessage({ type: 'afterUpdate', bodies: this.engine.world.bodies })
      this.canUpdate = true
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

    this.oidToMatterIdMap = new Map()
    this.addBodyEventListener = event => {
      const body = Matter.Bodies.rectangle(...event.data.shape)
      Matter.Composite.add(this.engine.world, body)
      this.oidToMatterIdMap.set(event.data.oid, body.id)
    }

    // this.removeBodyEventListener = event => {
    //   let webComponent = null
    //   if (event && event.detail && (webComponent = event.detail.webComponent) && typeof webComponent.body?.then === 'function') {
    //     this.matterEnginePromise.then(([Matter, engine]) => {
    //       webComponent.body.then(body => Matter.Composite.remove(engine.world, body))
    //     })
    //   }
    // }

    MatterWebWorker.tick(() => {
      if (this.canUpdate) Matter.Engine.update(this.engine)
    })
  }

  static tick (func, time, keepRunning = true) {
    this._isRunning = keepRunning
    func(time)
    if (this._isRunning) self.requestAnimationFrame(time => MatterWebWorker.tick(func, time))
  }

  // this is the onmessage listener within the web worker but called postMessage from the outside
  postMessage = event => {
    if (!event.data) event.data = event
    switch (event.data.type) {
      case 'yjsBodies':
        event.data.bodies.forEach(yjsBody => {
          if (this.oidToMatterIdMap.has(yjsBody.oid)) this.beforeUpdateFuncs.push(() => {
            const body = Matter.Composite.get(this.engine.world, this.oidToMatterIdMap.get(yjsBody.oid), 'body')
            Matter.Sleeping.set(body, false)
            Matter.Body.setAngle(body, yjsBody.angle)
            Matter.Body.setPosition(body, yjsBody.position)
            Matter.Body.setAngularVelocity(body, yjsBody.angularVelocity)
            Matter.Body.setVelocity(body, yjsBody.velocity)
            return body
          })
        })
        break
      case 'addBody':
        this.addBodyEventListener(event)
        break
      case 'setBody':
        // yjsBody from Shape.js on drag
        if (this.oidToMatterIdMap.has(event.data.body.oid)) this.beforeUpdateFuncs.push(() => {
          const body = Matter.Composite.get(this.engine.world, this.oidToMatterIdMap.get(event.data.body.oid), 'body')
          Matter.Sleeping.set(body, false)
          Matter.Body.setPosition(body, event.data.body.position)
          return body
        })
        break
    }
  }

  // this is the postMessage function within the web worker but called onmessage from the outside
  onmessage (message) {
    self.postMessage(message)
  }
}

try {
  // @ts-ignore
  if (globalThis instanceof WorkerGlobalScope) self.addEventListener('message', event => new MatterWebWorker(event.data.options), {once: true})
} catch (error) {}
