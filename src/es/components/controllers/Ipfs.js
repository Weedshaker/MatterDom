// @ts-check

/* global self */

/***
 * https://github.com/ipfs/js-ipfs
 * https://github.com/ipfs/js-ipfs#documentation
 * https://www.youtube.com/watch?v=Nv_Teb--1zg
 * 
 * https://github.com/ipfs-shipyard/ipfs-pubsub-room
 * // troubles, continue... here first: https://github.com/ipfs-shipyard/ipfs-pubsub-room-demo
 * https://github.com/libp2p/research-pubsub
 * https://github.com/ipfs-shipyard/ipfs-pubsub-room
 * https://discuss.ipfs.io/t/pubsub-nodes-not-connecting-js-libp2p-webrtc-star/8617/4
 * https://github.com/libp2p/js-libp2p-examples/tree/master/chat/nodejs
 *
 * @export
 * @class Ipfs
 * @type {CustomElementConstructor}
 */
export default class Ipfs extends HTMLElement {
  // TODO: querySelectorAll function for dom none web components to be added to Ipfs engine
  constructor () {
    super()

    this.getIpfsNode = this.loadIpfs().then(Ipfs => Ipfs.create({
      repo: this.repo(),
      EXPERIMENTAL: {
        pubsub: true
      }
    }))
    this.getIpfsNode.then(node => this.loadIpfsPubsubRoom().then(IpfsPubsubRoom => {
      console.log('node', node.id().then((error, info) => console.log('id', error, info)))
      const room = new IpfsPubsubRoom(node, 'hello-world-abdcddaer')
      room.on('peer joined', (peer) => {
        console.log('Peer joined the room', peer)
      })
      room.on('peer left', (peer) => {
        console.log('Peer left...', peer)
      })
      // now started to listen to room
      room.on('subscribed', () => {
        console.log('Now connected!')
      })
      self.room = room
      console.log('room', room, room.getPeers());
    }))
  }

  connectedCallback () {

  }

  disconnectedCallback () {
    
  }

  /**
   * fetch dependency
   *
   * @returns {Promise<{Ipfs: any}>}
   */
  loadIpfs () {
    return this.ipfsPromise || (this.ipfsPromise = new Promise(resolve => {
      // needs markdown
      if ('Ipfs' in self === true) {
        resolve(self.Ipfs) // eslint-disable-line
      } else {
        const IpfsScript = document.createElement('script')
        IpfsScript.setAttribute('type', 'text/javascript')
        IpfsScript.setAttribute('async', '')
        IpfsScript.setAttribute('src', 'https://cdn.jsdelivr.net/npm/ipfs/dist/index.min.js')
        IpfsScript.onload = () => {
          if ('Ipfs' in self === true) resolve(self.Ipfs) // eslint-disable-line
        }
        this.appendChild(IpfsScript)
      }
    }))
  }

  /**
   * fetch dependency
   *
   * @returns {Promise<{Ipfs: any}>}
   */
  loadIpfsPubsubRoom () {
    return this.ipfsPubsubRoomPromise || (this.ipfsPubsubRoomPromise = new Promise(resolve => {
      // needs markdown
      if ('IpfsPubsubRoom' in self === true) {
        resolve(self.IpfsPubsubRoom) // eslint-disable-line
      } else {
        const IpfsPubsubRoomScript = document.createElement('script')
        IpfsPubsubRoomScript.setAttribute('type', 'text/javascript')
        IpfsPubsubRoomScript.setAttribute('async', '')
        IpfsPubsubRoomScript.setAttribute('src', './es/libs/ipfs-pubsub-room.index.min.js')
        IpfsPubsubRoomScript.onload = () => {
          if ('IpfsPubsubRoom' in self === true) resolve(self.IpfsPubsubRoom) // eslint-disable-line
        }
        this.appendChild(IpfsPubsubRoomScript)
      }
    }))
  }

  repo () {
    return 'ipfs/pubsub-demo/' + Math.random()
  }
}
