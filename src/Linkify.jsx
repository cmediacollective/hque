import React from 'react'

const TOKEN_REGEX = /(https?:\/\/[^\s<>"]+|www\.[^\s<>"]+|[\w.-]+@[\w-]+\.[\w.-]+|@[\w.]+)/gi

export default function Linkify({ text, linkColor = '#5b7c99' }) {
  if (!text) return null

  const segments = []
  let lastIndex = 0
  let match
  TOKEN_REGEX.lastIndex = 0

  while ((match = TOKEN_REGEX.exec(text)) !== null) {
    const matched = match[0]
    const index = match.index

    if (index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, index) })
    }

    if (matched.startsWith('@')) {
      segments.push({ type: 'mention', value: matched })
    } else {
      const isEmail = matched.includes('@') && !matched.startsWith('http') && !matched.startsWith('www.')
      let href = matched
      if (isEmail) href = 'mailto:' + matched
      else if (matched.startsWith('www.')) href = 'https://' + matched
      segments.push({ type: 'link', value: matched, href, isEmail })
    }

    lastIndex = index + matched.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return React.createElement(React.Fragment, null,
    segments.map((seg, i) => {
      if (seg.type === 'text') return React.createElement(React.Fragment, { key: i }, seg.value)
      if (seg.type === 'mention') {
        return React.createElement('span', {
          key: i,
          title: seg.value,
          style: {
            color: linkColor,
            background: 'rgba(91, 124, 153, 0.15)',
            padding: '1px 6px',
            borderRadius: '3px',
            fontWeight: 500,
            whiteSpace: 'nowrap'
          }
        }, seg.value)
      }
      return React.createElement('a', {
        key: i,
        href: seg.href,
        target: seg.isEmail ? undefined : '_blank',
        rel: seg.isEmail ? undefined : 'noopener noreferrer',
        onClick: (e) => e.stopPropagation(),
        style: { color: linkColor, textDecoration: 'underline', wordBreak: 'break-word' }
      }, seg.value)
    })
  )
}
