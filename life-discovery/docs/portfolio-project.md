# Life Discovery

## Overview
Life Discovery is an AI-assisted lifestyle recommendation platform built to help couples decide what to do together without falling into generic, low-trust suggestions. Instead of acting like a chatbot that invents ideas, it combines live city data, official cultural sources, couple-specific preferences, weather and logistics context, and recommendation logic to surface real options for Sao Paulo across dining, delivery, movies/series, and cultural outings.

The product is strongest where most recommendation products are weak: shared decision-making. It is designed for a couple, not a single user, and translates a joint profile, constraints, favorites, and feedback into explainable recommendations, map-based exploration, and structured "date night" plans.

## Problem
Choosing what to do together is not a search problem alone; it is a coordination problem.

Couples often deal with:
- too many choices and low-confidence decisions
- generic recommendation feeds that ignore relationship dynamics
- planning friction caused by rain, commute, neighborhood, budget, and mood
- chat-based AI that hallucinates places, hides source quality, or misses obvious constraints
- poor personalization for shared tastes, such as "good for both of us" instead of "close to my interests"

This matters because lifestyle discovery is only useful when it leads to a confident decision. If recommendations are vague, ungrounded, or socially tone-deaf, users still have to do the hard part themselves.

## Solution
Life Discovery turns couple planning into a retrieval and ranking problem with editorial control.

The platform builds a persistent couple profile, ingests structured experiences from live and curated sources, enriches them with embeddings and metadata, and ranks them using a mix of preference signals, contextual constraints, graph relationships, and freshness logic. The frontend then packages those results into decision-oriented surfaces: a daily brief, themed recommendation collections, a watch-at-home flow, a map view by neighborhood, and a date-night planner with a beginning-middle-end sequence.

The result is not "AI for talking about plans." It is AI for reducing decision friction using real inventory, transparent provenance, and recommendation reasoning that is visible to the user.

## Features
- Shared couple onboarding with location, transport, rain sensitivity, interests, dislikes, and per-member preferences
- Context-aware recommendations across four domains: dining out, delivery, movies/series, and events/exhibitions
- Explainable recommendation cards with fit rationale, weather fit, source labeling, price, and "when this loses strength"
- Date-night planner that assembles a three-step itinerary from ranked local options
- Spatial discovery view that groups recommendations by neighborhood and distance, with optional Mapbox map rendering
- Feedback loop for like/save/dislike actions that updates preferences and downstream recommendations
- AI concierge service with short-term memory and optional LLM generation, grounded by retrieved candidates
- Live event ingestion from 20+ source connectors plus curated editorial catalog and official-source registry
- Strong fallback behavior so the product still works when some live services are unavailable

## Technical Architecture
- Frontend: Next.js 15 + React 19 + TypeScript application with TanStack Query, Framer Motion, and optional Mapbox-based spatial exploration. The UI is intentionally editorial rather than "chat-first", and it can fall back to curated local data when APIs are unavailable.
- Backend: FastAPI-based microservice architecture with an API gateway and specialized services for context, user profiles, onboarding, date-night planning, AI concierge, recommendation ranking, and background learning.
- APIs: Internal service-to-service HTTP calls plus integrations with OpenWeather, IP geolocation, OpenAI chat completions, OpenStreetMap/Nominatim geocoding, and public/event content sources such as Sympla, Eventbrite, MASP, IMS, MUBI, Rotten Tomatoes, iFood, and others.
- AI Components: Embedding generation for users and experiences, rule-based and vector-informed ranking, graph-based preference propagation, feedback-driven learning, deterministic planning, and optional LLM suggestion generation with strict JSON output.
- Database: PostgreSQL with pgvector, JSONB-heavy profile storage, interaction history, experience catalog, couple members/profiles, onboarding answers, graph nodes/edges, and recommendation support tables.

## AI / Smart Components (if applicable)
- LLM usage: The `ai_concierge` service can call an OpenAI chat model to turn retrieved candidates into concise suggestion objects. It passes profile, context, and top candidates into the prompt and expects structured JSON back. If the LLM is unavailable, the service falls back to deterministic reasoning instead of failing.
- RAG: This is not classic document Q&A RAG, but it is clearly retrieval-grounded AI. Concierge and planning features retrieve candidate experiences from the database, combine them with user profile + context, and only then generate suggestions. The system grounds outputs in real records rather than free-form generation.
- Automation: A crawler runs on an interval to ingest new experiences, normalize them, geocode venues, embed content, and upsert them into the catalog. A separate learning engine runs hourly to apply time-decayed signals from interactions and refresh preference weights and embeddings.
- Decision logic: Recommendation scoring blends stored tag weights, couple-profile signals, lifestyle constraints, context (weather/daypart/hour), source quality, content tier, graph boosts, diversity reranking, and a small epsilon-greedy exploration slice so the feed does not become stale.

## My Role
Assuming primary ownership of this repo, the strongest accurate framing is end-to-end AI product and platform ownership.

I:
- designed the product around couple decision support rather than generic solo recommendations
- architected the multi-service backend and shared data model for users, couple profiles, interactions, and experiences
- implemented the recommendation stack, including preference weighting, context rules, graph boosts, and freshness/exploration logic
- built the ingestion pipeline for live city/event/culture sources and normalized that data into a searchable catalog
- created the frontend experience layers that turn rankings into actionable surfaces such as daily briefs, watch collections, map-based browsing, and date-night plans
- added explainability and source transparency so recommendations are not opaque black-box results
- wired background learning, smoke-test scripts, and local Docker runtime to make the system demoable and operable as a real product

## Challenges
- Modeling a shared taste profile is harder than modeling a single user because recommendations must satisfy two people, plus logistics and situational constraints.
- Local discovery data is messy. Event pages, editorial guides, streaming options, and restaurant data vary widely in structure, quality, and duplication risk.
- A lifestyle AI product must avoid hallucination. That required grounding recommendations in live/curated inventory and exposing provenance instead of returning generic LLM text.
- Relevance and freshness pull in opposite directions. The project explicitly handles this with recommendation quality scoring plus exploration slots for newer items.
- The system has both canonical and legacy duplicate service directories, so maintaining a clear runtime path and architecture narrative is a real engineering concern.
- UX resilience matters: the frontend is built to degrade honestly rather than fabricate results when live data is weak.

## Impact
- Converts vague planning intent into a ranked, explainable decision set instead of forcing users to search multiple apps and manually reconcile constraints.
- Reduces hallucination risk by grounding suggestions in stored experiences, official sources, and curated inventory rather than pure text generation.
- Creates compounding personalization through feedback capture, automatic profile regeneration, graph learning, and time-decayed preference updates.
- Supports real operational workflows: local Docker stack, seeding scripts, smoke tests, health validation, and scheduled ingestion/learning jobs.
- Demonstrates product maturity beyond a demo by combining live ingestion, recommendation science, explainability, and resilient UX in one system.

## Differentiation
This project is not a thin "AI wrapper" around a chat API.

What makes it non-trivial:
- it solves a two-person recommendation problem, which is materially more complex than a standard single-user feed
- it mixes live retrieval, curated editorial content, knowledge-graph signals, embeddings, and explicit business rules
- it treats explainability as a product feature, not an internal debug tool
- it is grounded in local city discovery, which adds real ingestion, normalization, deduplication, and source-quality challenges
- it has deterministic fallbacks, so core product value does not disappear when an external model or API is down
- it separates concerns across services, making the system extensible enough for future optimization and experimentation

## Future Improvements (optional)
- Consolidate duplicate legacy service directories so the architecture has a single canonical implementation path
- Unify recommendation logic that currently exists in both the API gateway layer and the dedicated recommendation service
- Add explicit experiment/analytics loops for measuring recommendation acceptance, save rate, and decision latency
- Expand city coverage beyond Sao Paulo while preserving source quality and local context fidelity
- Introduce stronger availability-aware ranking, booking integrations, and calendar-aware planning
- Push vector search further into the database layer for scalable semantic retrieval as the catalog grows
