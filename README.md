# MatterDom

Use Matter.js Physics Engine in the DOM with Web Components in an Event Driven Architecture

## TODO

1. Matter.js "this.box = { check" evaluate following options (done globally vs. done at web component)
  - done globally as for other none web component elements (static physics) looping through list on time tick event
  - done at web component after sending create event, get returned their body getters and on time tick event update their coordinates by reading transform string from getter
1. Matter.js in Web Worker test https://github.com/liabru/matter-js/issues/662