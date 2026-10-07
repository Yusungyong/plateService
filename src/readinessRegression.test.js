import React from "react";
import {act, fireEvent, render, screen, waitFor} from "@testing-library/react";
import App from "./App";
import {draftKey} from "./auth/privateDrafts";
const auth = name => ({accessToken:`e30.${btoa(JSON.stringify({sub:name,permissions:[]}))}.test`,refreshToken:"test"});
const response = (data,status=200) => ({ok:status<400,status,headers:{get:()=>"application/json"},json:async()=>data});
const detail = {applicationId:17,approvalStatus:"on_hold",version:3,ownerProfile:{ownerName:"OWNER A",ownerPhone:"01012345678"},business:{businessNumber:"123-**-*****"},store:{storeName:"STORE A",address:"ADDRESS A"},categories:[],menus:[],documents:[]};
function open(path, account) {
  if(account)localStorage.setItem("plate-service.auth",JSON.stringify(auth(account)));
  history.replaceState({},"",path);return render(<App/>);
}
beforeEach(()=>{localStorage.clear();sessionStorage.clear();global.fetch=jest.fn();});
afterEach(()=>jest.restoreAllMocks());

test("account switch discards the previous application's private fields before reloading", async()=>{
  global.fetch.mockResolvedValueOnce(response({data:detail})).mockImplementation(()=>new Promise(()=>{}));
  open("/business/applications/17","accountA");
  await screen.findByText("OWNER A");
  act(()=>{localStorage.setItem("plate-service.auth",JSON.stringify(auth("accountB")));window.dispatchEvent(new StorageEvent("storage",{key:"plate-service.auth"}));});
  await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("OWNER A")).not.toBeInTheDocument();
  expect(screen.queryByText("ADDRESS A")).not.toBeInTheDocument();
  expect(global.fetch.mock.calls[1][1].headers.Authorization).toBe(`Bearer ${auth("accountB").accessToken}`);
});

test("canceling logout preserves both authentication and the private draft", async()=>{
  const confirm=jest.spyOn(window,"confirm").mockReturnValue(false);
  open("/business/signup","accountA");
  fireEvent.change(screen.getByLabelText("담당자 이름"),{target:{value:"DRAFT OWNER"}});
  fireEvent.click(screen.getByRole("button",{name:"로그아웃"}));
  expect(confirm).toHaveBeenCalledTimes(1);
  expect(localStorage.getItem("plate-service.auth")).not.toBeNull();
  expect(screen.getByLabelText("담당자 이름")).toHaveValue("DRAFT OWNER");
  expect(sessionStorage.getItem(draftKey("accountA","business:new"))).toContain("DRAFT OWNER");
  confirm.mockReturnValue(true);
  fireEvent.click(screen.getByRole("button",{name:"로그아웃"}));
  await waitFor(()=>expect(localStorage.getItem("plate-service.auth")).toBeNull());
  expect(sessionStorage.getItem(draftKey("accountA","business:new"))).toBeNull();
});

test.each([3,2])("restores an editing draft only for the same server version (%s)", async(version)=>{
  sessionStorage.setItem(draftKey("accountA","business:17"),JSON.stringify({form:{ownerProfile:{ownerName:"RESTORED OWNER"}},applicationId:17,sourceVersion:version,expiresAt:Date.now()+60000}));
  global.fetch.mockResolvedValue(response({data:detail}));
  open("/business/applications/17/edit","accountA");
  expect(await screen.findByLabelText("담당자 이름")).toHaveValue(version===3?"RESTORED OWNER":"OWNER A");
});
function fillSignup(){
  for(const [id,value] of Object.entries({username:"testuser",nickname:"tester",email:"test@example.com",password:"password123",passwordConfirm:"password123"}))fireEvent.change(document.getElementById("signup-"+id),{target:{value}});
  fireEvent.click(screen.getByRole("checkbox",{name:"이용약관에 동의합니다."}));
  fireEvent.click(screen.getByRole("checkbox",{name:"개인정보 처리방침에 동의합니다."}));
}
test.each(["fields","fieldErrors"])("maps backend %s to the invalid signup field",async(key)=>{
  global.fetch.mockResolvedValue(response({message:"검증 실패",data:{[key]:{nickname:"닉네임 검증 오류"}}},400));
  open("/signup");fillSignup();fireEvent.click(screen.getByRole("button",{name:"가입하기"}));
  await screen.findByText("닉네임 검증 오류");
  expect(document.getElementById("signup-nickname")).toHaveAttribute("aria-invalid","true");
});
test("blocks navigation during signup but allows the successful result to navigate", async()=>{
  const alert=jest.spyOn(window,"alert").mockImplementation(()=>{});let finish;
  global.fetch.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  open("/signup");fillSignup();fireEvent.click(screen.getByRole("button",{name:"가입하기"}));
  await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getAllByRole("link",{name:"접시 홈으로 이동"})[0]);
  await waitFor(()=>expect(alert).toHaveBeenCalledTimes(1));
  expect(location.pathname).toBe("/signup");
  await act(async()=>finish(response({data:{username:"testuser"}})));
  await waitFor(()=>expect(location.pathname).toBe("/login"));
  expect(alert).toHaveBeenCalledTimes(1);
});

test("a late signup response cannot navigate after the form has unmounted", async()=>{
  let finish;global.fetch.mockImplementation(()=>new Promise(resolve=>{finish=resolve;}));
  const view=open("/signup");fillSignup();fireEvent.click(screen.getByRole("button",{name:"가입하기"}));
  await waitFor(()=>expect(global.fetch).toHaveBeenCalledTimes(1));
  view.unmount();history.replaceState({},"","/");
  await act(async()=>finish(response({data:{username:"testuser"}})));
  expect(location.pathname).toBe("/");
});
