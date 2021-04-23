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

const fetch = require('node-fetch');
const jwt = require('jsonwebtoken');
const FormData = require('form-data');

const MISSING_PARAMS = 'missing_params';
const SIGN_FAILED = 'sign_failed';
const REQUEST_FAILED = 'request_failed';
const UNEXPECTED_RESPONSE_BODY = 'invalid_response_body';

const throwRequestFailedError = details => {
  const error = new Error(
    `Request failed while swapping the jwt token. ${details}`
  );
  error.code = REQUEST_FAILED;
  throw error;
};

const throwUnexpectedResponseError = details => {
  const error = new Error(
    `Unexpected response received while swapping the jwt token. ${details}`
  );
  error.code = UNEXPECTED_RESPONSE_BODY;
  throw error;
};

async function authorize(options) {
  let {
    clientId,
    technicalAccountId,
    orgId,
    clientSecret,
    privateKey,
    passphrase = '',
    metaScopes,
    ims = 'https://ims-na1.adobelogin.com'
  } = options;

  const errors = [];
  !clientId ? errors.push('clientId') : '';
  !technicalAccountId ? errors.push('technicalAccountId') : '';
  !orgId ? errors.push('orgId') : '';
  !clientSecret ? errors.push('clientSecret') : '';
  !privateKey ? errors.push('privateKey') : '';
  !metaScopes || metaScopes.length === 0 ? errors.push('metaScopes') : '';
  if (errors.length > 0) {
    const missingParamsError = new Error(
      `Required parameter(s) ${errors.join(', ')} are missing`
    );
    missingParamsError.code = MISSING_PARAMS;
    throw missingParamsError;
  }

  if (metaScopes.constructor !== Array) {
    metaScopes = metaScopes.split(',');
  }

  const jwtPayload = {
    exp: Math.round(300 + Date.now() / 1000),
    iss: orgId,
    sub: technicalAccountId,
    aud: `${ims}/c/${clientId}`
  };

  for (let i = 0; i < metaScopes.length; i++) {
    if (metaScopes[i].indexOf('https') > -1) {
      jwtPayload[metaScopes[i]] = true;
    } else {
      jwtPayload[`${ims}/s/${metaScopes[i]}`] = true;
    }
  }

  let token;
  try {
    token = jwt.sign(
      jwtPayload,
      { key: privateKey, passphrase },
      { algorithm: 'RS256' }
    );
  } catch (tokenError) {
    tokenError.code = SIGN_FAILED;
    throw tokenError;
  }

  const form = new FormData();
  form.append('client_id', clientId);
  form.append('client_secret', clientSecret);
  form.append('jwt_token', token);

  const postOptions = {
    method: 'POST',
    body: form,
    headers: form.getHeaders()
  };

  return fetch(`${ims}/ims/exchange/jwt/`, postOptions)
    .catch(e => throwRequestFailedError(e.message))
    .then(res => {
      return res.json().then(data => {
        return {
          ok: res.ok,
          json: data
        };
      });
    })
    .then(({ ok, json }) => {
      const { access_token, error, error_description } = json;
      if (ok && access_token) {
        return json;
      }

      if (error && error_description) {
        const swapError = new Error(error_description);
        swapError.code = error;
        throw swapError;
      } else {
        throwUnexpectedResponseError(
          `The response body is as follows: ${JSON.stringify(json)}`
        );
      }
    });
}

module.exports = authorize;
