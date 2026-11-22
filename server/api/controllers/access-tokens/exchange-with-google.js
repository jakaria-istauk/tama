/*!
 * Copyright (c) 2024 PLANKA Software GmbH
 * Licensed under the Fair Use License: https://github.com/plankanban/planka/blob/master/LICENSE.md
 */

/**
 * @swagger
 * /access-tokens/exchange-with-google:
 *   post:
 *     summary: Exchange Google code for access token
 *     description: Exchanges a Google authorization code for an access token. Signs in the user with the matching verified email, or creates a board user when sign-up is enabled.
 *     tags:
 *       - Access Tokens
 *     operationId: exchangeWithGoogle
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *               - nonce
 *             properties:
 *               code:
 *                 type: string
 *                 maxLength: 2048
 *                 description: Authorization code returned by Google
 *                 example: 4/0AbCdEf...
 *               nonce:
 *                 type: string
 *                 maxLength: 1024
 *                 description: Nonce sent with the authorization request
 *                 example: V1StGXR8_Z5jdHi6B-myT
 *               withHttpOnlyToken:
 *                 type: boolean
 *                 description: Whether to include an HTTP-only authentication cookie
 *                 example: true
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               required:
 *                 - item
 *               properties:
 *                 item:
 *                   type: string
 *                   description: Access token for API authentication
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ4...
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         description: Invalid code or nonce, or deactivated user
 *       403:
 *         description: Sign-up disabled, or another authentication restriction
 *       409:
 *         description: Rate limit exceeded or active users limit reached
 *       500:
 *         description: Google sign-in is not configured correctly
 *     security: []
 */

const { getRemoteAddress } = require('../../../utils/remote-address');

const Errors = {
  INVALID_GOOGLE_CONFIGURATION: {
    invalidGoogleConfiguration: 'Invalid Google configuration',
  },
  INVALID_CODE_OR_NONCE: {
    invalidCodeOrNonce: 'Invalid code or nonce',
  },
  USER_DEACTIVATED: {
    userDeactivated: 'User is deactivated',
  },
  SIGN_UP_DISABLED: {
    signUpDisabled: 'Sign up disabled',
  },
  ACTIVE_USERS_LIMIT_REACHED: {
    activeUsersLimitReached: 'Active users limit reached',
  },
  RATE_LIMIT_EXCEEDED: {
    rateLimitExceeded: 'Rate limit exceeded',
  },
};

module.exports = {
  inputs: {
    code: {
      type: 'string',
      maxLength: 2048,
      required: true,
    },
    nonce: {
      type: 'string',
      maxLength: 1024,
      required: true,
    },
    withHttpOnlyToken: {
      type: 'boolean',
    },
  },

  exits: {
    invalidGoogleConfiguration: {
      responseType: 'serverError',
    },
    invalidCodeOrNonce: {
      responseType: 'unauthorized',
    },
    userDeactivated: {
      responseType: 'unauthorized',
    },
    signUpDisabled: {
      responseType: 'forbidden',
    },
    activeUsersLimitReached: {
      responseType: 'conflict',
    },
    rateLimitExceeded: {
      responseType: 'conflict',
    },
    termsAcceptanceRequired: {
      responseType: 'forbidden',
    },
    totpVerificationRequired: {
      responseType: 'forbidden',
    },
    adminLoginRequiredToInitializeInstance: {
      responseType: 'forbidden',
    },
  },

  async fn(inputs) {
    const remoteAddress = getRemoteAddress(this.req);

    const { isExceeded } = sails.helpers.utils.checkRateLimit.with({
      key: `auth:ip:${remoteAddress}`,
      windowSeconds: sails.config.custom.authRateLimitWindow,
      max: sails.config.custom.authRateLimitMaxPerIp,
    });

    if (isExceeded) {
      sails.log.warn(`Google login rate limit hit (IP: ${remoteAddress})`);
      throw Errors.RATE_LIMIT_EXCEEDED;
    }

    const user = await sails.helpers.users.getOrCreateOneWithGoogle
      .with({
        code: inputs.code,
        nonce: inputs.nonce,
        request: this.req,
      })
      .intercept('invalidGoogleConfiguration', () => Errors.INVALID_GOOGLE_CONFIGURATION)
      .intercept('invalidCodeOrNonce', () => {
        sails.log.warn(`Invalid Google code or nonce! (IP: ${remoteAddress})`);
        return Errors.INVALID_CODE_OR_NONCE;
      })
      .intercept('userDeactivated', () => Errors.USER_DEACTIVATED)
      .intercept('signUpDisabled', () => Errors.SIGN_UP_DISABLED)
      .intercept('activeLimitReached', () => Errors.ACTIVE_USERS_LIMIT_REACHED);

    return sails.helpers.accessTokens.handleSteps
      .with({
        user,
        remoteAddress,
        request: this.req,
        response: this.res,
        withHttpOnlyToken: inputs.withHttpOnlyToken,
      })
      .intercept('adminLoginRequiredToInitializeInstance', (error) => ({
        adminLoginRequiredToInitializeInstance: error.raw,
      }))
      .intercept('termsAcceptanceRequired', (error) => ({
        termsAcceptanceRequired: error.raw,
      }))
      .intercept('totpVerificationRequired', (error) => ({
        totpVerificationRequired: error.raw,
      }));
  },
};
