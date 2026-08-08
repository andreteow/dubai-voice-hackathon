# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

This project is unstarted — no source code, package manifest, build tooling, or git repository exists yet. Only `.env.local` and an empty `docs/` scaffold are present. Update this file with build/test/run commands and architecture notes once a stack is chosen.

## Available credentials

`.env.local` (gitignore it before the first commit) holds API keys for the services this hackathon project is expected to draw on:

| Var | Service |
| --- | --- |
| `ELEVENLABS_API_KEY` | ElevenLabs — TTS/STT, conversational voice agents |
| `HEYGEN_API_KEY` | HeyGen — avatar video generation |
| `GEMINI_API_KEY` | Google Gemini |
| `OPENROUTER_API_KEY` | OpenRouter — multi-model LLM gateway |
| `BYTEPLUS_API_KEY`, `BYTEPLUS_MODELARK_API_KEY`, `BYTEPLUS_AK`, `BYTEPLUS_SK` | BytePlus / ModelArk |
| `TAVILY_API_KEY` | Tavily — search |
| `APIFY_TOKEN` | Apify — scraping/actors |
| `CONTEXT_DEV_API_KEY` | Context.dev |

Matching MCP servers are configured in this session for ElevenLabs, HeyGen, Supabase, Vapi, Context7, and others — prefer those tools over hand-rolled HTTP calls where they cover the task.

## Docs convention

`docs/` is pre-partitioned into `brainstorms/`, `plans/`, and `solutions/` (all empty). Write exploratory notes, implementation plans, and post-hoc writeups into the corresponding directory rather than the repo root.
