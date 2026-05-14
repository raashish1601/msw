// @vitest-environment jsdom
import { getWorkerInstance } from './get-worker-instance'

it('returns an existing worker registration and ignores update failures', async () => {
  const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const update = vi.fn().mockRejectedValue(new Error('Update failed'))
  const getRegistrations = vi.fn().mockResolvedValue([
    {
      active: { scriptURL: 'http://localhost/mockServiceWorker.js' },
      update,
    } as unknown as ServiceWorkerRegistration,
  ])
  const register = vi.fn()

  const unhandledRejection = vi.fn()
  window.addEventListener('unhandledrejection', unhandledRejection)

  vi.stubGlobal('navigator', {
    ...navigator,
    serviceWorker: {
      controller: { scriptURL: 'http://localhost/mockServiceWorker.js' },
      getRegistrations,
      register,
    },
  })

  try {
    const result = await getWorkerInstance(
      '/mockServiceWorker.js',
      {},
      (_workerUrl, mockServiceWorkerUrl) => {
        return mockServiceWorkerUrl === 'http://localhost/mockServiceWorker.js'
      },
    )

    expect(result[0]).toEqual({
      scriptURL: 'http://localhost/mockServiceWorker.js',
    })
    expect(getRegistrations).toHaveBeenCalledTimes(1)
    expect(register).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledTimes(1)

    // Ensure async rejection from `update()` is handled internally.
    await Promise.resolve()
    expect(unhandledRejection).not.toHaveBeenCalled()
    expect(warnSpy).toHaveBeenCalledWith(`\
[MSW] Failed to update the Service Worker registration. The existing worker will be used instead.

Update failed`)
  } finally {
    window.removeEventListener('unhandledrejection', unhandledRejection)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  }
})
