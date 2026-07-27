const cache = new Map();
const inFlight = new Map();

const DEFAULT_TTL = 60_000;

export const getCached = async (key, fetcher, ttl = DEFAULT_TTL) => {
  const now = Date.now();
  const cached = cache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const request = Promise.resolve()
    .then(fetcher)
    .then((value) => {
      cache.set(key, { value, expiresAt: Date.now() + ttl });
      inFlight.delete(key);
      return value;
    })
    .catch((error) => {
      inFlight.delete(key);
      throw error;
    });

  inFlight.set(key, request);
  return request;
};

export const setCached = (key, value, ttl = DEFAULT_TTL) => {
  cache.set(key, { value, expiresAt: Date.now() + ttl });
  return value;
};

export const invalidateCache = (matcher) => {
  const shouldDelete =
    typeof matcher === "function" ? matcher : (key) => String(key).startsWith(String(matcher));

  [...cache.keys()].forEach((key) => {
    if (shouldDelete(key)) cache.delete(key);
  });
};

export const invalidateMany = (matchers) => {
  matchers.forEach(invalidateCache);
};
