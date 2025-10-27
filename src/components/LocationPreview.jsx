import React from 'react'
import { getLocationPreview } from '../lib/locationAssets'

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

export default function LocationPreview({ location, open, onClose }) {
  const modalRef = React.useRef(null)
  const closeButtonRef = React.useRef(null)
  const previousFocusRef = React.useRef(null)
  const previousOverflowRef = React.useRef(null)
  const headingId = React.useId()

  React.useEffect(() => {
    if (!open) return undefined

    previousFocusRef.current =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null

    if (typeof document !== 'undefined') {
      previousOverflowRef.current = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    }

    const getFocusable = () => {
      if (!modalRef.current) return []
      return Array.from(modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
        el => !el.hasAttribute('disabled')
      )
    }

    const focusables = getFocusable()
    const initialFocus = focusables[0] || closeButtonRef.current
    if (initialFocus && typeof initialFocus.focus === 'function') {
      window.requestAnimationFrame(() => initialFocus.focus())
    }

    const handleKeyDown = event => {
      if (!open) return
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
        return
      }
      if (event.key !== 'Tab') return
      const items = getFocusable()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (event.shiftKey) {
        if (active === first || !modalRef.current?.contains(active)) {
          event.preventDefault()
          last.focus()
        }
      } else if (active === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (typeof document !== 'undefined') {
        document.body.style.overflow = previousOverflowRef.current || ''
      }
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus()
      }
    }
  }, [open, onClose])

  const handleBackdropMouseDown = event => {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  if (!open || !location) return null

  const info = getLocationPreview(location)
  const facts = Array.isArray(info?.facts) ? info.facts.filter(Boolean) : []
  const photoStyle = info?.image
    ? {
        backgroundImage: `linear-gradient(0deg, rgba(17,24,39,0.35), rgba(17,24,39,0.1)), url(${info.image})`,
      }
    : {
        background: 'linear-gradient(135deg, rgba(59,130,246,0.45), rgba(37,99,235,0.65))',
      }

  return (
    <div
      className="location-modal-backdrop"
      role="presentation"
      onMouseDown={handleBackdropMouseDown}
    >
      <div
        className="location-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        ref={modalRef}
        onMouseDown={event => event.stopPropagation()}
      >
        <button
          type="button"
          className="location-modal-close"
          onClick={onClose}
          aria-label="Close location details"
          ref={closeButtonRef}
        >
          <span aria-hidden="true">×</span>
        </button>
        <div className="location-modal-body">
          <div className="location-modal-photo" style={photoStyle} aria-hidden="true" />
          <div className="location-modal-content">
            <h3 id={headingId}>{info?.name || location}</h3>
            {(info?.address || info?.mapUrl) && (
              <p className="location-modal-address">
                {info?.address || 'Address coming soon'}
                {info?.mapUrl && (
                  <>
                    {' · '}
                    <a
                      href={info.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="location-modal-link"
                    >
                      Open in Maps
                    </a>
                  </>
                )}
              </p>
            )}
            {facts.length > 0 && (
              <ul className="location-modal-facts">
                {facts.map(fact => (
                  <li key={fact}>{fact}</li>
                ))}
              </ul>
            )}
            <p className="location-modal-description">
              {info?.description || 'Facility details will be added soon.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
