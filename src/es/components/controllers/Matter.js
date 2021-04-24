// @ts-check
import { Shadow } from '../prototypes/Shadow.js'

/* global requestAnimationFrame */
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

    this.loadDependency().then(Matter => {
      // clean this stuff up and make all promises
      this.Matter = Matter // this.Matter must stay private within this component
      this.engine = Matter.Engine.create()
      // TODO: move box to its own web component
      this.box = {
        // TODO: do this on event here
        body: Matter.Bodies.rectangle(150, 0, 40, 40),
        elem: document.querySelector('#box'),
        // do this for all elements
        render: function () {
          const { x, y } = this.body.position
          this.elem.style.top = `${y - 20}px`
          this.elem.style.left = `${x - 20}px`
          this.elem.style.transform = `rotate(${this.body.angle}rad)`
        }
      }
      // TODO: make whole DOM top, left border
      const ground = Matter.Bodies.rectangle(
        200, 200, 400, 120, { isStatic: true }
      )
      // TODO: allow selectors to add none static elements to Bodies
      const mouseConstraint = Matter.MouseConstraint.create(this.engine, { element: document.body })
      Matter.World.add(this.engine.world, [this.box.body, ground, mouseConstraint]);
      // TODO: make event listener to have bodies registered at world (Bodies)
    })

    // this event listener can only be added once the loadDependency and its internal requirements were initialzed
    this.timeEventListener = event => {
      if (!!event.detail.time) {
        this.box.render() // TODO: this will be done on the box web component or here globally
        this.Matter.Engine.update(this.engine)
      }
    }
  }

  connectedCallback () {
    this.loadDependency().then(Matter => this.timeEventTarget.addEventListener(this.getAttribute('time') || 'time', this.timeEventListener))
  }

  disconnectedCallback () {
    this.timeEventTarget.removeEventListener(this.getAttribute('time') || 'time', this.timeEventListener)
  }

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

  get timeEventTarget () {
    return this.hasAttribute('time-event-target-selector') ? document.body.querySelector(this.getAttribute('time-event-target-selector')) || this : this
  }
}
