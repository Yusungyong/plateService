import {apiClient} from "./api";
import {fetchQna, updateQna} from "./api/qnaApi";
jest.mock("./api", () => ({apiClient: {get: jest.fn(), patch: jest.fn()}, ApiError: Error}));
afterEach(() => jest.resetAllMocks());
test("uses authenticated admin endpoint and unwraps private inquiry retention fields", async () => {
  const data = {content: [{qnaId: 1, isPublic: false, retentionState: "SCHEDULED"}]};
  apiClient.get.mockResolvedValue({success: true, data});
  expect(await fetchQna({adminMode: true})).toEqual(data);
  expect(apiClient.get).toHaveBeenCalledWith("/api/admin/qna", expect.objectContaining({withAuth: true}));
  apiClient.patch.mockResolvedValue({success: true, data: data.content[0]});
  expect(await updateQna(1, {statusCode:"answered"}, true)).toEqual(data.content[0]);
  expect(apiClient.patch).toHaveBeenCalledWith("/api/admin/qna/1", {statusCode:"answered"});
});
test("keeps public listings unauthenticated on the public route", async () => {
  apiClient.get.mockResolvedValue({content: []});
  expect(await fetchQna()).toEqual({content: []});
  expect(apiClient.get).toHaveBeenCalledWith("/api/qna", expect.objectContaining({withAuth: false}));
});
