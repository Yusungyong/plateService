import {
  operationsModel,
  pushStages,
  releaseStages,
  latestChecks,
} from "./operationsModel";
test("unknown evidence is not shown as zero or success", () => {
  const m = operationsModel({});
  expect(m.errors.available).toBe(false);
  expect(m.acceptanceRate).toBeNull();
  expect(m.serverFailureRate).toBeNull();
  expect(m.pushAvailable).toBe(false);
});
test("provider acceptance does not imply received or opened", () => {
  const stages = pushStages({
    providerStatus: "SUCCESS",
    attemptedAt: "2026-10-12T10:00:00",
    receivedAt: "",
    openedAt: "",
  });
  expect(stages.map((s) => s.state)).toEqual([
    "good",
    "good",
    "unknown",
    "unknown",
  ]);
});
test("an opened callback can confirm receipt even when receipt callback is missing", () => {
  expect(
    pushStages({
      providerStatus: "SUCCESS",
      openedAt: "2026-10-12T10:00:01",
    })[2].state
  ).toBe("good");
});
test("process counts and client errors are different scopes", () => {
  const m = operationsModel({
    api: {
      runtimeMetrics: [
        { path: "/api/test", requestCount: 10, totalTimeMs: 10, status: "500" },
        {
          path: "UNMATCHED_OR_OTHER",
          requestCount: 90,
          totalTimeMs: 20,
          status: "200",
        },
      ],
    },
  });
  expect(m.serverFailureRate).toBe(1);
  expect(m.errors.available).toBe(false);
});
test("release registration and workflow success do not confirm store or device", () => {
  const release = {
    releaseId: "r1",
    platform: "ANDROID",
    revision: "a".repeat(40),
  };
  const s = {
    releases: {
      checks: [],
      workflows: [
        {
          repository: "Yusungyong/plateApp2",
          revision: release.revision,
          workflow: ".github/workflows/mobile-ci.yml",
          status: "completed",
          conclusion: "success",
        },
      ],
    },
  };
  expect(releaseStages(s, release).map((s) => s.state)).toEqual([
    "good",
    "good",
    "unknown",
    "unknown",
    "unknown",
  ]);
});
test("another revision or repository cannot provide release evidence", () => {
  const release = {
    releaseId: "r1",
    platform: "IOS",
    revision: "a".repeat(40),
  };
  const s = {
    releases: {
      workflows: [
        {
          repository: "Yusungyong/plateApp2",
          revision: "b".repeat(40),
          workflow: ".github/workflows/mobile-ci.yml",
          status: "completed",
          conclusion: "success",
        },
      ],
    },
  };
  expect(releaseStages(s, release)[1].state).toBe("unknown");
});
test("latest manual check wins and failure is retained", () => {
  const s = {
    releases: {
      checks: [
        { releaseId: "r1", check: "CHAT", result: "FAIL" },
        { releaseId: "r1", check: "CHAT", result: "PASS" },
        { releaseId: "r2", check: "CHAT", result: "PASS" },
      ],
    },
  };
  expect(latestChecks(s, "r1").CHAT.result).toBe("FAIL");
});
