import React from 'react'

// Matches http(s)://, www., bare domains, and email addresses
const URL_REGEX = /((https?:\/\/|www\.)[^\s<>"]+|[\w.-]+@[\w-]+\.[\w.-]+)/gi

export default function Linkify({ text, linkColor = '#5b7c99' }) {
  if (!text) return null

  const parts = []
  let lastIndex = 0
  let match
  let keyCounter = 0

  URL_REGEX.lastIndex = 0

  while ((match = URL_REGEX.exec(text)) !== null) {
    const matched = match[0]
    const index = match.index

    if (index > lastIndex) {
      parts.push(text.slice(lastIndex, index))
    }

    const isEmail = matched.includes('@') && !matched.startsWith('http')
    let href = matched
    if (isEmail) {
      href = 'mailto:' + matched
    } else if (matched.startsWith('www.')) {
      href = 'https://' + matched
    }

    parts.push(
      
        key={'link-' + keyCounter++}
        href={href}
        target={isEmail ? undefined : '_blank'}
        rel={isEmail ? undefined : 'noopener noreferrer'}
        onClick={e => e.stopPropagation()}
        style={{ color: linkColor, textDecoration: 'underline', wordBreak: 'break-word' }}>
        {matched}
      </a>
    )

    lastIndex = index + matched.length
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return <>{parts}</>
}
