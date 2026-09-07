# Phase 4 — recovered common-base verification

Resume starts at the actual branch head **966b2008a8507e077f2d60efc5385ecae0f14a1a**, not a reset. The downloaded source tree independently hashes to **a00e32597a53b70cb802f5ec1c448565026c108d**.

## Completed result previously missing from the handover

Run **34063318685**, job **101567624978**, completed successfully on that exact commit, including check, 206 Node tests, build, ordinary browser checks, district checks, lab, and the full `tests/playtest_browser.py` suite. Artifact **9998436069** (SHA-256 `5175662a6b6384a77431e1e3247cbb94d001adbfc42b9b959ac8e367d9ecb69c`) was downloaded and its reports read. Both classic and comp-60 complete 147 legal UI commands and one negotiated exchange with four local WebRTC peers; the comp-60 trace imports and replays in the lab without becoming A/B statistics. Both exported traces were independently replayed again with `scripts/verify-playtest.mjs`. Zero human participants; no real-phone or cross-network validation.

## Interrupted run diagnosis

Run **34061727105** tested **b75d7853457e12cac6e903da6cba4f62af3de0c0** after four explicit fixture disposals. Its 191 Node tests, 28 game-browser checks, district suite and 7 lab checks completed. The full-session step started at 21:46:18 UTC and was cancelled at 21:59:33 near the overall twenty-minute limit. The artifact includes the complete classic trace and finished-classic capture, but not a complete comp-60 trace. The log ends in cancellation, not a failed convergence or gameplay assertion. This alone did not prove the second session was correct; the later full successful run above does supply that evidence.

An earlier run **34061181388** timed out opening the lifecycle fixture after completed browser pages were left alive. The four page/context disposals remain in the test. This test-resource issue is distinct from the later overall time budget. Previously fixed gameplay/network regressions are retained, not downgraded to make the tests pass.

## CI organization

The common CI keeps every existing command/scenario. Only the long full-session suite moves to a clean independent job (25-minute job bound, 22-minute step bound). Its two games and lab-import assertions are unchanged. The ordinary job remains bounded at twenty minutes. Both job results are needed to call the common CI successful. Specialized art/shadow and historical integration workflows are preserved.

## Parallel work inspected

`main` = **887d1548d7d451552ec9e12e0e4778a0fad2acf3**; phase 2 = **6b020530ac8ab46d0dd882ffcdfd67d00215b989** (PR 6, open draft); phase 3 = **df72bc360c3cb6fff151949d85de999344588b23** (PR 7, open draft). Their artistic assets are already ancestors of the common branch.

`feat/engagement-rhythm-0-7` = **9cc9de66386b8a597b6e0e048fc3b9de5d079eca**, eleven commits beyond main, modifies UI/momentum/deals, CSS, package version, documentation and tests/CI; it is NOT automatically integrated. No main update, PR closure or branch deletion in this resume.
