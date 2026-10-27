// @ts-check


export default class Bodies extends HTMLElement {
  /**
   * Creates an instance of yjs users. The constructor will be called for every custom element using this class when initially created.
   *
   * @param {any} [options = {namespace=undefined}]
   * @param {*} args
   */
  constructor (options = { namespace: undefined }, ...args) {
    super()

    // set attribute namespace
    if (options.namespace) this.namespace = options.namespace
    else if (!this.namespace) this.namespace = 'yjs-'

    this.awarenessChangeEventListenerOnce = event => {
      document.body.removeEventListener(`${this.namespace}websocket-awareness-change`, this.awarenessChangeEventListenerOnce)
      document.body.removeEventListener(`${this.namespace}webrtc-awareness-change`, this.awarenessChangeEventListenerOnce)
      document.body.removeEventListener(`${this.namespace}websocket-awareness-update`, this.awarenessChangeEventListenerOnce)
      document.body.removeEventListener(`${this.namespace}webrtc-awareness-update`, this.awarenessChangeEventListenerOnce)
      this.awarenessChangeEventListenerOnce = () => {}
      this.uidResolve(`b_${JSON.parse(event.detail.uid).uuid}`)
    }

    this.bodiesObserveEventListener = async event => {
      const uid = await this.uid
      const keys = Array.from(event.detail.yjsEvent?.[0]?.changes?.keys || []).reduce((acc, [key]) => {
        if (!event.detail.type.has(key)) return acc
        const yjsBody = event.detail.type.get(key)
        if (yjsBody.uid === uid || yjsBody.ctrl?.uid === uid) return acc
        acc.push(key)
        return acc
      }, [])
      if (keys.length) {
        const uid = await this.uid
        this.dispatchEvent(new CustomEvent(this.getAttribute(`${this.namespace}bodies`) || `${this.namespace}bodies`, {
          detail: {
            keys: keys.map(key => ({
              key,
              isSelf: key === uid,
              getBody: () => event.detail.type.get(key)
            }))
          },
          bubbles: true,
          cancelable: true,
          composed: true
        }))
      }
    }

    /** @type {Map<string, any>} */
    const bodyEvents = new Map()
    let animationFrameId = null
    this.setBodyEventListener = async event => {
      // TODO: also sync static bodies
      // don't deal with other user bodies as well as with static bodies
      if (!event.detail.isSelf && (event.detail.body.isStatic || event.detail.body.uid)) return
      const body = event.detail.body
      let uid
      if (event.detail.isSelf) {
        bodyEvents.set(body.uid || body.oid, body)
        if (!animationFrameId) animationFrameId = self.requestAnimationFrame(timestamp => _setBody())
      } else if (
        (uid = await this.uid) && (
        !event.detail.webComponent.yjsBody.ctrl
        || event.detail.webComponent.yjsBody.ctrl.uid === uid
        || (body.collisions.some(collision => collision.uid === uid) && body.collisions.every(collision => collision.uid !== event.detail.webComponent.yjsBody.ctrl.uid))
        || event.detail.webComponent.yjsBody.ctrl.timestamp + 1000 < Date.now()
      )) {
        // all bodies without a uid
        event.detail.webComponent.yjsBody.ctrl = body.ctrl = {
          uid,
          timestamp: Date.now()
        }
        bodyEvents.set(body.uid || body.oid, body)
        if (!animationFrameId) animationFrameId = self.requestAnimationFrame(timestamp => _setBody())
      }
    }
    const _setBody = async () => {
      if (!bodyEvents.size) return
      const {type: yMap, doc} = await this.yMap
      doc.transact(() => Array.from(bodyEvents).forEach(([key, value]) => yMap.set(key, value)))
      bodyEvents.clear()
      animationFrameId = null
    }

    this.removeBodyEventListener = async event => {
      // TODO: Decide how to handle !isSelf elements
      if (!event.detail.isSelf) return
      const yMap = (await this.yMap).type
      // TODO: add remove capabilities
      //yMap.remove(event.detail.body.uid || event.detail.body.oid)
    }

    /** @type {(any)=>void} */
    this.uidResolve = map => map
    /** @type {Promise<string>} */
    this.uid = new Promise(resolve => (this.uidResolve = resolve))
    this.uid.then(uid => this.dispatchEvent(new CustomEvent(this.getAttribute(`${this.namespace}self-uid`) || `${this.namespace}self-uid`, {
      detail: {
        uid
      },
      bubbles: true,
      cancelable: true,
      composed: true
    })))

    /** @type {(any)=>void} */
    this.yMapResolve = map => map
    /** @type {Promise<{type: import("../../event-driven-web-components-yjs/src/es/dependencies/yjs").Map, doc: import("../../event-driven-web-components-yjs/src/es/dependencies/yjs").Doc}>} */
    this.yMap = new Promise(resolve => (this.yMapResolve = resolve))
  }

  connectedCallback () {
    document.body.addEventListener(`${this.namespace}websocket-awareness-change`, this.awarenessChangeEventListenerOnce, {once: true})
    document.body.addEventListener(`${this.namespace}webrtc-awareness-change`, this.awarenessChangeEventListenerOnce, {once: true})
    document.body.addEventListener(`${this.namespace}websocket-awareness-update`, this.awarenessChangeEventListenerOnce, {once: true})
    document.body.addEventListener(`${this.namespace}webrtc-awareness-update`, this.awarenessChangeEventListenerOnce, {once: true})
    document.body.addEventListener(`${this.namespace}bodies-observe`, this.bodiesObserveEventListener)
    document.body.addEventListener(`${this.namespace}set-body`, this.setBodyEventListener)
    document.body.addEventListener(`${this.namespace}remove-body`, this.removeBodyEventListener)
    if (this.isConnected) this.connectedCallbackOnce()
  }

  connectedCallbackOnce () {
    this.dispatchEvent(new CustomEvent(`${this.namespace}doc`, {
      detail: {
        command: 'getMap',
        arguments: ['bodies'],
        observe: `${this.namespace}bodies-observe`,
        observeDeep: true,
        resolve: this.yMapResolve
      },
      bubbles: true,
      cancelable: true,
      composed: true
    }))
    this.connectedCallbackOnce = () => {}
  }

  disconnectedCallback () {
    document.body.removeEventListener(`${this.namespace}websocket-awareness-change`, this.awarenessChangeEventListenerOnce)
    document.body.removeEventListener(`${this.namespace}webrtc-awareness-change`, this.awarenessChangeEventListenerOnce)
    document.body.removeEventListener(`${this.namespace}websocket-awareness-update`, this.awarenessChangeEventListenerOnce)
    document.body.removeEventListener(`${this.namespace}webrtc-awareness-update`, this.awarenessChangeEventListenerOnce)
    document.body.removeEventListener(`${this.namespace}bodies-observe`, this.bodiesObserveEventListener)
    document.body.removeEventListener(`${this.namespace}set-body`, this.setBodyEventListener)
    document.body.removeEventListener(`${this.namespace}remove-body`, this.removeBodyEventListener)
  }

  /**
   * The namespace is prepended to the custom event names
   * priority of value appliance: options, attribute
   *
   * @param {string} value
   */
  set namespace (value) {
    if (value) this.setAttribute('namespace', value)
  }

  /**
   * @return {string}
   */
  get namespace () {
    // @ts-ignore
    return this.getAttribute('namespace')
  }
}
