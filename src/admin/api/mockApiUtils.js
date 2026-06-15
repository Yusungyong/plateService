function cloneData(value) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value));
}

export function mockRequest(value, options = {}) {
  if (process.env.NODE_ENV === "test") {
    return options.error
      ? Promise.reject(
          options.error instanceof Error
            ? options.error
            : new Error(String(options.error))
        )
      : Promise.resolve(cloneData(value));
  }

  const delay = options.delay ?? 240;

  return new Promise((resolve, reject) => {
    window.setTimeout(() => {
      if (options.error) {
        reject(
          options.error instanceof Error
            ? options.error
            : new Error(String(options.error))
        );
        return;
      }

      resolve(cloneData(value));
    }, delay);
  });
}
