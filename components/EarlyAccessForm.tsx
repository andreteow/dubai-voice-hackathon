"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";

/**
 * Early access.
 *
 * The gate is soft on purpose. An address buys you the way in and is remembered
 * after that, so a return visit — or a second run at a demo — never asks twice.
 * `/app` itself does not redirect: a judge who types the URL directly gets the
 * product, because a form standing between someone and a working demo is a
 * worse outcome than an uncollected email address.
 */

const REMEMBERED = "second-opinion.early-access";

interface Remembered {
  email: string;
  position: number | null;
}

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "joined"; position: number | null; returning: boolean };

export function EarlyAccessForm({ note }: { note?: string }) {
  const inputId = useId();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [error, setError] = useState<string | null>(null);

  // Read after mount rather than during render — the server has no localStorage
  // and a mismatch here would be a hydration error on the front door.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(REMEMBERED);
      if (!raw) return;
      const saved = JSON.parse(raw) as Remembered;
      if (saved?.email) {
        setState({ kind: "joined", position: saved.position, returning: true });
      }
    } catch {
      // A corrupt or blocked localStorage just means we ask again.
    }
  }, []);

  const submit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);

      if (email.trim().length === 0) {
        setError("Enter an email address and we’ll save you a place.");
        return;
      }

      setState({ kind: "sending" });

      try {
        const response = await fetch("/api/early-access", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const body = await response.json();

        if (!response.ok) {
          setError(body.error ?? "Something went wrong. Try again?");
          setState({ kind: "idle" });
          return;
        }

        const position: number | null = body.position ?? null;
        try {
          window.localStorage.setItem(
            REMEMBERED,
            JSON.stringify({ email, position } satisfies Remembered),
          );
        } catch {
          // Private browsing. They still get in, they just get asked next time.
        }

        setState({
          kind: "joined",
          position,
          returning: Boolean(body.alreadyJoined),
        });
      } catch {
        setError("Could not reach the server. Try again?");
        setState({ kind: "idle" });
      }
    },
    [email],
  );

  if (state.kind === "joined") {
    return (
      <div className="ea">
        <div className="ea-joined">
          <h3>{state.returning ? "You’re already in." : "You’re in."}</h3>
          <p>
            {state.position === null ? (
              <>We have your address. We’ll write when it opens up.</>
            ) : (
              <>
                You’re number <span className="ea-pos">{state.position}</span>{" "}
                on the list.
              </>
            )}
          </p>
          <Link href="/app" className="ea-enter">
            Open the live demo →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="ea">
      <form className="ea-form" onSubmit={submit} noValidate>
        <label className="sr-only" htmlFor={inputId}>
          Email address
        </label>
        <input
          id={inputId}
          className="ea-input"
          type="email"
          name="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-describedby={error ? `${inputId}-error` : undefined}
          aria-invalid={error ? true : undefined}
        />
        {/*
          Deliberately not disabled on an empty field. A greyed-out primary
          button is the first thing a visitor sees, and it reads as a broken
          page rather than as a rule. Let them press it and say what's wrong.
        */}
        <button
          className="ea-btn"
          type="submit"
          disabled={state.kind === "sending"}
        >
          {state.kind === "sending" ? "One moment…" : "Request access"}
        </button>
      </form>
      {error ? (
        <p className="ea-error" id={`${inputId}-error`} role="alert">
          {error}
        </p>
      ) : (
        <p className="ea-note">
          {note ?? "Early access for renters in Dubai. One email when it opens."}
        </p>
      )}
    </div>
  );
}
