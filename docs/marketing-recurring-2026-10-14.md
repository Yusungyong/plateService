# Marketing Mac recurring status

/admin/marketing overview displays the last bounded worker report, stale evidence after 20 minutes, the user-confirmed KST timetable and weekly published counts when known. It does not infer that an unreported worker is running.

Writable su12ng operators can download a marketing-only 28-day credential or revoke the connection. Secrets are kept only in the download Blob, not component state, storage, URLs or logs. Issuing a new credential revokes the prior connection. The separate existing Mac session button remains available for operator setup.

The approved automation policy permits new drafts after independent semantic review plus source/hash/layout/destination checks. Ambiguous drafts remain pending. Missing store-install or conversion measurements are not filled in as zero.

Validation: 320 tests in 40 suites; production build. Server counterpart: plateAppServer #166, migration V53.
