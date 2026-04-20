import React from 'react'

const URL_REGEX = /((https?:\/\/|www\.)[^\s<>"]+|[\w.-]+@[\w-]+\.[\w.-]+)/gi

export default function Linkify({ text, linkColor = '#5b7c99' }) {
  if (!text) return null

  const segments = []
  let lastIndex = 0
  let match
  URL_REGEX.lastIndex = 0

  while ((match = URL_REGEX.exec(text)) !== null) {
    const matched = match[0]
    const index = match.index

    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    const isEmail = matched.includes('@') && !matched.startsWith('http')
    let href = matched
    if (isEmail) {
      href = 'mailto:' + matched
    } else if (matched.startsWith('www.')) {
      href = 'https://' + matched
    }

    segments.push({ type: 'link', value: matched, href, isEmail })
    lastIndex = index + matched.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return (
    <>
      {segments.map((seg, i) => {
        if (seg.type === 'text') return <React.Fragment key={i}>{seg.value}</React.Fragment>
        return (
          
            key={i}
            href={seg.href}
            target={seg.isEmail ? undefined : '_blank'}
            rel={seg.isEmail ? undefined : 'noopener noreferrer'}
            onClick={e => e.stopPropagation()}
            style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-word' }}>
            {seg.value}
          </a>
        )
      })}
    </>
  )
}
