/**
 * URLs for Help menu and About. Replace with your repo/docs when publishing.
 */
export const APP_LINKS = {
  documentation: "https://github.com/jollof-ide/jollof-ide#readme",
  releaseNotes: "https://github.com/jollof-ide/jollof-ide/releases",
  reportIssue: "https://github.com/jollof-ide/jollof-ide/issues",
} as const;

export function openDocumentation() {
  window.open(APP_LINKS.documentation, "_blank", "noopener,noreferrer");
}

export function openReleaseNotes() {
  window.open(APP_LINKS.releaseNotes, "_blank", "noopener,noreferrer");
}

export function openReportIssue() {
  window.open(APP_LINKS.reportIssue, "_blank", "noopener,noreferrer");
}
