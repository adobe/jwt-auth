/*
Copyright 2019 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/

// MOCKS ////////////////////////////////////////////

const mockAccessToken = 'asdasdasd';

let jwt = require('jsonwebtoken');
let jwtActual = require.requireActual('jsonwebtoken');
jest.mock('jsonwebtoken', () => jest.fn());

let mockResultSuccess = Promise.resolve({
  ok: true,
  json: () =>
    Promise.resolve({ access_token: mockAccessToken, expires_in: 123456 })
});
// attempting to contact the API threw an error
let mockEndpointFailure = Promise.reject(new Error('500 error from server.'));
// simple API failure, likely a customer issue
let mockResultFailure = Promise.resolve({
  ok: false,
  status: 400,
  json: () =>
    Promise.resolve({
      error: 'my_error_code',
      error_description: 'This is the error description. Customer issue.'
    })
});
// no access token, error, or error_description
let mockResultFailureMalformedServerResponse = Promise.resolve({
  ok: true,
  status: 200,
  json: () => Promise.resolve({ foo: 'bar', baz: 'faz' })
});
// good API call, but got an error with no access token
let mockResultFailureNoJWT = Promise.resolve({
  ok: true,
  status: 200,
  json: () =>
    Promise.resolve({
      error: 'my_error_code_no_jwt',
      error_description: 'This is the error description. No JWT present.'
    })
});

let fetch = require('node-fetch');
jest.mock('node-fetch', () => jest.fn());

// ////////////////////////////////////////////

const auth = require('../index');

const clientId = 'xxxxxxxxxxxxxxxxxxxxxx';
const clientSecret = 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx';
const technicalAccountId = 'xxxxxxxxxxxxxxxxxxxxxx@techacct.adobe.com';
const orgId = 'xxxxxxxxxxxxxxxxxxxxxx@AdobeOrg';
const metaScopes = ['ent_dataservices_sdk'];
const privateKey = 'aalsdjfajsldjfalsjkdfa;lsjf;aljs';

describe('Validate input', () => {
  test('all parameters missing', () => {
    expect.assertions(1);
    return expect(auth({})).rejects.toThrow(
      'Required parameter(s) clientId, technicalAccountId, orgId, clientSecret, privateKey, metaScopes are missing'
    );
  });
  test('missing clientId', () => {
    expect.assertions(1);
    return expect(
      auth({ clientSecret, technicalAccountId, orgId, metaScopes, privateKey })
    ).rejects.toThrow('Required parameter(s) clientId are missing');
  });
  test('missing clientSecret', () => {
    expect.assertions(1);
    return expect(
      auth({ clientId, technicalAccountId, orgId, metaScopes, privateKey })
    ).rejects.toThrow('Required parameter(s) clientSecret are missing');
  });
  test('missing technicalAccountId', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        orgId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrow('Required parameter(s) technicalAccountId are missing');
  });
  test('missing orgId', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrow('Required parameter(s) orgId are missing');
  });
  test('missing metaScopes', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        privateKey
      })
    ).rejects.toThrow('Required parameter(s) metaScopes are missing');
  });
  test('missing privateKey', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes
      })
    ).rejects.toThrow('Required parameter(s) privateKey are missing');
  });
});

describe('Sign with invalid primary key', () => {
  beforeEach(() => {
    jwt.sign = jest.fn().mockImplementation((...args) => {
      // call actual jwt module, not mocked version
      return jwtActual.sign(...args);
    });
  });

  afterEach(() => {
    jwt.sign.mockClear();
  });

  test('invalid primary key', () => {
    expect.assertions(1);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrowError(/no start line/);
  });
});

describe('Fetch jwt', () => {
  beforeEach(() => {
    jwt.sign = jest.fn().mockImplementation(() => {
      return 'my_jwt_token';
    });
  });

  afterEach(() => {
    jwt.sign.mockClear();
  });

  test('valid jwt', () => {
    fetch.mockImplementation(() => mockResultSuccess);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).resolves.toEqual({ access_token: mockAccessToken, expires_in: 123456 });
  });

  test('valid jwt, qualified scopes', () => {
    fetch.mockImplementation(() => mockResultSuccess);
    const metaScopes = [
      'https://ims-na1.adobelogin.com/s/ent_dataservices_sdk'
    ];
    jwt.sign = jest.fn().mockImplementation(payload => {
      expect(payload[metaScopes[0]]).toBe(true);
      return 'my_jwt_token';
    });

    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).resolves.toEqual({ access_token: mockAccessToken, expires_in: 123456 });
  });

  test('valid jwt, unqualified scopes', () => {
    fetch.mockImplementation(() => mockResultSuccess);
    const metaScopes = 'ent_dataservices_sdk,some_other_scope';
    jwt.sign = jest.fn().mockImplementation(payload => {
      expect(
        payload['https://ims-na1.adobelogin.com/s/ent_dataservices_sdk']
      ).toBe(true);
      expect(payload['https://ims-na1.adobelogin.com/s/some_other_scope']).toBe(
        true
      );
      return 'my_jwt_token';
    });
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).resolves.toEqual({ access_token: mockAccessToken, expires_in: 123456 });
  });

  test('endpoint error thrown, unknown reason', async () => {
    expect.assertions(2);
    fetch.mockImplementation(() => mockEndpointFailure);
    try {
      await auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      });
    } catch (e) {
      expect(e.message).toBe(
        'Request failed while swapping the jwt token. 500 error from server.'
      );
      expect(e.code).toBe('request_failed');
    }
  });

  test('invalid jwt, expected endpoint error', async () => {
    expect.assertions(1);
    fetch.mockImplementation(() => mockResultFailure);
    return expect(
      auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      })
    ).rejects.toThrow('This is the error description. Customer issue.');
  });

  test('malformed server response, dump entire json() call', async () => {
    expect.assertions(2);
    fetch.mockImplementation(() => mockResultFailureMalformedServerResponse);
    try {
      await auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      });
    } catch (e) {
      expect(e.message).toBe(
        'Unexpected response received while swapping the jwt token. The response body is as follows: {"foo":"bar","baz":"faz"}'
      );
      expect(e.code).toBe('invalid_response_body');
    }
  });

  test('no access token returned from IMS, valid server response', async () => {
    expect.assertions(2);
    fetch.mockImplementation(() => mockResultFailureNoJWT);
    try {
      await auth({
        clientId,
        clientSecret,
        technicalAccountId,
        orgId,
        metaScopes,
        privateKey
      });
    } catch (e) {
      expect(e.message).toBe('This is the error description. No JWT present.');
      expect(e.code).toBe('my_error_code_no_jwt');
    }
  });
});
