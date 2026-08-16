type PromiseResolvers<T> = {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
}

type CompatiblePromiseConstructor = PromiseConstructor & {
  withResolvers?: <T>() => PromiseResolvers<T>
}

/** PDF.js bruker denne nyere API-en, mens blant annet Safari 17.3 mangler den. */
export function ensurePromiseWithResolvers() {
  const constructor = Promise as CompatiblePromiseConstructor
  if (constructor.withResolvers) return
  constructor.withResolvers = <T>() => {
    let resolve!: PromiseResolvers<T>['resolve']
    let reject!: PromiseResolvers<T>['reject']
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
      resolve = resolvePromise
      reject = rejectPromise
    })
    return { promise, resolve, reject }
  }
}
