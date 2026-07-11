# DataMind AI — PRD & Progress Log

## Original Problem Statement
Build "DataMind AI" — a production-ready, premium SaaS web application that competes with Tableau/Power BI/ChatGPT for AI-driven data analytics. Users upload data, an AI agent understands, cleans, does EDA, detects anomalies, builds dashboards, answers questions in natural language, builds ML models, forecasts trends, generates executive reports and suggests business actions.

## User Choices (confirmed)
- **LLM**: Claude Sonnet 4.5 via Emergent LLM key
- **Auth**: Email/password (JWT) + Emergent-managed Google OAuth
- **Scope v1**: Landing → Auth → Upload CSV/Excel → Auto EDA + Cleaning → AI Chat → ML/Forecasting → Reports
- **DB**: MongoDB (relational-style schema), Repository/Service structure
- **PDF export**: html2pdf.js (client-side)

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`) with prefixed `/api` router. MongoDB via Motor. LLM streaming via `emergentintegrations` `LlmChat.stream_message()`.
- **Frontend**: React 19 + TailwindCSS + Framer Motion + Recharts + Sonner + html2pdf.js. Cabinet Grotesk (display) + IBM Plex Sans (body) + JetBrains Mono (data).
- **Auth**: JWT (Bearer) OR Emergent session cookie. `get_current_user` handles both.
- **File storage**: `/app/backend/uploads/`; DB stores metadata + schema.
- **Collections**: users, user_sessions, datasets, chat_messages, reports, notifications.

## Implemented (2026-07-11)
- Premium dark landing page: hero, product preview, features bento, pricing, testimonials, FAQ, footer
- Signup + Login (email/pass) + Google Sign-in button + `/auth/callback` (session_id exchange)
- Dashboard shell w/ sidebar, KPIs, recent datasets & conversations
- Datasets: drag-drop upload (CSV/Excel/JSON/Parquet), list, preview, delete
- Dataset detail: schema, missing/duplicates/outliers, correlation heatmap, distributions, category charts, AI-generated Insights (Claude), Auto-clean w/ before/after
- AI Chat: SSE streaming from Claude Sonnet 4.5, dataset-grounded context, history, conversation list
- ML Studio: regression / classification / clustering / forecasting w/ metrics, feature importance, confusion matrix, forecast chart
- Reports: generate → view (cover, exec summary, KPIs, insights, charts, recommendations) → PDF export via html2pdf.js

## Backlog / Next Actions
- **P1**: SQL Workspace with NL→SQL; Dashboard Builder (drag/drop widgets, saved dashboards, filters); Collaboration (share/permissions); Notification bell dropdown; Anomaly detection module
- **P2**: Additional chart types (Sankey, Sunburst, Treemap, Radar, Bubble, Waterfall via ECharts); Admin panel; SHAP explanations for ML models; API keys page for users; Usage statistics
- **P3**: Compare multiple models automatically; External DB connectors (PostgreSQL/MySQL/SQLite); Model version history; Real-time notifications via WebSocket
