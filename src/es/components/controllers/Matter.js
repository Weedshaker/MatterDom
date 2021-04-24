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
  connectedCallback () {
    this.getMatter().then(Matter => {
      const engine = Matter.Engine.create()
      const box = {
        body: Matter.Bodies.rectangle(150, 0, 40, 40),
        elem: document.querySelector('#box'),
        render: function () {
          const { x, y } = this.body.position
          this.elem.style.top = `${y - 20}px`
          this.elem.style.left = `${x - 20}px`
          this.elem.style.transform = `rotate(${this.body.angle}rad)`
        }
      }
      const ground = Matter.Bodies.rectangle(
        200, 200, 400, 120, { isStatic: true }
      )
      const mouseConstraint = Matter.MouseConstraint.create(engine, { element: document.body })
      Matter.World.add(engine.world, [box.body, ground, mouseConstraint]);
      (function rerender () {
        box.render()
        Matter.Engine.update(engine)
        requestAnimationFrame(rerender)
      })()
    })
  }

  getMatter () {
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
}
