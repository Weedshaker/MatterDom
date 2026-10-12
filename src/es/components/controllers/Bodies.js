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
      const keys = Array.from(event.detail.yjsEvent?.[0]?.changes?.keys || []).reduce((acc, [key]) => {
        if (!event.detail.type.has(key)) return acc
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

    this.setBodyEventListener = async event => {
      // TODO: Bundle the setting of yMap
      // TODO: check old value is different before setting the yMap
      // TODO: Throttle the setting of yMap generally
      // TODO: !isSelf shall only be set, when there was no updates from that body && not sleeping
      if (!event.detail.isSelf) return
      const yMap = (await this.yMap).type
      yMap.set(event.detail.isSelf
        ? await this.uid
        : event.detail.body.uid, event.detail.body)
    }

    this.removeBodyEventListener = async event => {
      // TODO: Decide how to handle !isSelf elements
      if (!event.detail.isSelf) return
      const yMap = (await this.yMap).type
      yMap.set(await this.uid, event.detail.body)
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
    /** @type {Promise<{type: import("../../event-driven-web-components-yjs/src/es/dependencies/yjs").Map}>} */
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
