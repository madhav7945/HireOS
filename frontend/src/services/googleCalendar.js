// Google Calendar API integration
// Free tier: 1,000,000 queries/day
// Setup: https://console.cloud.google.com → APIs & Services → Enable "Google Calendar API"
// Create OAuth 2.0 Client ID (Web application) → Add http://localhost:5173 and your domain as authorized origins

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events'
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'

let tokenClient = null
let gapiInited = false
let gisInited = false

// Load the Google API script dynamically
function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return }
    const script = document.createElement('script')
    script.src = src
    script.onload = resolve
    script.onerror = reject
    document.head.appendChild(script)
  })
}

export async function initGoogleCalendar() {
  if (!CLIENT_ID || !API_KEY) {
    console.warn('Google Calendar not configured. Set VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY in .env')
    return false
  }

  try {
    // Load GAPI
    await loadScript('https://apis.google.com/js/api.js')
    await new Promise((resolve) => {
      window.gapi.load('client', resolve)
    })
    await window.gapi.client.init({
      apiKey: API_KEY,
      discoveryDocs: [DISCOVERY_DOC],
    })
    gapiInited = true

    // Load GIS (Google Identity Services)
    await loadScript('https://accounts.google.com/gsi/client')
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: () => {}, // will be overridden per-call
    })
    gisInited = true

    return true
  } catch (err) {
    console.error('Failed to initialize Google Calendar:', err)
    return false
  }
}

export function isGoogleCalendarConfigured() {
  return !!(CLIENT_ID && API_KEY)
}

export function isGoogleCalendarReady() {
  return gapiInited && gisInited
}

// Prompt user to sign in and get access token
export function signInGoogle() {
  return new Promise((resolve, reject) => {
    if (!tokenClient) { reject(new Error('Google not initialized')); return }
    tokenClient.callback = (resp) => {
      if (resp.error) { reject(resp); return }
      resolve(resp)
    }
    if (window.gapi.client.getToken() === null) {
      tokenClient.requestAccessToken({ prompt: 'consent' })
    } else {
      tokenClient.requestAccessToken({ prompt: '' })
    }
  })
}

export function signOutGoogle() {
  const token = window.gapi?.client?.getToken()
  if (token) {
    window.google.accounts.oauth2.revoke(token.access_token)
    window.gapi.client.setToken(null)
  }
}

export function isSignedIn() {
  return !!window.gapi?.client?.getToken()
}

// Fetch events from Google Calendar
export async function fetchGoogleEvents(timeMin, timeMax, calendarId = 'primary') {
  if (!gapiInited || !window.gapi.client.getToken()) return []

  try {
    const response = await window.gapi.client.calendar.events.list({
      calendarId,
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      showDeleted: false,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    })

    return (response.result.items || []).map(event => ({
      id: event.id,
      title: event.summary || '(No title)',
      description: event.description || '',
      start: new Date(event.start.dateTime || event.start.date),
      end: new Date(event.end.dateTime || event.end.date),
      color: event.colorId ? getGoogleColor(event.colorId) : '#4285F4',
      location: event.location || '',
      htmlLink: event.htmlLink,
      source: 'google',
      allDay: !event.start.dateTime,
      attendees: event.attendees || [],
    }))
  } catch (err) {
    console.error('Error fetching Google Calendar events:', err)
    return []
  }
}

// Create event on Google Calendar
export async function createGoogleEvent(eventData) {
  if (!gapiInited || !window.gapi.client.getToken()) throw new Error('Not signed in')

  const event = {
    summary: eventData.title,
    description: eventData.description || '',
    location: eventData.location || '',
    start: {
      dateTime: eventData.start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: eventData.end.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    attendees: eventData.attendees?.map(email => ({ email })) || [],
    reminders: { useDefault: true },
  }

  const response = await window.gapi.client.calendar.events.insert({
    calendarId: 'primary',
    resource: event,
    sendUpdates: 'all',
  })

  return response.result
}

// Delete event from Google Calendar
export async function deleteGoogleEvent(eventId, calendarId = 'primary') {
  if (!gapiInited || !window.gapi.client.getToken()) throw new Error('Not signed in')

  await window.gapi.client.calendar.events.delete({
    calendarId,
    eventId,
  })
}

// Fetch calendar list
export async function fetchGoogleCalendars() {
  if (!gapiInited || !window.gapi.client.getToken()) return []

  try {
    const response = await window.gapi.client.calendar.calendarList.list()
    return (response.result.items || []).map(cal => ({
      id: cal.id,
      name: cal.summary,
      color: cal.backgroundColor || '#4285F4',
      primary: cal.primary || false,
    }))
  } catch (err) {
    console.error('Error fetching calendars:', err)
    return []
  }
}

// Google Calendar color map
function getGoogleColor(colorId) {
  const colors = {
    '1': '#7986CB', '2': '#33B679', '3': '#8E24AA', '4': '#E67C73',
    '5': '#F6BF26', '6': '#F4511E', '7': '#039BE5', '8': '#616161',
    '9': '#3F51B5', '10': '#0B8043', '11': '#D50000',
  }
  return colors[colorId] || '#4285F4'
}
