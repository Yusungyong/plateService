import React from "react";
import {render,screen,fireEvent,waitFor} from "@testing-library/react";
import useSignupConsent from "./useSignupConsent";
const doc={documentId:"service-terms",version:"test-v1",sha256:"a".repeat(64),title:"테스트 약관",body:"합성 문서 본문",actionType:"ACCEPT",required:true};
let accepted;
function Harness(){const consent=useSignupConsent();return <>{consent.content}<button disabled={consent.loading||!!consent.error} onClick={()=>{accepted=consent.acceptance({username:"synthetic"});}}>제출</button><span>{String(consent.enabled)}</span></>;}
beforeEach(()=>{process.env.REACT_APP_LEGAL_CONSENT_WEB="true";global.fetch=jest.fn();accepted=null;});
afterEach(()=>{delete process.env.REACT_APP_LEGAL_CONSENT_WEB;});
const respond=data=>Promise.resolve({ok:true,status:200,headers:{get:()=>"application/json"},json:async()=>({data})});
test("disabled catalog does not activate new consent or age rules",async()=>{global.fetch.mockImplementation(()=>respond({enabled:false,documents:[],catalogRevision:0,minimumAge:15}));render(<Harness/>);await waitFor(()=>expect(screen.getByRole("button",{name:"제출"})).toBeEnabled());expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"제출"}));expect(accepted).toBeUndefined();});
test("enabled catalog records only the displayed version and explicit choices",async()=>{Object.defineProperty(global.crypto,'randomUUID',{configurable:true,value:()=>"synthetic-request-123456789"});global.fetch.mockImplementation(()=>respond({enabled:true,documents:[doc],catalogRevision:8,minimumAge:15}));render(<Harness/>);await screen.findByText("합성 문서 본문");for(const box of screen.getAllByRole("checkbox"))fireEvent.click(box);fireEvent.click(screen.getByRole("button",{name:"제출"}));expect(accepted).toMatchObject({catalogRevision:8,expectedRevision:0,minimumAgeConfirmed:true,decisions:[{documentId:doc.documentId,version:doc.version,sha256:doc.sha256,decision:"ACCEPTED"}]});const key=accepted.idempotencyKey;fireEvent.click(screen.getByRole("button",{name:"제출"}));expect(accepted.idempotencyKey).toBe(key);});
test("catalog failure blocks submission instead of bypassing consent",async()=>{global.fetch.mockRejectedValue(new Error("offline"));render(<Harness/>);await screen.findByRole("alert");expect(screen.getByRole("button",{name:"제출"})).toBeDisabled();});
