// @vitest-environment jsdom

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
  vi.resetModules()
})

test('keeps cookies in memory when localStorage persistence fails', async () => {
  const storageError = new DOMException(
    'The quota has been exceeded.',
    'QuotaExceededError',
  )

  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw storageError
  })
  vi.spyOn(console, 'warn').mockImplementation(() => void 0)

  const { cookieStore } = await import('./cookieStore')

  await expect(
    cookieStore.setCookie('sessionId=abc; Path=/', 'http://localhost/user'),
  ).resolves.toBeUndefined()

  const cookies = cookieStore.getCookies('http://localhost/user') as Array<{
    key: string
    value: string
  }>

  expect(cookies.map((cookie) => [cookie.key, cookie.value])).toEqual([
    ['sessionId', 'abc'],
  ])
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('[MSW] Failed to persist cookies to localStorage.'),
  )
  expect(console.warn).toHaveBeenCalledWith(
    expect.stringContaining('QuotaExceededError'),
  )
})
