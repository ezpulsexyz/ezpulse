# Changelog

All notable changes to ezpulse will be documented in this file.

## [2.0.0] - 2026-07-11

### ezpulse V2 – Real-time Terminal

**Major focus:** Making ezpulse feel alive with real-time data and actionable personal alerts.

#### New Features
- **Real-time Price Feeds**: Integrated DexScreener WebSocket for live price updates across the terminal, with intelligent fallback polling.
- **Price Threshold Alerts**: Users can now set custom price alerts ("Alert me when $TOKEN goes above/below $X"). Fully persistent with localStorage.
- **Price Alert Notifications**: Triggered price alerts now appear in the Notifications panel with proper context and formatting.
- **Price Alert UI**: Added a clean modal + floating "Set Price Alert" button that appears automatically when viewing any token.

#### Improvements
- **Notifications Panel Overhaul**: Complete redesign with per-token grouping, better visual hierarchy, unread indicators, "Mark all read", and mobile-responsive layout.
- **Real-time Alert Checking**: Price alerts are now evaluated in real-time as prices update via WebSocket.
- **Unified Notification Experience**: Signal-based notifications and price alerts are now combined in one clean interface.

#### Technical
- Added `PriceAlert` type and full state management with persistence.
- Improved WebSocket subscription management based on active tokens (feed + watchlist + portfolio + selected).
- Better separation between price updates and alert evaluation logic.

---

## Previous Versions

- Initial foundation with market data, watchlist, portfolio reading, and Investor Thesis community features.