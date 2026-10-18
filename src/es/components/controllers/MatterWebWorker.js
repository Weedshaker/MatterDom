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
    console.log('*********', this.engine)
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
    this.beforeUpdateFuncs = new Map()
    this.canUpdate = true
    Matter.Events.on(this.engine, 'beforeUpdate', () => {
      this.canUpdate = false
      const updatedBodies = Array.from(this.beforeUpdateFuncs).map(([key, func]) => func())
      this.beforeUpdateFuncs.clear()
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
      self.postMessage({ type: 'afterUpdate', bodies: this.engine.world.bodies })
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

    this.timeEventListener = event => {
      /*if (this.canUpdate) {
        Matter.Engine.update(this.engine)
        //self.postMessage({ type: 'afterUpdate', bodies: this.engine.world.bodies })
      }*/
    }
    // TODO: remove time from outside but run time inside web worker
    const addEventListenerRequestAnimationFrame = (func, time, keepRunning = true) => {
      this._isRunning = keepRunning
      func(time)
      if (this._isRunning) self.requestAnimationFrame(time => addEventListenerRequestAnimationFrame(func, time))
    }
    addEventListenerRequestAnimationFrame(() => {
      if (this.canUpdate) Matter.Engine.update(this.engine)
    })

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
      //console.log('*********', 'yjsBodies', event.data)
      event.data.bodies.forEach(yjsBody => {
        if (matterWebWorker.oidToMatterIdMap.has(yjsBody.oid)) matterWebWorker.beforeUpdateFuncs.set(yjsBody.oid, () => {
          const body = Matter.Composite.get(matterWebWorker.engine.world, matterWebWorker.oidToMatterIdMap.get(yjsBody.oid), 'body')
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
      matterWebWorker.addBodyEventListener(event)
      break
    case 'setBody':
      // yjsBody from Shape.js on drag
      if (matterWebWorker.oidToMatterIdMap.has(event.data.body.oid)) matterWebWorker.beforeUpdateFuncs.set(event.data.body.oid, () => {
        const body = Matter.Composite.get(matterWebWorker.engine.world, matterWebWorker.oidToMatterIdMap.get(event.data.body.oid), 'body')
        Matter.Sleeping.set(body, false)
        Matter.Body.setPosition(body, event.data.body.position)
        return body
      })
      break
  }
})
