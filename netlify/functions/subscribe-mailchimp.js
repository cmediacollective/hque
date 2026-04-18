exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' }

  const { email, firstName, lastName } = JSON.parse(event.body)
  if (!email) return { statusCode: 400, body: JSON.stringify({ error: 'Email required' }) }

  const API_KEY = process.env.MAILCHIMP_API_KEY
  const LIST_ID = process.env.MAILCHIMP_LIST_ID
  const DC = API_KEY.split('-')[1]

  const response = await fetch(`https://${DC}.api.mailchimp.com/3.0/lists/${LIST_ID}/members`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${Buffer.from(`anystring:${API_KEY}`).toString('base64')}`
    },
    body: JSON.stringify({
      email_address: email,
      status: 'subscribed',
      tags: ['hque-chatbot', 'landing-page']
    })
  })

  const data = await response.json()
  if (response.ok || data.title === 'Member Exists') {
    return { statusCode: 200, body: JSON.stringify({ success: true }) }
  }
  return { statusCode: 400, body: JSON.stringify({ error: data.detail }) }
}
