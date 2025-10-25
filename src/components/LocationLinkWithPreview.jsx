import React from 'react'
import { createPortal } from 'react-dom'
import { useFloating, offset, flip, shift, autoUpdate } from '@floating-ui/react-dom'
import { getLocationPreview } from '../lib/locationAssets'

const GAP = 8
const VIEWPORT_PADDING = 8

function buildFallbackStyle(location) {
  const seed = Array.from(location || '').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const hue = seed % 360
  return {
    background: `linear-gradient(135deg, hsla(${hue}, 65%, 60%, 0.85), hsla(${(hue + 48) % 360}, 70%, 55%, 0.85))`,
  }
}

export default function LocationLinkWithPreview({
  location,
  onClick,
  dialogOpen,
  className,
}) {
  const [showHoverOverlay, setShowHoverOverlay] = React.useState(false)
  const [hasInteracted, setHasInteracted] = React.useState(false)
  const hoverTimeoutRef = React.useRef(null)
  const [portalNode, setPortalNode] = React.useState(null)
  const overlayId = React.useId()
  const [arrowLeft, setArrowLeft] = React.useState(20)

  const info = React.useMemo(() => getLocationPreview(location), [location])

  const isTouchDevice = React.useMemo(() => {
    if (typeof window === 'undefined') return true
    const hasFinePointer = window.matchMedia && window.matchMedia('(pointer: fine)').matches
    if (hasFinePointer) return false
    if (typeof navigator === 'undefined') return true
    const maxTouch = navigator.maxTouchPoints || navigator.msMaxTouchPoints || 0
    return ('ontouchstart' in window && maxTouch > 0) || maxTouch > 0
  }, [])

  const { x, y, strategy, refs, placement } = useFloating({
    placement: 'top-start',
    strategy: 'fixed',
    middleware: [
      offset(GAP),
      flip({
        fallbackPlacements: ['bottom-start', 'bottom'],
        padding: VIEWPORT_PADDING,
      }),
      shift({ padding: VIEWPORT_PADDING }),
    ],
    whileElementsMounted: autoUpdate,
  })

  React.useEffect(() => {
    setPortalNode(typeof document !== 'undefined' ? document.body : null)
  }, [])

  React.useEffect(() => {
    return () => {
      clearTimeout(hoverTimeoutRef.current)
    }
  }, [])

  React.useEffect(() => {
    if (!showHoverOverlay) return undefined
    const handleScroll = () => setShowHoverOverlay(false)
    window.addEventListener('scroll', handleScroll, true)
    return () => window.removeEventListener('scroll', handleScroll, true)
  }, [showHoverOverlay])

  const clearHoverTimeout = React.useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }
  }, [])

  React.useEffect(() => {
    if (dialogOpen) {
      clearHoverTimeout()
      setShowHoverOverlay(false)
    }
  }, [dialogOpen, clearHoverTimeout])

  React.useEffect(() => {
    clearHoverTimeout()
    setShowHoverOverlay(false)
  }, [location, clearHoverTimeout])

  React.useEffect(() => {
    if (!showHoverOverlay || !refs.reference.current || !refs.floating.current) return
    const referenceRect = refs.reference.current.getBoundingClientRect()
    const overlayRect = refs.floating.current.getBoundingClientRect()

    const referenceCenter = referenceRect.left + referenceRect.width / 2
    const rawLeft = referenceCenter - overlayRect.left
    const clamped =
      Math.max(16, Math.min(rawLeft, overlayRect.width - 16))

    setArrowLeft(clamped)
  }, [showHoverOverlay, refs.reference, refs.floating, x, y, placement, location])

  const handleMouseEnter = React.useCallback(() => {
    if (isTouchDevice) return
    clearHoverTimeout()
    hoverTimeoutRef.current = setTimeout(() => {
      setHasInteracted(true)
      setShowHoverOverlay(true)
    }, 300)
  }, [clearHoverTimeout, isTouchDevice])

  const handleMouseLeave = React.useCallback(() => {
    clearHoverTimeout()
    setShowHoverOverlay(false)
  }, [clearHoverTimeout])

  const handleFocus = React.useCallback(() => {
    if (isTouchDevice) return
    clearHoverTimeout()
    hoverTimeoutRef.current = setTimeout(() => {
      setHasInteracted(true)
      setShowHoverOverlay(true)
    }, 300)
  }, [clearHoverTimeout, isTouchDevice])

  const handleBlur = React.useCallback(() => {
    clearHoverTimeout()
    setShowHoverOverlay(false)
  }, [clearHoverTimeout])

  const handleClick = React.useCallback(
    event => {
      event.preventDefault()
      clearHoverTimeout()
      setShowHoverOverlay(false)
      onClick?.(event)
    },
    [clearHoverTimeout, onClick]
  )

  const referenceRef = React.useCallback(
    node => {
      refs.setReference(node)
    },
    [refs]
  )

  const floatingRef = React.useCallback(
    node => {
      refs.setFloating(node)
    },
    [refs]
  )

  const photoStyle = React.useMemo(() => {
    if (info?.image) {
      return {
        backgroundImage: `linear-gradient(0deg, rgba(17,24,39,0.35), rgba(17,24,39,0.05)), url(${info.image})`,
      }
    }
    return buildFallbackStyle(location)
  }, [info, location])

  return (
    <>
      <button
        type="button"
        className={className}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleClick}
        aria-haspopup="dialog"
        aria-describedby={showHoverOverlay ? overlayId : undefined}
        ref={referenceRef}
      >
        {location}
      </button>
      {portalNode &&
        hasInteracted &&
        showHoverOverlay &&
        createPortal(
          <div
            ref={floatingRef}
            role="tooltip"
            id={overlayId}
            className="location-hover-overlay"
            data-placement={placement}
            style={{
              position: strategy,
              top: y ?? 0,
              left: x ?? 0,
              pointerEvents: 'none',
              zIndex: 900,
              '--hover-overlay-arrow-left': `${arrowLeft}px`,
            }}
          >
            <div className="location-hover-photo" style={photoStyle} aria-hidden="true" />
            <div className="location-hover-name">{info?.name || location}</div>
            <p className="location-hover-hint">Click for details</p>
          </div>,
          portalNode
        )}
    </>
  )
}
