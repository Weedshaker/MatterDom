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

    this.bodies = new Map()

    this.loadDependency().then(Matter => {
      // clean this stuff up and make all promises
      this.Matter = Matter // this.Matter must stay private within this component
      this.engine = Matter.Engine.create()
      // TODO: make whole DOM top, left border
      const ground = Matter.Bodies.rectangle(
        100, 200, 500, 120, { isStatic: true }
      )
      // TODO: allow selectors to add none static elements to Bodies
      const mouseConstraint = Matter.MouseConstraint.create(this.engine, { element: document.body })
      Matter.Composite.add(this.engine.world, [ground, mouseConstraint])
    })

    // this event listener can only be added once the loadDependency and its internal requirements were initialzed
    this.timeEventListener = event => {
      if (event.detail.time) {
        this.bodies.forEach((matterBody, domBody) => {
          this.css = ''
          // TODO: read the width dynamically out or set anchor to top left
          this.css = /* css */`
            :host {
              --${domBody.getAttribute('namespace')}transform: translate(${matterBody.position.x - 20}px, ${matterBody.position.y - 20}px) rotate(${matterBody.angle}rad);
            }
          `
        })
        this.Matter.Engine.update(this.engine)
      }
    }
    this.addBodyEventListener = event => {
      let domBody = null
      if (event && event.detail && (domBody = event.detail.body)) {
        this.loadDependency().then(Matter => {
          const bodyBoundingClientRect = event.detail.body.getBoundingClientRect()
          const matterBody = Matter.Bodies.rectangle(
            bodyBoundingClientRect.x,
            bodyBoundingClientRect.y,
            bodyBoundingClientRect.width,
            bodyBoundingClientRect.height
          )
          Matter.Composite.add(this.engine.world, matterBody)
          this.bodies.set(domBody, matterBody)
        })
      }
    }
  }

  connectedCallback () {
    this.loadDependency().then(Matter => this.timeEventTarget.addEventListener(this.getAttribute('time') || 'time', this.timeEventListener))
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
