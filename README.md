# MatterDom

Use Matter.js Physics Engine in the DOM with Web Components in an Event Driven Architecture

## TODO

1. Matter.js dynamic web component "this.box = { check" evaluate following options for coordinate updates (done globally vs. done at web component)
   - done globally as for other none web component elements (static physics) looping through list on time tick event
   - done at web component after sending create event, get returned their body getters and on time tick event update their coordinates by reading transform string from getter
1. Matter & Renderer FPS debug messure component compare following:
   - plain matter.js https://stackoverflow.com/questions/63906218/using-matter-js-to-render-to-the-dom-or-react
   - plain box2d https://bl.ocks.org/abernier/3411189
   - above each with web component and with web worker
3. time.js requestAnimationFrame best for getting time tick?
4. Matter update sync with timer and only execute when Matter.update finished
5. Matter.js load static dom elements
6. Matter.js in Web Worker test https://github.com/liabru/matter-js/issues/662
7. ipfs pubsub room for syncing https://www.youtube.com/watch?v=Nv_Teb--1zg
