import React from "react";
import {render, screen, fireEvent, waitFor, act} from "@testing-library/react";
import {MemoryRouter, Routes, Route} from "react-router-dom";
import RestaurantDetail from "./pages/RestaurantDetail";
import MemberMonitoring from "./pages/MemberMonitoring";
import apiClient, {setAuthSession, clearAuthSession, captureAuthSession} from "./api/client";
import {getBrowserDeviceId} from "./api/authApi";
const response = (data,status=200) => ({ok:status<400,status,headers:{get:()=>"application/json"},json:async()=>({data})});
const store={id:17,title:"Original",address:"Address",categories:["한식"],menus:[{id:1,name:"Menu",price:1000,media:[]}],media:[],editToken:"2026-10-07T10:00:00Z"};
const showStore=()=>render(<MemoryRouter initialEntries={["/business/stores/17"]}><Routes><Route path="/business/stores/:restaurantId" element={<RestaurantDetail/>}/></Routes></MemoryRouter>);
beforeEach(()=>{clearAuthSession();localStorage.clear();global.fetch=jest.fn();});
afterEach(()=>jest.restoreAllMocks());
test("stale successful uploads cannot continue after account change",async()=>{
 setAuthSession("A","refreshA");let release;global.fetch.mockImplementation(()=>new Promise(resolve=>release=resolve));
 const pending=apiClient.post("/api/owner/files",{});setAuthSession("B","refreshB");release(response({fileUrl:"synthetic"}));
 await expect(pending).rejects.toMatchObject({code:"AUTH_SESSION_CHANGED"});
});
test("captured session rejects a continuation after logout",()=>{setAuthSession("A","refreshA");const assert=captureAuthSession();clearAuthSession();expect(assert).toThrow();});
test("browser identifier persists and is not shared hardcoded device id",()=>{const id=getBrowserDeviceId();expect(id).not.toBe("web-browser");expect(getBrowserDeviceId()).toBe(id);expect(localStorage.getItem("plate-service.device-id")).toBe(id);});
test("failed initial detail does not present a save form",async()=>{
 global.fetch.mockResolvedValue(response({message:"fail"},500));showStore();await screen.findByText("매장 정보를 불러오지 못했습니다");expect(screen.queryByRole("button",{name:"수정 저장"})).not.toBeInTheDocument();
});
test("negative price never sends an update",async()=>{
 global.fetch.mockResolvedValue(response(store));showStore();await screen.findByDisplayValue("Original");fireEvent.change(screen.getByLabelText("가격"),{target:{value:"-1000"}});fireEvent.click(screen.getByRole("button",{name:"수정 저장"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("가격");expect(global.fetch.mock.calls.every(([,o])=>o.method==="GET")).toBe(true);
});
test("edit token and removed media are carried in the save payload",async()=>{
 global.fetch.mockResolvedValue(response({...store,media:[{fileUrl:"https://example.invalid/image.png",mediaType:"image",usageType:"representative"}]}));showStore();await screen.findByDisplayValue("Original");fireEvent.click(screen.getByRole("button",{name:/이 .* 삭제/}));fireEvent.click(screen.getByRole("button",{name:"수정 저장"}));
 await waitFor(()=>expect(global.fetch.mock.calls.some(([,o])=>o.method==="PUT")).toBe(true));const call=global.fetch.mock.calls.find(([,o])=>o.method==="PUT");expect(JSON.parse(call[1].body)).toMatchObject({expectedUpdatedAt:store.editToken,media:[]});
});
test("monitoring preserves successful counts while marking failed sections unknown",async()=>{
 global.fetch.mockImplementation(url=>Promise.resolve(String(url).includes("/summary")?response({totalUsers:1234}):response({},500)));
 render(<MemberMonitoring/>);await screen.findByText("1,234");expect(screen.getByText("위험 계정 조회 실패")).toBeInTheDocument();expect(screen.queryByText("현재 표시할 위험 계정이 없습니다.")).not.toBeInTheDocument();
});
