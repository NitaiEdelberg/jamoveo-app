import { useCallback, useRef, useState } from 'react';

// The backend sleeps. Render's free tier spins a service down after 15 minutes
// with no traffic, and waking it takes roughly 50 seconds — during which every
// request just hangs. Axios has no default timeout, so before this the Login
// button did nothing visible for the better part of a minute: no spinner, no
// message, and the button stayed clickable so people submitted two or three
// times over. It read as broken rather than slow.
//
// Two halves fix that, and neither costs any Render instance hours beyond the
// visit itself:
//
//   wakeBackend()    starts the boot the moment the page loads, so it overlaps
//                    with the user reading the form and typing a username
//                    instead of starting after they click.
//   useSlowRequest() keeps the button honest while a request is in flight, and
//                    escalates to an explanation once the wait stops looking
//                    like ordinary latency.

const API = import.meta.env.VITE_API_URL;

let woken = false;

/** Fire-and-forget ping that starts the container booting. Safe to call often. */
export function wakeBackend() {
  if (woken || !API) return;
  woken = true;
  // `keepalive` lets the request outlive a navigation, and failure is expected
  // and meaningless here: a sleeping instance may reset the connection outright,
  // and it still boots. Nothing reads the result.
  fetch(`${API}/api/health`, { keepalive: true }).catch(() => {});
}

/** How long a request may run before we stop calling it "loading" and explain. */
const SLOW_AFTER_MS = 4000;

/**
 * Wraps an async submit handler with a busy flag and a delayed "still waking"
 * flag.
 *
 * `busy` is true for the whole request and should disable the submit button.
 * `slow` turns true only after SLOW_AFTER_MS, so a warm backend (~200ms) never
 * flashes a scary message about cold starts that did not happen.
 */
export function useSlowRequest() {
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const timer = useRef(null);

  const run = useCallback(async (fn) => {
    setBusy(true);
    setSlow(false);
    timer.current = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    try {
      return await fn();
    } finally {
      clearTimeout(timer.current);
      setBusy(false);
      setSlow(false);
    }
  }, []);

  return { busy, slow, run };
}
