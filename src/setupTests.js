// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { Request, Response, Headers } from 'cross-fetch';
global.Request = Request;
global.Response = Response;
global.Headers = Headers;

jest.setTimeout(15000);
