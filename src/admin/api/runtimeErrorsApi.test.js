import { apiClient } from "../../api";
import { getRuntimeErrors } from "./runtimeErrorsApi";
jest.mock("../../api", () => ({ apiClient: { get: jest.fn() } }));
test("requests only the bounded 24h diagnostics", async () => {
  const signal = new AbortController().signal;
  const result = { available: true, total: 0, groups: [], kindCounts: [], hourly: [], recent: [], hasMore: false, recentLimit: 50, retentionDays: 7 };
  apiClient.get.mockResolvedValue({success: true, data: result});
  await expect(getRuntimeErrors({signal})).resolves.toEqual(result);
  expect(apiClient.get).toHaveBeenCalledWith("/api/admin/operations/runtime-errors", {query: {hours: 24, limit: 50}, signal});
});
test("does not present an invalid response as a successful zero", async () => {
  apiClient.get.mockResolvedValue({success: true, data: {available: true, total: 0}});
  await expect(getRuntimeErrors()).rejects.toThrow("응답");
});
test("accepts non-fatal JavaScript diagnostics as a distinct type", async () => {
  const result = { available: true, total: 1, groups: [], kindCounts: [{kind:"JS_NONFATAL",count:1}], hourly: [], recent: [{eventId:"synthetic",kind:"JS_NONFATAL"}], hasMore: false, recentLimit: 50, retentionDays: 7 };
  apiClient.get.mockResolvedValue({success: true, data: result});
  await expect(getRuntimeErrors()).resolves.toEqual(result);
});
test("rejects unknown diagnostic kinds rather than displaying misleading totals", async () => {
  const result = { available: true, total: 1, groups: [], kindCounts: [{kind:"UNKNOWN",count:1}], hourly: [], recent: [], hasMore: false, recentLimit: 50, retentionDays: 7 };
  apiClient.get.mockResolvedValue({success: true, data: result});
  await expect(getRuntimeErrors()).rejects.toThrow("응답");
});
