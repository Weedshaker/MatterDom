import {Shadow} from '../prototypes/Shadow.js'

export const BodiesYjs = (ChosenHTMLElement = Shadow()) => class BodiesYjs extends ChosenHTMLElement {
  /**
   * Creates an instance of yjs users. The constructor will be called for every custom element using this class when initially created.
   *
   * @param {options} [options = {namespace=undefined}]
   * @param {*} args
   */
  constructor (options = { namespace: undefined }, ...args) {
    super(...args)

    // set attribute namespace
    if (options.namespace) this.namespace = options.namespace
    else if (!this.namespace) this.namespace = 'yjs-'

    this.awarenessChangeEventListenerOnce = event => {
      this.uidResolve(`b_${JSON.parse(event.detail.uid).uuid}`)
      this.awarenessChangeEventListenerOnce = () => {}
    }

    this.awarenessChangeEventListener = this.awarenessUpdateEventListener = event => this.awarenessChangeEventListenerOnce(event)

    this.objsObserveEventListener = async event => {
      const uid = await this.uid
      Array.from(event.detail.type).map(([key, body]) => {
        if (key !== uid) this.dispatchEvent(new CustomEvent(this.getAttribute('matter-not-self-body') || 'matter-not-self-body', {
          detail: {
            key,
            body
          },
          bubbles: true,
          cancelable: true,
          composed: true
        }))
      })
    }

    this.matterSelfBodyEventListener = async event => {
      const yMap = (await this.yMap).type
      yMap.set(await this.uid, event.detail.body)
    }

    /** @type {(any)=>void} */
    this.uidResolve = map => map
    /** @type {Promise<string>} */
    this.uid = new Promise(resolve => (this.uidResolve = resolve))

    /** @type {(any)=>void} */
    this.yMapResolve = map => map
    /** @type {Promise<{type: import("../dependencies/yjs").Map}>} */
    this.yMap = new Promise(resolve => (this.yMapResolve = resolve))
  }

  connectedCallback () {
    document.body.addEventListener(`${this.namespace}websocket-awareness-change`, this.awarenessChangeEventListener, {once: true})
    document.body.addEventListener(`${this.namespace}webrtc-awareness-change`, this.awarenessChangeEventListener, {once: true})
    document.body.addEventListener(`${this.namespace}websocket-awareness-update`, this.awarenessUpdateEventListener, {once: true})
    document.body.addEventListener(`${this.namespace}webrtc-awareness-update`, this.awarenessUpdateEventListener, {once: true})
    document.body.addEventListener(`${this.namespace}bodies-observe`, this.objsObserveEventListener)
    document.body.addEventListener('matter-self-body', this.matterSelfBodyEventListener)
    if (this.isConnected) this.connectedCallbackOnce()
  }

  connectedCallbackOnce () {
    this.dispatchEvent(new CustomEvent(`${this.namespace}doc`, {
      detail: {
        command: 'getMap',
        arguments: ['objs'],
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
    document.body.removeEventListener(`${this.namespace}websocket-awareness-change`, this.awarenessChangeEventListener)
    document.body.removeEventListener(`${this.namespace}webrtc-awareness-change`, this.awarenessChangeEventListener)
    document.body.removeEventListener(`${this.namespace}websocket-awareness-update`, this.awarenessUpdateEventListener)
    document.body.removeEventListener(`${this.namespace}webrtc-awareness-update`, this.awarenessUpdateEventListener)
    document.body.removeEventListener(`${this.namespace}bodies-observe`, this.objsObserveEventListener)
    document.body.removeEventListener('matter-self-body', this.matterSelfBodyEventListener)
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
