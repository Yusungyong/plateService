import React from "react";
import {fireEvent, render, screen} from "@testing-library/react";
import ApiModuleStructure from "./ApiModuleStructure";

const architecture = {
  servicePortCount: 2,
  modules: [
    {id: "engagement", portCount: 1, commandMethodCount: 2, queryMethodCount: 3, ports: [{name: "LikePort", kind: "compatibility_port", port: "example.LikePort", implementation: "example.LikeService", commandMethods: 2, queryMethods: 3, roles: [{name: "LikeCommands", kind: "command", methodCount: 2}, {name: "LikeQueries", kind: "query", methodCount: 3}]}]},
    {id: "content", portCount: 1, commandMethodCount: 1, queryMethodCount: 1, ports: []},
  ],
  dependencies: [{fromModule: "engagement", toModule: "content", dependencyCount: 1, evidenceKind: "constructor_port_dependency", evidence: [{sourceClass: "example.LikeService", targetType: "example.ContentQueries"}]}],
};

test("renders actual backend integer role counts and constructor dependency evidence", () => {
  render(<ApiModuleStructure architecture={architecture} />);
  expect(screen.getByText("명령 2 · 조회 3", {selector: "small"})).toBeInTheDocument();
  const evidence = screen.getByText("연결 근거 보기", {exact: false, selector: "summary"}).closest("details");
  const interfaces = screen.getByText("서비스 인터페이스 보기", {exact: false, selector: "summary"}).closest("details");
  expect(evidence).not.toHaveAttribute("open");
  expect(interfaces).not.toHaveAttribute("open");
  fireEvent.click(evidence.querySelector("summary"));
  fireEvent.click(interfaces.querySelector("summary"));
  expect(evidence).toHaveAttribute("open");
  expect(interfaces).toHaveAttribute("open");
  expect(screen.getByText("LikeCommands")).toBeInTheDocument();
  expect(screen.getByText("LikeQueries")).toBeInTheDocument();
  expect(screen.getByText("example.LikeService", {selector: "li code"})).toBeInTheDocument();
  expect(screen.getByText("→ example.ContentQueries")).toBeInTheDocument();
  expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "→ 콘텐츠 참조 1개"}));
  expect(screen.getByText("명령 1 · 조회 1")).toBeInTheDocument();
  expect(screen.getByRole("button", {name: "좋아요·댓글 참조 1개 →"})).toBeInTheDocument();
});

test("uses one labeled selection and keeps the diagram navigation in sync", () => {
  render(<ApiModuleStructure architecture={architecture} />);
  const selection = screen.getByRole("combobox", {name: "업무 선택"});
  expect(selection).toHaveValue("engagement");
  expect(screen.getAllByRole("combobox")).toHaveLength(1);
  expect(screen.getAllByRole("button")).toHaveLength(1);
  fireEvent.change(selection, {target: {value: "content"}});
  expect(selection).toHaveValue("content");
  expect(screen.getByText("명령 1 · 조회 1", {selector: "small"})).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", {name: "좋아요·댓글 참조 1개 →"}));
  expect(selection).toHaveValue("engagement");
  expect(screen.getByText("명령 2 · 조회 3", {selector: "small"})).toBeInTheDocument();
});

test("preserves valid selection on refresh and falls back when the selected module disappears", () => {
  const {rerender} = render(<ApiModuleStructure architecture={architecture} />);
  fireEvent.change(screen.getByRole("combobox", {name: "업무 선택"}), {target: {value: "content"}});
  rerender(<ApiModuleStructure architecture={{...architecture, modules: [...architecture.modules]}} />);
  expect(screen.getByRole("combobox", {name: "업무 선택"})).toHaveValue("content");
  rerender(<ApiModuleStructure architecture={{...architecture, modules: [architecture.modules[0]], dependencies: []}} />);
  expect(screen.getByRole("combobox", {name: "업무 선택"})).toHaveValue("engagement");
  expect(screen.getByText("명령 2 · 조회 3", {selector: "small"})).toBeInTheDocument();
  expect(screen.queryByText(/undefined/)).not.toBeInTheDocument();
});

test("missing structure data states the evidence limitation without inventing ports", () => {
  render(<ApiModuleStructure />);
  expect(screen.getByText("이 서버에는 서비스 구조 분석 자료가 아직 제공되지 않습니다.")).toBeInTheDocument();
  expect(screen.queryByText(/76/)).not.toBeInTheDocument();
});
