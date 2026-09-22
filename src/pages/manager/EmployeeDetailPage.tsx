// Manager VisitDetail page — re-exports the shared VisitDetailPage.
// The manager view is identical to the employee detail view in Phase 2 (read-only).
// It lives at /manager/visits/:id with its own route so the NavBar correctly
// shows the indigo manager colour scheme via the user's MANAGER role.

export { default } from '../employee/VisitDetailPage';
