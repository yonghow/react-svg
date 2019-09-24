import {
  BeforeEach,
  Errback,
  EvalScripts,
  SVGInjector
} from '@tanem/svg-injector'
import * as PropTypes from 'prop-types'
import * as React from 'react'
import ReactDOMServer from 'react-dom/server'
import shallowDiffers from './shallow-differs'

type WrapperType = HTMLSpanElement | HTMLDivElement

interface Props {
  afterInjection?: Errback
  beforeInjection?: BeforeEach
  evalScripts?: EvalScripts
  fallback?: React.ReactType
  loading?: React.ReactType
  renumerateIRIElements?: boolean,
  withCredentials?: boolean,
  src: string
  wrapper?: 'div' | 'span'
}

interface State {
  hasError: boolean
  isLoading: boolean
}

export default class ReactSVG extends React.Component<
  Props &
    React.DetailedHTMLProps<React.HTMLAttributes<WrapperType>, WrapperType>,
  State
> {
  static defaultProps = {
    afterInjection: () => undefined,
    beforeInjection: () => undefined,
    evalScripts: 'never',
    fallback: null,
    loading: null,
    renumerateIRIElements: true,
    wrapper: 'div'
  }

  static propTypes = {
    afterInjection: PropTypes.func,
    beforeInjection: PropTypes.func,
    evalScripts: PropTypes.oneOf(['always', 'once', 'never']),
    fallback: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.object,
      PropTypes.string
    ]),
    loading: PropTypes.oneOfType([
      PropTypes.func,
      PropTypes.object,
      PropTypes.string
    ]),
    renumerateIRIElements: PropTypes.bool,
    src: PropTypes.string.isRequired,
    wrapper: PropTypes.oneOf(['div', 'span'])
  }

  initialState = {
    hasError: false,
    isLoading: true
  }

  state = this.initialState

  _isMounted = false

  container?: WrapperType | null

  svgWrapper?: WrapperType | null

  refCallback = (container: WrapperType | null) => {
    this.container = container
  }

  renderSVG() {
    /* istanbul ignore else */
    if (this.container instanceof Node) {
      const {
        beforeInjection,
        evalScripts,
        renumerateIRIElements,
        src,
        withCredentials
      } = this.props

      /* eslint-disable @typescript-eslint/no-non-null-assertion */
      const afterInjection = this.props.afterInjection!
      const Wrapper = this.props.wrapper!
      /* eslint-enable @typescript-eslint/no-non-null-assertion */

      const wrapper = document.createElement(Wrapper)
      wrapper.innerHTML = ReactDOMServer.renderToStaticMarkup(
        <Wrapper>
          <Wrapper data-src={src} />
        </Wrapper>
      )

      this.svgWrapper = this.container.appendChild(
        wrapper.firstChild as WrapperType
      )

      const afterEach: Errback = (error, svg) => {
        if (error) {
          this.removeSVG()
        }

        // TODO: It'd be better to cleanly unsubscribe from SVGInjector
        // callbacks instead of tracking a property like this.
        if (this._isMounted) {
          this.setState(
            () => ({
              hasError: !!error,
              isLoading: false
            }),
            () => {
              afterInjection(error, svg)
            }
          )
        }
      }

      SVGInjector(this.svgWrapper.firstChild as WrapperType, {
        afterEach,
        beforeEach: beforeInjection,
        evalScripts,
        renumerateIRIElements,
        withCredentials
      })
    }
  }

  removeSVG() {
    if (this.container instanceof Node && this.svgWrapper instanceof Node) {
      this.container.removeChild(this.svgWrapper)
      this.svgWrapper = null
    }
  }

  componentDidMount() {
    this._isMounted = true
    this.renderSVG()
  }

  componentDidUpdate(prevProps: Props) {
    if (shallowDiffers(prevProps, this.props)) {
      this.setState(
        () => this.initialState,
        () => {
          this.removeSVG()
          this.renderSVG()
        }
      )
    }
  }

  componentWillUnmount() {
    this._isMounted = false
    this.removeSVG()
  }

  render() {
    /* eslint-disable @typescript-eslint/no-unused-vars */
    const {
      afterInjection,
      beforeInjection,
      evalScripts,
      fallback: Fallback,
      loading: Loading,
      renumerateIRIElements,
      src,
      wrapper,
      ...rest
    } = this.props
    /* eslint-enable @typescript-eslint/no-unused-vars */

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const Wrapper = wrapper!

    return (
      <Wrapper {...rest} ref={this.refCallback}>
        {this.state.isLoading && Loading && <Loading />}
        {this.state.hasError && Fallback && <Fallback />}
      </Wrapper>
    )
  }
}
